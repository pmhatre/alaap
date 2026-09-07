/**
 * Run a .cypher file of semicolon-terminated statements against Neo4j.
 *
 * Used for schema constraints (db/constraints.cypher) and for the committed
 * record of manual data corrections (db/curation.cypher), so that hand edits
 * are reproducible on a fresh instance instead of living only in the database.
 *
 * Usage:
 *   pnpm data:cypher db/constraints.cypher
 *   pnpm data:cypher db/curation.cypher -- --dry-run
 *
 * Each statement runs in its own auto-commit transaction (schema commands
 * require this). Statements are split on a semicolon at end of line (an inline
 * `//` comment may follow the semicolon), and `//` comment lines are stripped.
 */

import { readFileSync } from "node:fs";
import neo4j from "neo4j-driver";
import { getSession, closeDriver } from "../lib/neo4j";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error("usage: tsx scripts/run-cypher.ts <file.cypher> [--dry-run]");
  process.exit(1);
}

function parseStatements(text: string): string[] {
  return text
    .split(/;[ \t]*(?:\/\/[^\n]*)?(?:\r?\n|$)/)
    .map((chunk) =>
      chunk
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n")
        .trim(),
    )
    .filter((s) => s.length > 0);
}

async function main() {
  const statements = parseStatements(readFileSync(file!, "utf8"));
  console.log(`${file}: ${statements.length} statement(s)${dryRun ? " (dry run)" : ""}\n`);

  let failed = 0;
  for (const [i, statement] of statements.entries()) {
    const preview = statement.replace(/\s+/g, " ").slice(0, 100);
    console.log(`[${i + 1}/${statements.length}] ${preview}${statement.length > 100 ? "…" : ""}`);
    if (dryRun) continue;

    const session = getSession(neo4j.session.WRITE);
    try {
      const result = await session.run(statement);
      const c = result.summary.counters.updates();
      const changes = Object.entries(c)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      console.log(`    ok${changes ? ` (${changes})` : ""}`);
    } catch (err) {
      failed++;
      console.error(`    FAILED: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await session.close();
    }
  }

  await closeDriver();
  if (failed > 0) {
    console.error(`\n${failed} statement(s) failed`);
    process.exit(1);
  }
}

main();
