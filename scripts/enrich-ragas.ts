/**
 * ragaDB Enrichment Script
 *
 * Enriches existing Neo4j Raga nodes with musicological properties
 * (aroha, avaroha, vadi, samvadi, pakad, timeOfDay) from ragaDB,
 * and creates Thaat nodes + BELONGS_TO_THAAT relationships.
 *
 * Non-destructive: only sets null properties, never overwrites existing data.
 *
 * Usage:
 *   pnpm data:enrich:ragas                    # dry-run
 *   pnpm data:enrich:ragas -- --execute       # apply
 *   pnpm data:enrich:ragas -- --local ragas.json
 */

import { closeDriver } from "../lib/neo4j";
import { fetchRagaDB } from "./enrich-ragas/fetch";
import { buildEnrichmentReport } from "./enrich-ragas/match";
import { applyEnrichments } from "./enrich-ragas/apply";
import type { EnrichmentReport, EnrichmentPlan } from "./enrich-ragas/types";

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const localIdx = args.indexOf("--local");
const localPath = localIdx !== -1 ? args[localIdx + 1] : undefined;

function printReport(report: EnrichmentReport) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("ragaDB Enrichment Report");
  console.log(`${"=".repeat(60)}`);

  console.log(`\nSource counts:`);
  console.log(`  ragaDB entries: ${report.ragaDBCount}`);
  console.log(`  Neo4j ragas:    ${report.neo4jCount}`);

  console.log(`\nMatching:`);
  console.log(`  Matched:  ${report.matchedCount}`);
  console.log(`  Enriched: ${report.enrichedCount} (have properties to set)`);
  console.log(`  Skipped:  ${report.skippedCount} (all properties already populated)`);

  // Match method breakdown
  const methodCounts: Record<string, number> = {};
  for (const plan of report.plans) {
    methodCounts[plan.matchMethod] = (methodCounts[plan.matchMethod] || 0) + 1;
  }
  if (Object.keys(methodCounts).length > 0) {
    console.log(`\nMatch methods:`);
    for (const [method, count] of Object.entries(methodCounts).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${method}: ${count}`);
    }
  }

  // Thaat distribution
  if (Object.keys(report.thaatCounts).length > 0) {
    console.log(`\nThaat distribution:`);
    const sorted = Object.entries(report.thaatCounts).sort(
      (a, b) => b[1] - a[1],
    );
    for (const [thaat, count] of sorted) {
      console.log(`  ${thaat}: ${count}`);
    }
  }

  // Sample enrichments
  const samples = report.plans.slice(0, 5);
  if (samples.length > 0) {
    console.log(`\nSample enrichments (first ${samples.length}):`);
    for (const plan of samples) {
      printPlan(plan);
    }
    if (report.plans.length > 5) {
      console.log(`  ... and ${report.plans.length - 5} more`);
    }
  }

  // Unmatched ragaDB entries
  if (report.unmatchedRagaDB.length > 0) {
    console.log(`\nUnmatched ragaDB entries (${report.unmatchedRagaDB.length}):`);
    const show = report.unmatchedRagaDB.slice(0, 30);
    for (const name of show) {
      console.log(`  - ${name}`);
    }
    if (report.unmatchedRagaDB.length > 30) {
      console.log(
        `  ... and ${report.unmatchedRagaDB.length - 30} more`,
      );
    }
  }

  // Unmatched Neo4j ragas
  if (report.unmatchedNeo4j.length > 0) {
    console.log(`\nNeo4j ragas without ragaDB match (${report.unmatchedNeo4j.length}):`);
    const show = report.unmatchedNeo4j.slice(0, 20);
    for (const name of show) {
      console.log(`  - ${name}`);
    }
    if (report.unmatchedNeo4j.length > 20) {
      console.log(
        `  ... and ${report.unmatchedNeo4j.length - 20} more`,
      );
    }
  }
}

function printPlan(plan: EnrichmentPlan) {
  const updates = Object.entries(plan.updates)
    .map(([k, v]) => `${k}="${v}"`)
    .join(", ");
  const thaat = plan.thaat ? `, thaat=${plan.thaat}` : "";
  console.log(
    `  ${plan.ragaName} ← ${plan.ragaDBName} [${plan.matchMethod}]: ${updates || "(no property updates)"}${thaat}`,
  );
}

async function main() {
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}`);
  if (!execute) {
    console.log("(pass --execute to apply enrichments)");
  }

  // 1. Fetch ragaDB
  const entries = await fetchRagaDB(localPath);

  // 2. Build enrichment report (matches + plans)
  const report = await buildEnrichmentReport(entries);

  // 3. Print report
  printReport(report);

  // 4. Apply if --execute
  if (execute && report.plans.length > 0) {
    console.log(`\nApplying ${report.plans.length} enrichments...`);
    const result = await applyEnrichments(report.plans);
    console.log(`\nDone:`);
    console.log(`  Properties updated: ${result.propertiesUpdated} ragas`);
    console.log(`  Thaat relationships: ${result.thaatsCreated}`);
  } else if (!execute && report.plans.length > 0) {
    console.log(`\nRe-run with --execute to apply ${report.plans.length} enrichments.`);
  } else {
    console.log("\nNothing to enrich.");
  }

  await closeDriver();
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await closeDriver();
  process.exit(1);
});
