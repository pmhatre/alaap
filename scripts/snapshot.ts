/**
 * Graph snapshot: export the whole Neo4j graph to a gzipped JSONL file, or
 * restore such a file into an instance.
 *
 * Why: Aura Free deletes paused instances. The Python pipeline can rebuild the
 * bulk of the graph from staging, but dedup results, enrichment, and manual
 * curation exist only in the database. A snapshot captures all of it in one
 * file that can be kept in a private repo and restored in minutes.
 *
 * Usage:
 *   pnpm data:snapshot                              # → db/snapshots/alaap-YYYY-MM-DD.jsonl.gz
 *   pnpm data:snapshot -- --out ../alaap-data/x.jsonl.gz
 *   pnpm data:restore -- <file.jsonl.gz>            # dry run: report what would be written
 *   pnpm data:restore -- <file.jsonl.gz> --execute  # apply (run db/constraints.cypher first)
 *
 * Format, one JSON object per line:
 *   {"t":"meta","version":1,"exportedAt":"..."}
 *   {"t":"n","labels":["Song"],"key":"<slug>","props":{...}}
 *   {"t":"r","type":"SUNG_BY","from":{"labels":["Song"],"key":"..."},"to":{"labels":["Artist"],"key":"..."},"props":{...}}
 *
 * Node identity is the uniqueness key from db/constraints.cypher (slug for
 * Song/Raga/Artist/Film/Journey, name for Thaat/Taal/Alankar). Restore uses
 * MERGE on that key, so it is idempotent and safe to re-run. Nodes without a
 * known key label are skipped with a warning.
 *
 * Type note: JSON cannot distinguish integer from float. On restore, numbers
 * with no fractional part are written as Neo4j integers, which matches how the
 * pipeline stores year, geetmala_rank, etc. The graph has no float properties.
 */

import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip, createGzip } from "node:zlib";
import neo4j from "neo4j-driver";
import { closeDriver, getSession } from "../lib/neo4j";

const KEY_BY_LABEL: Record<string, string> = {
  Song: "slug",
  Raga: "slug",
  Artist: "slug",
  Film: "slug",
  Journey: "slug",
  Thaat: "name",
  Taal: "name",
  Alankar: "name",
};
const SKIP_LABELS = new Set(["Keepalive"]);
const BATCH_SIZE = 500;
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

type NodeLine = { t: "n"; labels: string[]; key: unknown; props: Record<string, unknown> };
type Endpoint = { labels: string[]; key: unknown };
type RelLine = { t: "r"; type: string; from: Endpoint; to: Endpoint; props: Record<string, unknown> };

function keyLabel(labels: string[]): string | undefined {
  return labels.find((l) => KEY_BY_LABEL[l] !== undefined);
}

/** Cypher expression yielding the identity key of node `alias`. */
function keyExpr(alias: string): string {
  const whens = Object.entries(KEY_BY_LABEL)
    .map(([label, prop]) => `WHEN '${label}' IN labels(${alias}) THEN ${alias}.${prop}`)
    .join(" ");
  return `CASE ${whens} ELSE null END`;
}

/** Convert driver types (Integer, temporal) into JSON-safe values. */
function plain(v: unknown): unknown {
  if (v == null) return v;
  if (neo4j.isInt(v)) return v.toNumber();
  if (Array.isArray(v)) return v.map(plain);
  if (
    neo4j.isDate(v) ||
    neo4j.isDateTime(v) ||
    neo4j.isLocalDateTime(v) ||
    neo4j.isTime(v) ||
    neo4j.isLocalTime(v) ||
    neo4j.isDuration(v)
  ) {
    return v.toString();
  }
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = plain(x);
    return out;
  }
  return v;
}

/** Inverse of plain() for the cases that matter: integer-valued numbers → Neo4j Integer. */
function toDriverValue(v: unknown): unknown {
  if (typeof v === "number" && Number.isInteger(v)) return neo4j.int(v);
  if (Array.isArray(v)) return v.map(toDriverValue);
  return v;
}

function driverProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) out[k] = toDriverValue(v);
  return out;
}

