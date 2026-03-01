/**
 * Chandrakantha Enrichment Script
 *
 * Enriches existing Neo4j Raga nodes with scholarly descriptions and
 * musicological properties (thaat, vadi, samvadi, timeOfDay) from
 * chandrakantha.com raga reference pages.
 *
 * Non-destructive: only sets null properties, never overwrites existing data.
 * Polite: 2-second delay between page fetches.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/enrich-chandrakantha.ts           # dry-run
 *   npx tsx --env-file=.env.local scripts/enrich-chandrakantha.ts --execute # apply
 */

import { closeDriver } from "../lib/neo4j";
import { fetchAllPages } from "./enrich-chandrakantha/fetch";
import { parsePage } from "./enrich-chandrakantha/parse";
import { buildEnrichmentReport } from "./enrich-chandrakantha/match";
import { applyEnrichments } from "./enrich-chandrakantha/apply";
import type { EnrichmentPlan, EnrichmentReport } from "./enrich-chandrakantha/types";

const args = process.argv.slice(2);
const execute = args.includes("--execute");

function printReport(report: EnrichmentReport) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Chandrakantha Enrichment Report");
  console.log(`${"=".repeat(60)}`);

  console.log(`\nSource counts:`);
  console.log(`  Chandrakantha entries: ${report.chandrakanthaCount}`);
  console.log(`  Neo4j ragas:          ${report.neo4jCount}`);

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

  // Description stats
  const withDesc = report.plans.filter((p) => p.updates.description).length;
  console.log(`\nDescriptions: ${withDesc} ragas will get descriptions`);

  // Unmatched
  if (report.unmatchedChandrakantha.length > 0) {
    console.log(
      `\nUnmatched Chandrakantha entries (${report.unmatchedChandrakantha.length}):`,
    );
    for (const name of report.unmatchedChandrakantha) {
      console.log(`  - ${name}`);
    }
  }
}

function printPlan(plan: EnrichmentPlan) {
  const entries = Object.entries(plan.updates);
  const updates = entries
    .map(([k, v]) => {
      if (k === "description") return `description=(${(v as string).length} chars)`;
      return `${k}="${v}"`;
    })
    .join(", ");
  const thaat = plan.thaat ? `, thaat=${plan.thaat}` : "";
  console.log(
    `  ${plan.ragaName} ← ${plan.chandrakanthaName} [${plan.matchMethod}]: ${updates || "(no property updates)"}${thaat}`,
  );
}

async function main() {
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}`);
  if (!execute) {
    console.log("(pass --execute to apply enrichments)");
  }

  // 1. Fetch all Chandrakantha raga pages
  console.log("\n--- Fetching Chandrakantha pages ---");
  const pages = await fetchAllPages();

  // 2. Parse each page
  console.log("\n--- Parsing pages ---");
  const entries = pages
    .map((p) => parsePage(p.html, p.url))
    .filter((e): e is NonNullable<typeof e> => e !== null);
  console.log(`Parsed ${entries.length} entries from ${pages.length} pages`);

  // Log entries with/without descriptions
  const withDesc = entries.filter((e) => e.description.length > 0);
  const withoutDesc = entries.filter((e) => e.description.length === 0);
  console.log(`  With descriptions: ${withDesc.length}`);
  if (withoutDesc.length > 0) {
    console.log(`  Without descriptions: ${withoutDesc.length} (${withoutDesc.map((e) => e.name).join(", ")})`);
  }

  // 3. Build enrichment report
  console.log("\n--- Matching to Neo4j ---");
  const report = await buildEnrichmentReport(entries);

  // 4. Print report
  printReport(report);

  // 5. Apply if --execute
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
