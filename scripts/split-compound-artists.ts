/**
 * Split compound singer artists.
 *
 * Bollywood Lyrics joins duet singers with a space and no delimiter, so the
 * pipeline loads "Kumar Sanu Alka Yagnik" or "Rafi Lata" as a single Artist.
 * This script finds such nodes, re-points their song relationships to the
 * individual singers, and deletes the compound node. It also folds first-name
 * shorthand ("Kishore", "Rafi Asha") onto canonical singers via a small alias
 * table, and drops filler tokens such as "Chorus".
 *
 * Usage:
 *   pnpm data:split-artists                # dry run: report only
 *   pnpm data:split-artists -- --execute   # apply
 *
 * How a name is split: its tokens are matched against a dictionary of known
 * individual singers (graph artists with >= MIN_SONGS singing credits whose own
 * names do not themselves split) plus ALIASES. A node changes only when every
 * token is consumed and the result is either two or more singers, or one singer
 * plus dropped filler. Everything else is left alone and the likely-compound
 * leftovers are listed for review.
 *
 * Idempotent: a second run finds nothing to do. Run after the loader and dedup
 * on every rebuild, before db/curation.cypher.
 */

import neo4j from "neo4j-driver";
import { closeDriver, getSession, read } from "../lib/neo4j";
import { toNumber } from "../lib/data/utils";

const MIN_SONGS = 3;
const MAX_SPAN = 4;
const BATCH_SIZE = 50;
const IGNORE = new Set([
  "chorus", "others", "group", "and", "amp", "with", "feat", "ft",
  "various", "female", "male", "voice", "unknown", "traditional", "singer", "singers",
]);

/**
 * Real individuals whose names happen to segment into other singers' names.
 * Never split, and never removed from the dictionary.
 */
const PROTECTED = new Set([
  "nitin mukesh", "talat aziz", "kumar sanu", "amit kumar", "manna dey", "mohammed aziz",
  "hemant kumar", "kishore kumar", "shabbir kumar", "mahendra kapoor", "suman kalyanpur",
  "usha mangeshkar", "sonu nigam", "udit narayan", "alka yagnik", "anuradha paudwal",
  "sadhana sargam", "kavita krishnamurthy", "shreya ghoshal", "sunidhi chauhan",
  "hans raj hans", "bade ghulam ali khan", "ghulam ali", "mehdi hasan", "jagjit singh", "chitra singh",
  "manhar udhas", "pankaj udhas", "aditya narayan", "sapna mukherjee", "nitin mukesh",
]);

type Target = { slug: string; name: string };