function assertIdent(name: string, kind: string) {
  if (!IDENT.test(name)) throw new Error(`Unsafe ${kind} in snapshot: ${JSON.stringify(name)}`);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

async function exportGraph(outPath: string) {
  mkdirSync(dirname(outPath), { recursive: true });
  const gzip = createGzip({ level: 9 });
  const file = createWriteStream(outPath);
  gzip.pipe(file);
  gzip.on("error", (e) => {
    console.error("gzip error:", e);
    process.exit(1);
  });
  file.on("error", (e) => {
    console.error("write error:", e);
    process.exit(1);
  });

  async function writeLine(obj: unknown) {
    if (!gzip.write(JSON.stringify(obj) + "\n")) {
      await new Promise<void>((resolve) => gzip.once("drain", resolve));
    }
  }

  let nodes = 0;
  let rels = 0;
  let skippedNodes = 0;
  let skippedRels = 0;
  const labelCounts: Record<string, number> = {};
  const relCounts: Record<string, number> = {};

  const session = getSession(neo4j.session.READ);
  try {
    await writeLine({ t: "meta", version: 1, exportedAt: new Date().toISOString() });

    const nodeResult = session.run("MATCH (n) RETURN labels(n) AS labels, properties(n) AS props");
    for await (const record of nodeResult) {
      const labels = record.get("labels") as string[];
      if (labels.some((l) => SKIP_LABELS.has(l))) {
        skippedNodes++;
        continue;
      }
      const kl = keyLabel(labels);
      const props = plain(record.get("props")) as Record<string, unknown>;
      const key = kl ? props[KEY_BY_LABEL[kl]] : undefined;
      if (!kl || key == null) {
        skippedNodes++;
        console.warn(`  skip node without identity key: (${labels.join(":")}) ${JSON.stringify(props).slice(0, 80)}`);
        continue;
      }
      const line: NodeLine = { t: "n", labels, key, props };
      await writeLine(line);
      nodes++;
      for (const l of labels) labelCounts[l] = (labelCounts[l] ?? 0) + 1;
    }

    const relResult = session.run(
      `MATCH (a)-[r]->(b)
       RETURN type(r) AS type, properties(r) AS props,
              labels(a) AS fromLabels, ${keyExpr("a")} AS fromKey,
              labels(b) AS toLabels,   ${keyExpr("b")} AS toKey`,
    );
    for await (const record of relResult) {
      const fromLabels = record.get("fromLabels") as string[];
      const toLabels = record.get("toLabels") as string[];
      const fromKey = plain(record.get("fromKey"));
      const toKey = plain(record.get("toKey"));
      if (fromKey == null || toKey == null || [...fromLabels, ...toLabels].some((l) => SKIP_LABELS.has(l))) {
        skippedRels++;
        continue;
      }
      const type = record.get("type") as string;
      const line: RelLine = {
        t: "r",
        type,
        from: { labels: fromLabels, key: fromKey },
        to: { labels: toLabels, key: toKey },
        props: plain(record.get("props")) as Record<string, unknown>,
      };
      await writeLine(line);
      rels++;
      relCounts[type] = (relCounts[type] ?? 0) + 1;
    }
  } finally {
    await session.close();
  }

  await new Promise<void>((resolve, reject) => {
    file.on("finish", resolve);
    file.on("error", reject);
    gzip.end();
  });

  console.log(`\nSnapshot written: ${outPath}`);
  console.log(`  nodes: ${nodes} (skipped ${skippedNodes})`);
  for (const [l, c] of Object.entries(labelCounts).sort((a, b) => b[1] - a[1])) console.log(`    ${l}: ${c}`);
  console.log(`  relationships: ${rels} (skipped ${skippedRels})`);
  for (const [t, c] of Object.entries(relCounts).sort((a, b) => b[1] - a[1])) console.log(`    ${t}: ${c}`);
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

type Counters = { nodesCreated: number; relationshipsCreated: number; propertiesSet: number; labelsAdded: number };

async function runBatch(cypher: string, rows: unknown[], counters: Counters) {
  const session = getSession(neo4j.session.WRITE);
  try {
    const result = await session.run(cypher, { rows });
    const c = result.summary.counters.updates();
    counters.nodesCreated += c.nodesCreated;
    counters.relationshipsCreated += c.relationshipsCreated;
    counters.propertiesSet += c.propertiesSet;
    counters.labelsAdded += c.labelsAdded;
  } finally {
    await session.close();
  }
}

function nodeCypher(labels: string[]): string {
  const kl = keyLabel(labels)!;
  for (const l of labels) assertIdent(l, "label");
  const extra = labels.filter((l) => l !== kl);
  return [
    "UNWIND $rows AS row",
    `MERGE (n:\`${kl}\` {${KEY_BY_LABEL[kl]}: row.key})`,
    "SET n += row.props",
    ...(extra.length ? [`SET n${extra.map((l) => `:\`${l}\``).join("")}`] : []),
  ].join("\n");
}

function relCypher(type: string, fromLabel: string, toLabel: string): string {
  assertIdent(type, "relationship type");
  return [
    "UNWIND $rows AS row",
    `MATCH (a:\`${fromLabel}\` {${KEY_BY_LABEL[fromLabel]}: row.from})`,
    `MATCH (b:\`${toLabel}\` {${KEY_BY_LABEL[toLabel]}: row.to})`,
    `MERGE (a)-[r:\`${type}\`]->(b)`,
    "SET r += row.props",
  ].join("\n");
}

async function restoreGraph(inPath: string, execute: boolean) {
  const rl = createInterface({ input: createReadStream(inPath).pipe(createGunzip()), crlfDelay: Infinity });

  const nodeBuffers = new Map<string, { labels: string[]; rows: { key: unknown; props: Record<string, unknown> }[] }>();
  const relBuffers = new Map<string, { type: string; fromLabel: string; toLabel: string; rows: { from: unknown; to: unknown; props: Record<string, unknown> }[] }>();
  const planned: Record<string, number> = {};
  const counters: Counters = { nodesCreated: 0, relationshipsCreated: 0, propertiesSet: 0, labelsAdded: 0 };
  let nodeLines = 0;
  let relLines = 0;
  let skipped = 0;
  let nodesFlushed = false;

  async function flushNodes() {
    for (const [, buf] of nodeBuffers) {
      if (buf.rows.length === 0) continue;
      if (execute) await runBatch(nodeCypher(buf.labels), buf.rows, counters);
      buf.rows = [];
    }
  }
  async function flushRels() {
    for (const [, buf] of relBuffers) {
      if (buf.rows.length === 0) continue;
      if (execute) await runBatch(relCypher(buf.type, buf.fromLabel, buf.toLabel), buf.rows, counters);
      buf.rows = [];
    }
  }

  for await (const line of rl) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line) as { t: string; [k: string]: unknown };

    if (obj.t === "meta") {
      console.log(`Snapshot meta: ${JSON.stringify(obj)}`);
      continue;
    }

    if (obj.t === "n") {
      const { labels, key, props } = obj as unknown as NodeLine;
      if (labels.some((l) => SKIP_LABELS.has(l)) || !keyLabel(labels)) {
        skipped++;
        continue;
      }
      const groupKey = [...labels].sort().join(":");
      let buf = nodeBuffers.get(groupKey);
      if (!buf) {
        buf = { labels: [...labels].sort(), rows: [] };
        nodeBuffers.set(groupKey, buf);
      }
      buf.rows.push({ key: toDriverValue(key), props: driverProps(props) });
      planned[`node ${groupKey}`] = (planned[`node ${groupKey}`] ?? 0) + 1;
      nodeLines++;
      if (buf.rows.length >= BATCH_SIZE) {
        if (execute) await runBatch(nodeCypher(buf.labels), buf.rows, counters);
        buf.rows = [];
        if (nodeLines % 5000 === 0) console.log(`  nodes processed: ${nodeLines}`);
      }
      continue;
    }

    if (obj.t === "r") {
      if (!nodesFlushed) {
        await flushNodes();
        nodesFlushed = true;
        console.log(`  nodes processed: ${nodeLines}`);
      }
      const { type, from, to, props } = obj as unknown as RelLine;
      const fromLabel = keyLabel(from.labels);
      const toLabel = keyLabel(to.labels);
      if (!fromLabel || !toLabel || [...from.labels, ...to.labels].some((l) => SKIP_LABELS.has(l))) {
        skipped++;
        continue;
      }
      const groupKey = `${type}|${fromLabel}|${toLabel}`;
      let buf = relBuffers.get(groupKey);
      if (!buf) {
        buf = { type, fromLabel, toLabel, rows: [] };
        relBuffers.set(groupKey, buf);
      }
      buf.rows.push({ from: toDriverValue(from.key), to: toDriverValue(to.key), props: driverProps(props) });
      planned[`rel ${groupKey}`] = (planned[`rel ${groupKey}`] ?? 0) + 1;
      relLines++;
      if (buf.rows.length >= BATCH_SIZE) {
        if (execute) await runBatch(relCypher(type, fromLabel, toLabel), buf.rows, counters);
        buf.rows = [];
        if (relLines % 10000 === 0) console.log(`  relationships processed: ${relLines}`);
      }
    }
  }

  if (!nodesFlushed) await flushNodes();
  await flushRels();

  console.log(`\n${execute ? "Restored" : "Would restore"} from ${inPath}`);
  console.log(`  node lines: ${nodeLines}, relationship lines: ${relLines}, skipped: ${skipped}`);
  for (const [k, v] of Object.entries(planned).sort((a, b) => b[1] - a[1])) console.log(`    ${k}: ${v}`);
  if (execute) {
    console.log(`  counters: ${JSON.stringify(counters)}`);
  } else {
    console.log(`\nDry run. Re-run with --execute to apply.`);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  const execute = rest.includes("--execute");
  const positional = rest.filter((a) => !a.startsWith("--"));

  if (mode === "export") {
    const outIdx = rest.indexOf("--out");
    const date = new Date().toISOString().slice(0, 10);
    const outPath = outIdx !== -1 ? rest[outIdx + 1] : join("db", "snapshots", `alaap-${date}.jsonl.gz`);
    await exportGraph(outPath);
  } else if (mode === "restore") {
    const inPath = positional[0];
    if (!inPath) {
      console.error("usage: tsx scripts/snapshot.ts restore <file.jsonl.gz> [--execute]");
      process.exit(1);
    }
    await restoreGraph(inPath, execute);
  } else {
    console.error("usage: tsx scripts/snapshot.ts export [--out path] | restore <file.jsonl.gz> [--execute]");
    process.exit(1);
  }
  await closeDriver();
}

main().catch(async (err) => {
  console.error(err);
  await closeDriver();
  process.exit(1);
});
