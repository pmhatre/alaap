/**
 * Binaca Geetmala Enrichment Script
 *
 * Enriches existing Neo4j Song nodes with Binaca Geetmala chart data
 * (geetmala_rank, geetmala_year) from a curated CSV file.
 *
 * Non-destructive: skips songs that already have geetmala data.
 *
 * Usage:
 *   pnpm data:enrich:geetmala                         # dry-run
 *   pnpm data:enrich:geetmala -- --execute            # apply
 *   pnpm data:enrich:geetmala -- --local path/to/alt.csv
 */

import { resolve } from "path";
import { closeDriver } from "../lib/neo4j";
import { parseGeetmalaCSV } from "./enrich-geetmala/parse";
import { buildGeetmalaReport } from "./enrich-geetmala/match";
import { applyGeetmalaPlans } from "./enrich-geetmala/apply";
import type { GeetmalaReport, GeetmalaPlan } from "./enrich-geetmala/types";

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const localIdx = args.indexOf("--local");
const localPath = localIdx !== -1 ? args[localIdx + 1] : undefined;

const DEFAULT_CSV = resolve(__dirname, "../pipeline/data/geetmala.csv");

function printReport(report: GeetmalaReport) {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Binaca Geetmala Enrichment Report");
  console.log(`${"=".repeat(60)}`);

  console.log(`\nSource counts:`);
  console.log(`  CSV entries:  ${report.csvCount}`);
  console.log(`  Neo4j songs:  ${report.neo4jCount}`);

  console.log(`\nMatching:`);
  console.log(`  Matched:    ${report.matchedCount}`);
  console.log(`  Unmatched:  ${report.unmatchedCSV.length}`);
  console.log(`  Conflicts:  ${report.conflictEntries.length} (already have geetmala data)`);

  // Match method breakdown
  if (Object.keys(report.methodCounts).length > 0) {
    console.log(`\nMatch methods:`);
    for (const [method, count] of Object.entries(report.methodCounts).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${method}: ${count}`);
    }
  }

  // Year distribution
  if (Object.keys(report.yearCounts).length > 0) {
    console.log(`\nYear distribution:`);
    const sorted = Object.entries(report.yearCounts)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    for (const [year, count] of sorted) {
      console.log(`  ${year}: ${count} songs`);
    }
  }

  // Sample matches
  const samples = report.plans.slice(0, 10);
  if (samples.length > 0) {
    console.log(`\nSample matches (first ${samples.length}):`);
    for (const plan of samples) {
      printPlan(plan);
    }
    if (report.plans.length > 10) {
      console.log(`  ... and ${report.plans.length - 10} more`);
    }
  }

  // Conflicts
  if (report.conflictEntries.length > 0) {
    console.log(`\nConflicts (${report.conflictEntries.length}):`);
    for (const { entry, existingSong } of report.conflictEntries.slice(0, 10)) {
      console.log(
        `  "${entry.title}" (${entry.film}, ${entry.year}) — already has rank #${existingSong.geetmala_rank} (${existingSong.geetmala_year})`,
      );
    }
  }

  // Unmatched
  if (report.unmatchedCSV.length > 0) {
    console.log(`\nUnmatched CSV entries (${report.unmatchedCSV.length}):`);
    const show = report.unmatchedCSV.slice(0, 20);
    for (const entry of show) {
      console.log(`  - "${entry.title}" (${entry.film}, ${entry.year})`);
    }
    if (report.unmatchedCSV.length > 20) {
      console.log(`  ... and ${report.unmatchedCSV.length - 20} more`);
    }
  }
}

function printPlan(plan: GeetmalaPlan) {
  const titleInfo =
    plan.csvTitle !== plan.songTitle
      ? ` ← "${plan.csvTitle}"`
      : "";
  console.log(
    `  #${plan.rank} (${plan.year}) "${plan.songTitle}"${titleInfo} [${plan.matchMethod}]`,
  );
}

async function main() {
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}`);
  if (!execute) {
    console.log("(pass --execute to apply enrichments)");
  }

  // 1. Parse CSV
  const csvPath = localPath || DEFAULT_CSV;
  console.log(`\nReading CSV: ${csvPath}`);
  const entries = parseGeetmalaCSV(csvPath);
  console.log(`Parsed ${entries.length} entries`);

  // 2. Build matching report
  const report = await buildGeetmalaReport(entries);

  // 3. Print report
  printReport(report);

  // 4. Apply if --execute
  if (execute && report.plans.length > 0) {
    console.log(`\nApplying ${report.plans.length} enrichments...`);
    const result = await applyGeetmalaPlans(report.plans);
    console.log(`\nDone:`);
    console.log(`  Songs updated: ${result.songsUpdated}`);
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