/** First-name and spelling shorthand → canonical singer. Keys are normalized (see tokens()). */
const ALIASES: Record<string, Target> = {
  lata: { slug: "lata-mangeshkar", name: "Lata Mangeshkar" },
  rafi: { slug: "mohammed-rafi", name: "Mohammed Rafi" },
  "mohd rafi": { slug: "mohammed-rafi", name: "Mohammed Rafi" },
  "mohammad rafi": { slug: "mohammed-rafi", name: "Mohammed Rafi" },
  asha: { slug: "asha-bhosle", name: "Asha Bhosle" },
  kishore: { slug: "kishore-kumar", name: "Kishore Kumar" },
  kishor: { slug: "kishore-kumar", name: "Kishore Kumar" },
  manna: { slug: "manna-dey", name: "Manna Dey" },
  "manna de": { slug: "manna-dey", name: "Manna Dey" },
  talat: { slug: "talat-mahmood", name: "Talat Mahmood" },
  hemant: { slug: "hemant-kumar", name: "Hemant Kumar" },
  geeta: { slug: "geeta-dutt", name: "Geeta Dutt" },
  shamshad: { slug: "shamshad-begum", name: "Shamshad Begum" },
  mahendra: { slug: "mahendra-kapoor", name: "Mahendra Kapoor" },
  suman: { slug: "suman-kalyanpur", name: "Suman Kalyanpur" },
  mubarak: { slug: "mubarak-begum", name: "Mubarak Begum" },
  usha: { slug: "usha-mangeshkar", name: "Usha Mangeshkar" },
  anuradha: { slug: "anuradha-paudwal", name: "Anuradha Paudwal" },
  alka: { slug: "alka-yagnik", name: "Alka Yagnik" },
  udit: { slug: "udit-narayan", name: "Udit Narayan" },
  sonu: { slug: "sonu-nigam", name: "Sonu Nigam" },
  abhijeet: { slug: "abhijit", name: "Abhijit" },
  sanu: { slug: "kumar-sanu", name: "Kumar Sanu" },
  amit: { slug: "amit-kumar", name: "Amit Kumar" },
  shabbir: { slug: "shabbir-kumar", name: "Shabbir Kumar" },
  "bhupinder singh": { slug: "bhupinder", name: "Bhupinder" },
  "bhupinder singh musician": { slug: "bhupinder", name: "Bhupinder" },
  "s p balasubramaniam": { slug: "s-p-balasubrahmanyam", name: "S. P. Balasubrahmanyam" },
  spb: { slug: "s-p-balasubrahmanyam", name: "S. P. Balasubrahmanyam" },
  kavita: { slug: "kavita-krishnamurthy", name: "Kavita Krishnamurthy" },
  "kavita subramaniam": { slug: "kavita-krishnamurthy", name: "Kavita Krishnamurthy" },
  "kavita krishnamurti": { slug: "kavita-krishnamurthy", name: "Kavita Krishnamurthy" },
  sadhana: { slug: "sadhana-sargam", name: "Sadhana Sargam" },
  shreya: { slug: "shreya-ghoshal", name: "Shreya Ghoshal" },
  sunidhi: { slug: "sunidhi-chauhan", name: "Sunidhi Chauhan" },
  yesudas: { slug: "k-j-yesudas", name: "K. J. Yesudas" },
  "hariharan singer": { slug: "hariharan", name: "Hariharan" },
  "ghantasala musician": { slug: "ghantasala", name: "Ghantasala" },
  // Spelling variants and singers the dictionary lacks (surfaced by the unresolved list).
  "suresh wadekar": { slug: "suresh-wadkar", name: "Suresh Wadkar" },
  "asha bhonsle": { slug: "asha-bhosle", name: "Asha Bhosle" },
  "geeta dutta": { slug: "geeta-dutt", name: "Geeta Dutt" },
  "khursheed bano": { slug: "khursheed", name: "Khursheed" },
  "surendra actor": { slug: "surendra", name: "Surendra" },
  "a hariharan": { slug: "hariharan", name: "Hariharan" },
  kaykay: { slug: "kk", name: "KK" },
  "jaspindar narula": { slug: "jaspinder-narula", name: "Jaspinder Narula" },
  "japindar narula": { slug: "jaspinder-narula", name: "Jaspinder Narula" },
  "jaspinder narula": { slug: "jaspinder-narula", name: "Jaspinder Narula" },
  "hans raj hans": { slug: "hans-raj-hans", name: "Hans Raj Hans" },
  "vipin sachdeva": { slug: "vipin-sachdeva", name: "Vipin Sachdeva" },
  "hema sardesai": { slug: "hema-sardesai", name: "Hema Sardesai" },
  "aditya narayan": { slug: "aditya-narayan", name: "Aditya Narayan" },
  "sapana mukherji": { slug: "sapna-mukherjee", name: "Sapna Mukherjee" },
  "manhar udhas": { slug: "manhar-udhas", name: "Manhar Udhas" },
  "vijay benedict": { slug: "vijay-benedict", name: "Vijay Benedict" },
  "annu malik": { slug: "annu-malik", name: "Annu Malik" },
  "ashok kumar": { slug: "ashok-kumar", name: "Ashok Kumar" },
  "devika rani": { slug: "devika-rani", name: "Devika Rani" },
  "sultan khan": { slug: "sultan-khan", name: "Sultan Khan" },
  "ustad sultan khan": { slug: "sultan-khan", name: "Sultan Khan" },
  "nitin mukesh": { slug: "nitin-mukesh", name: "Nitin Mukesh" },
  "manhar udhaas": { slug: "manhar-udhas", name: "Manhar Udhas" },
  "sukhvindar singh": { slug: "sukhwinder-singh", name: "Sukhwinder Singh" },
  "sudesh bhonsale": { slug: "sudesh-bhosle", name: "Sudesh Bhosle" },
  "anupama deshpande": { slug: "anupama-deshpande", name: "Anupama Deshpande" },
  "phalguni pathak": { slug: "phalguni-pathak", name: "Phalguni Pathak" },
  "shankar mahadevan": { slug: "shankar-mahadevan", name: "Shankar Mahadevan" },
  mahalaxmi: { slug: "mahalakshmi-iyer", name: "Mahalakshmi Iyer" },
  "usha khanna": { slug: "usha-khanna", name: "Usha Khanna" },
  "m m kreem": { slug: "m-m-kreem", name: "M. M. Kreem" },
};

type ArtistRow = { slug: string; name: string; rels: number; sung: number };
type Part = { kind: "singer"; target: Target } | { kind: "drop"; token: string };
type Plan = { artist: ArtistRow; parts: Target[]; via: "alias" | "split" };

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[.\-–—_/]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}
const keyOf = (name: string) => tokens(name).join(" ");

