/**
 * Neo4j Song & Film Dedup Script
 *
 * Finds and merges duplicate Song and Film nodes caused by transliteration
 * variants in canonical ID normalization.
 *
 * Usage:
 *   pnpm data:dedup                   # dry-run (default)
 *   pnpm data:dedup -- --execute      # apply merges
 *   pnpm data:dedup -- --films-only   # films only
 *   pnpm data:dedup -- --artists-only # artists only
 *   pnpm data:dedup -- --songs-only   # songs only
 */

import { closeDriver } from "../lib/neo4j";
import { findFilmDuplicates, buildFilmMergeMap } from "./dedup/films";
import { findArtistDuplicates } from "./dedup/artists";
import { findSongDuplicates } from "./dedup/songs";
import { executeFilmMerge, executeArtistMerge, executeSongMerge } from "./dedup/merge";
import type { DedupReport, MergeGroup } from "./dedup/types";

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const filmsOnly = args.includes("--films-only");
const artistsOnly = args.includes("--artists-only");
const songsOnly = args.includes("--songs-only");

function printReport(report: DedupReport) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${report.entityType} Dedup Report`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Total ${report.entityType} nodes: ${report.totalNodes}`);
  console.log(`Duplicate groups found: ${report.groups.length}`);
  console.log(`Total duplicates to merge: ${report.totalDuplicates}`);

  if (report.groups.length === 0) {
    console.log("No duplicates found.");
    return;
  }

  console.log(`\nTop groups (up to 20):`);
  const show = report.groups.slice(0, 20);
  for (const group of show) {
    printGroup(group);
  }
  if (report.groups.length > 20) {
    console.log(`  ... and ${report.groups.length - 20} more groups`);
  }
}

function printGroup(group: MergeGroup) {
  const winnerYear = group.winner.year ? ` (${group.winner.year})` : "";
  const winnerSources = group.winner.sources?.join(", ") ?? "?";
  console.log(`\n  Key: "${group.key}"`);
  console.log(
    `  Winner: ${group.winner.slug}${winnerYear} [${winnerSources}]`,
  );
  for (const loser of group.losers) {
    const loserYear = loser.year ? ` (${loser.year})` : "";
    const loserSources = loser.sources?.join(", ") ?? "?";
    console.log(`  Loser:  ${loser.slug}${loserYear} [${loserSources}]`);
  }
}

async function main() {
  console.log(`Mode: ${execute ? "EXECUTE" : "DRY RUN"}`);
  if (!execute) {
    console.log("(pass --execute to apply merges)");
  }

  const runFilms = !songsOnly && !artistsOnly;
  const runArtists = !filmsOnly && !songsOnly;
  const runSongs = !filmsOnly && !artistsOnly;

  let filmReport: DedupReport | null = null;
  let artistReport: DedupReport | null = null;
  let filmMergeMap: Map<string, string> | undefined;

  // Films first (songs reference films)
  if (runFilms) {
    console.log("\nFinding film duplicates...");
    filmReport = await findFilmDuplicates();
    printReport(filmReport);
    filmMergeMap = buildFilmMergeMap(filmReport);

    if (execute && filmReport.groups.length > 0) {
      console.log(`\nExecuting ${filmReport.groups.length} film merges...`);
      for (let i = 0; i < filmReport.groups.length; i++) {
        await executeFilmMerge(filmReport.groups[i]);
        if ((i + 1) % 10 === 0) {
          console.log(`  ... ${i + 1}/${filmReport.groups.length} done`);
        }
      }
      console.log(`Film merges complete.`);
    }
  }

  // Artists (between films and songs)
  if (runArtists) {
    console.log("\nFinding artist duplicates...");
    artistReport = await findArtistDuplicates();
    printReport(artistReport);

    if (execute && artistReport.groups.length > 0) {
      console.log(`\nExecuting ${artistReport.groups.length} artist merges...`);
      for (let i = 0; i < artistReport.groups.length; i++) {
        await executeArtistMerge(artistReport.groups[i]);
        if ((i + 1) % 10 === 0) {
          console.log(`  ... ${i + 1}/${artistReport.groups.length} done`);
        }
      }
      console.log(`Artist merges complete.`);
    }
  }

  // Songs
  if (runSongs) {
    console.log("\nFinding song duplicates...");
    const songReport = await findSongDuplicates(filmMergeMap);
    printReport(songReport);

    if (execute && songReport.groups.length > 0) {
      console.log(`\nExecuting ${songReport.groups.length} song merges...`);
      for (let i = 0; i < songReport.groups.length; i++) {
        await executeSongMerge(songReport.groups[i]);
        if ((i + 1) % 50 === 0) {
          console.log(`  ... ${i + 1}/${songReport.groups.length} done`);
        }
      }
      console.log(`Song merges complete.`);
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("Summary");
  console.log(`${"=".repeat(60)}`);
  if (filmReport) {
    console.log(
      `Films: ${filmReport.totalDuplicates} duplicates in ${filmReport.groups.length} groups`,
    );
  }
  if (artistReport) {
    console.log(
      `Artists: ${artistReport.totalDuplicates} duplicates in ${artistReport.groups.length} groups`,
    );
  }
  if (runSongs) {
    console.log("(song report printed above)");
  }
  if (!execute) {
    console.log("\nRe-run with --execute to apply merges.");
  }

  await closeDriver();
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await closeDriver();
  process.exit(1);
});
