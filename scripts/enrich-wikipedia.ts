/**
 * Wikipedia Enrichment Script
 *
 * Enriches existing Neo4j Raga nodes with musicological properties
 * (aroha, avaroha, vadi, samvadi, pakad, timeOfDay, thaat) from
 * Wikipedia raga article Infobox templates via the MediaWiki API.
 *
 * Non-destructive: only sets null properties, never overwrites existing data.
 * Polite: 1-second delay between API calls.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/enrich-wikipedia.ts           # dry-run
 *   npx tsx --env-file=.env.local scripts/enrich-wikipedia.ts --execute # apply
 */

import { closeDriver } from "../lib/neo4j";
import { buildEnrichmentReport } from "./enrich-wikipedia/match";
import { applyEnrichments } from "./enrich-wikipedia/apply";
import type { EnrichmentPlan, EnrichmentReport } from "./enrich-wikipedia/types";

const args = process.argv.slice(2);
const execute = args.includes("--execute");

function printReport(report: EnrichmentReport) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Wikipedia Enrichment Report");
  console.log(`${"=".repeat(60)}`);

  console.log(`\nSource counts:`);
  console.log(`  Wikipedia articles found: ${report.articlesFound}`);
  console.log(`  Neo4j ragas:             ${report.neo4jCount}`);

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
    console.log(`\nLookup methods:`);
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

  // Property coverage
  const propCounts: Record<string, number> = {};
  for (const plan of report.plans) {
    for (const key of Object.keys(plan.updates)) {
      propCounts[key] = (propCounts[key] || 0) + 1;
    }
  }
  if (Object.keys(propCounts).length > 0) {
    console.log(`\nProperties to set:`);
    for (const [prop, count] of Object.entries(propCounts).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${prop}: ${count}`);
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

  // Unmatched Neo4j ragas (first 30)
  if (report.unmatchedNeo4j.length > 0) {
    console.log(
      `\nNeo4j ragas without Wikipedia article (${report.unmatchedNeo4j.length}):`,
    );
    const show = report.unmatchedNeo4j.slice(0, 30);
    for (const name of show) {
      console.log(`  - ${name}`);
    }
    if (report.unmatchedNeo4j.length > 30) {
      console.log(
        `  ... and ${report.unmatchedNeo4j.length - 30} more`,
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
    `  ${plan.ragaName} ← ${plan.wikipediaName} [${plan.matchMethod}]: ${updates || "(no property updates)"}${thaat}`,
  );
}

async function main() {
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}`);
  if (!execute) {
    console.log("(pass --execute to apply enrichments)");
  }

  // Build enrichment report (fetches from Wikipedia + matches to Neo4j)
  const report = await buildEnrichmentReport();

  // Print report
  printReport(report);

  // Apply if --execute
  if (execute && report.plans.length > 0) {
    console.log(`\nApplying ${report.plans.length} enrichments...`);
    const result = await applyEnrichments(report.plans);
    console.log(`\nDone:`);
    console.log(`  Properties updated: ${result.propertiesUpdated} ragas`);
    console.log(`  Thaat relationships: ${result.thaatsCreated}`);
  } else if (!execute && report.plans.length > 0) {
    console.log(
      `\nRe-run with --execute to apply ${report.plans.length} enrichments.`,
    );
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