async function loadArtists(): Promise<ArtistRow[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (a:Artist)
     OPTIONAL MATCH (a)<-[r]-(:Song)
     RETURN a.slug AS slug, a.name AS name, count(r) AS rels,
            sum(CASE type(r) WHEN 'SUNG_BY' THEN 1 ELSE 0 END) AS sung`,
  );
  return rows.map((r) => ({
    slug: r.slug as string,
    name: (r.name as string) ?? "",
    rels: toNumber(r.rels) ?? 0,
    sung: toNumber(r.sung) ?? 0,
  }));
}

/**
 * Fewest-parts segmentation of `toks` into dictionary/alias spans and filler.
 * Returns null when the tokens cannot be fully consumed.
 */
function segment(toks: string[], dict: Map<string, Target>, excludeKey: string, excludeSlug: string): Part[] | null {
  const n = toks.length;
  const best: (Part[] | null)[] = Array(n + 1).fill(null);
  best[0] = [];
  for (let i = 0; i < n; i++) {
    const prefix = best[i];
    if (!prefix) continue;
    for (let j = i + 1; j <= Math.min(n, i + MAX_SPAN); j++) {
      const span = toks.slice(i, j).join(" ");
      let part: Part | null = null;
      if (j === i + 1 && IGNORE.has(span)) {
        part = { kind: "drop", token: span };
      } else if (span !== excludeKey) {
        const target = ALIASES[span] ?? dict.get(span);
        if (target && target.slug !== excludeSlug) part = { kind: "singer", target };
      }
      if (!part) continue;
      const cand = [...prefix, part];
      const cur = best[j];
      if (!cur || cand.length < cur.length) best[j] = cand;
    }
  }
  return best[n];
}

/** A segmentation is a compound when it names two or more singers, or one singer plus dropped filler. */
function qualifies(seg: Part[]): boolean {
  const singers = seg.filter((p) => p.kind === "singer").length;
  return singers >= 2 || (singers >= 1 && seg.length > singers);
}

function buildDictionary(artists: ArtistRow[]): { dict: Map<string, Target>; removed: Target[] } {
  const dict = new Map<string, Target>();
  for (const a of artists) {
    const k = keyOf(a.name);
    if (!k || a.sung < MIN_SONGS || tokens(a.name).length > 3 || ALIASES[k]) continue;
    if (!dict.has(k)) dict.set(k, { slug: a.slug, name: a.name });
  }
  // Remove dictionary entries that are themselves compounds (e.g. "Rafi Lata").
  const removed: Target[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const [k, t] of [...dict]) {
      if (PROTECTED.has(k)) continue;
      const seg = segment(k.split(" "), dict, k, t.slug);
      if (seg && qualifies(seg)) {
        dict.delete(k);
        removed.push(t);
        changed = true;
      }
    }
  }
  return { dict, removed };
}

function plan(artists: ArtistRow[], dict: Map<string, Target>) {
  const plans: Plan[] = [];
  const unresolved: ArtistRow[] = [];
  for (const a of artists) {
    if (a.sung < 1) continue;
    const toks = tokens(a.name);
    const k = toks.join(" ");
    if (!k) continue;

    if (PROTECTED.has(k)) continue;
    const alias = ALIASES[k];
    if (alias && alias.slug !== a.slug) {
      plans.push({ artist: a, parts: [alias], via: "alias" });
      continue;
    }
    if (toks.length < 2) continue;

    const seg = segment(toks, dict, k, a.slug);
    if (seg) {
      const singers = seg.filter((p): p is Extract<Part, { kind: "singer" }> => p.kind === "singer");
      const drops = seg.length - singers.length;
      const uniq = [...new Map(singers.map((p) => [p.target.slug, p.target])).values()].filter((t) => t.slug !== a.slug);
      if (uniq.length >= 2 || (uniq.length === 1 && drops >= 1)) {
        plans.push({ artist: a, parts: uniq, via: "split" });
        continue;
      }
    }
    // Likely compound we could not fully resolve: contains a known singer or alias span.
    if (a.sung >= 2 && !dict.has(k) && ALIASES[k]?.slug !== a.slug) {
      const hasKnown = toks.some((t) => ALIASES[t] || dict.has(t)) ||
        toks.some((_, i) => toks.slice(i, i + 2).length === 2 && (ALIASES[toks.slice(i, i + 2).join(" ")] || dict.has(toks.slice(i, i + 2).join(" "))));
      if (hasKnown) unresolved.push(a);
    }
  }
  return { plans, unresolved };
}

async function execute(plans: Plan[]) {
  const totals = { moved: 0, deleted: 0, created: 0, batches: 0 };
  for (let i = 0; i < plans.length; i += BATCH_SIZE) {
    const rows = plans.slice(i, i + BATCH_SIZE).map((p) => ({ v: p.artist.slug, parts: p.parts }));
    const session = getSession(neo4j.session.WRITE);
    try {
      const result = await session.run(
        `UNWIND $rows AS row
         MATCH (v:Artist {slug: row.v})
         CALL {
           WITH row, v
           UNWIND row.parts AS p
           MERGE (c:Artist {slug: p.slug}) ON CREATE SET c.name = p.name
           WITH v, c
           MATCH (v)<-[r]-(s:Song)
           MERGE (s)-[:$(type(r))]->(c)
           RETURN count(*) AS moved
         }
         DETACH DELETE v
         RETURN sum(moved) AS moved, count(*) AS deleted`,
        { rows },
      );
      const rec = result.records[0];
      totals.moved += toNumber(rec?.get("moved")) ?? 0;
      totals.deleted += toNumber(rec?.get("deleted")) ?? 0;
      totals.created += result.summary.counters.updates().nodesCreated;
      totals.batches++;
      console.log(`  batch ${totals.batches}: ${Math.min(i + BATCH_SIZE, plans.length)}/${plans.length} nodes`);
    } finally {
      await session.close();
    }
  }
  return totals;
}

function fmt(p: Plan) {
  return `${p.artist.rels.toString().padStart(4)}  ${p.artist.name}  ->  ${p.parts.map((t) => t.name).join(" + ")}${p.via === "alias" ? "  (alias)" : ""}`;
}

async function main() {
  const doExecute = process.argv.includes("--execute");
  const artists = await loadArtists();
  const { dict, removed } = buildDictionary(artists);
  const missingAliasTargets = [...new Set(Object.values(ALIASES).map((t) => t.slug))].filter((s) => !artists.some((a) => a.slug === s));
  const { plans, unresolved } = plan(artists, dict);

  console.log(`\n${"=".repeat(60)}\nCompound Artist Split Report\n${"=".repeat(60)}`);
  console.log(`Artists: ${artists.length}   dictionary singers: ${dict.size}   aliases: ${Object.keys(ALIASES).length}`);
  const singleTok = [...dict.keys()].filter((k) => !k.includes(" "));
  console.log(`Single-token dictionary entries (sanity): ${singleTok.join(", ")}`);
  if (missingAliasTargets.length) console.log(`Alias targets not yet in graph (will be created on use): ${missingAliasTargets.join(", ")}`);
  const bySung = new Map(artists.map((a) => [a.slug, a.sung]));
  console.log(`\nDictionary names judged to be compounds (${removed.length}), by singing credits:`);
  for (const t of removed.sort((a, b) => (bySung.get(b.slug) ?? 0) - (bySung.get(a.slug) ?? 0)).slice(0, 40)) {
    console.log(`  ${(bySung.get(t.slug) ?? 0).toString().padStart(4)}  ${t.name}`);
  }

  const splits = plans.filter((p) => p.via === "split");
  const aliasOnly = plans.filter((p) => p.via === "alias");
  const links = plans.reduce((n, p) => n + p.artist.rels, 0);
  console.log(`\nTo change: ${plans.length} nodes (${splits.length} splits, ${aliasOnly.length} alias variants), ${links} relationships re-pointed`);
  console.log(`\nTop splits:`);
  for (const p of splits.sort((a, b) => b.artist.rels - a.artist.rels).slice(0, 30)) console.log("  " + fmt(p));
  if (aliasOnly.length) {
    console.log(`\nAlias variants:`);
    for (const p of aliasOnly.sort((a, b) => b.artist.rels - a.artist.rels).slice(0, 15)) console.log("  " + fmt(p));
  }
  console.log(`\nUnresolved (look like compounds, not fully matched): ${unresolved.length}`);
  for (const a of unresolved.sort((a, b) => b.rels - a.rels).slice(0, 25)) console.log(`  ${a.rels.toString().padStart(4)}  ${a.name}`);

  if (!doExecute) {
    console.log(`\nDry run. Re-run with --execute to apply.`);
  } else if (plans.length === 0) {
    console.log(`\nNothing to do.`);
  } else {
    console.log(`\nApplying...`);
    const t = await execute(plans);
    console.log(`Done: ${t.deleted} compound nodes deleted, ${t.moved} relationships re-pointed, ${t.created} singer nodes created`);
  }
  await closeDriver();
}

main().catch(async (err) => {
  console.error(err);
  await closeDriver();
  process.exit(1);
});
