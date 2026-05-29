/**
 * Match Geetmala CSV entries to existing Neo4j Song nodes.
 * Reuses normalization functions from the dedup module.
 */

import neo4j from "neo4j-driver";
import { read } from "../../lib/neo4j";
import {
  songDedupKey,
  filmDedupKey,
  normalizeForDedup,
  collapseSchwa,
  isTitlePrefixMatch,
} from "../dedup/normalize";
import type { GeetmalaEntry, ExistingSong, GeetmalaPlan, GeetmalaReport } from "./types";

/**
 * Manual overrides for entries that can't be matched automatically.
 * Key: "csvTitle|csvFilm|csvYear", Value: song slug in Neo4j.
 */
const MANUAL_MAP: Record<string, string> = {
  // Add overrides here as needed, e.g.:
  // "Ae Mere Dil Kahin Aur Chal|Daag|1952": "ae-mere-dil-kahin-aur-chal"
};

/** Fetch all songs from Neo4j with film titles and existing geetmala data */
async function fetchExistingSongs(): Promise<ExistingSong[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (s:Song)
     OPTIONAL MATCH (s)-[:FROM_FILM]->(f:Film)
     RETURN s.slug AS slug, s.title AS title, s.year AS year,
            f.title AS filmTitle,
            s.geetmala_rank AS geetmala_rank,
            s.geetmala_year AS geetmala_year`,
  );

  return rows.map((r) => ({
    slug: r.slug as string,
    title: r.title as string,
    year: neo4j.isInt(r.year) ? (r.year as { toNumber(): number }).toNumber() : (r.year as number | null),
    filmTitle: (r.filmTitle as string) ?? null,
    geetmala_rank: neo4j.isInt(r.geetmala_rank) ? (r.geetmala_rank as { toNumber(): number }).toNumber() : (r.geetmala_rank as number | null),
    geetmala_year: neo4j.isInt(r.geetmala_year) ? (r.geetmala_year as { toNumber(): number }).toNumber() : (r.geetmala_year as number | null),
  }));
}

/** Try to match a CSV entry to a Neo4j song using 5-tier matching */
function matchEntry(
  entry: GeetmalaEntry,
  songsByKey: Map<string, ExistingSong>,
  songsByNormTitle: Map<string, ExistingSong[]>,
  songsBySlug: Map<string, ExistingSong>,
): { song: ExistingSong; method: GeetmalaPlan["matchMethod"] } | null {
  // Tier 0: Manual override
  const manualKey = `${entry.title}|${entry.film}|${entry.year}`;
  const manualSlug = MANUAL_MAP[manualKey];
  if (manualSlug) {
    const song = songsBySlug.get(manualSlug);
    if (song) return { song, method: "manual" };
  }

  // Tier 1: songDedupKey(title, film) + exact year match
  const dedupKey = songDedupKey(entry.title, entry.film);
  const exactMatch = songsByKey.get(dedupKey);
  if (exactMatch && exactMatch.year === entry.year) {
    return { song: exactMatch, method: "exact" };
  }

  // Tier 2: Normalized title+film, year tolerance +-1
  if (exactMatch && exactMatch.year !== null && Math.abs(exactMatch.year - entry.year) <= 1) {
    return { song: exactMatch, method: "normalized" };
  }

  // Tier 3: Normalized title + year (ignoring film)
  const normTitle = collapseSchwa(normalizeForDedup(entry.title));
  const titleMatches = songsByNormTitle.get(normTitle);
  if (titleMatches) {
    const yearMatch = titleMatches.find(
      (s) => s.year === entry.year || (s.year !== null && Math.abs(s.year - entry.year) <= 1),
    );
    if (yearMatch) return { song: yearMatch, method: "title_only" };
  }

  // Tier 4: isTitlePrefixMatch + year + film key match
  if (titleMatches) {
    const csvFilmKey = filmDedupKey(entry.film);
    for (const candidate of titleMatches) {
      if (candidate.year !== null && Math.abs(candidate.year - entry.year) > 1) continue;
      if (candidate.filmTitle && filmDedupKey(candidate.filmTitle) === csvFilmKey) {
        if (isTitlePrefixMatch(entry.title, candidate.title)) {
          return { song: candidate, method: "prefix" };
        }
      }
    }
  }

  // Also try prefix match across all songs with matching year
  if (songsByNormTitle.size > 0) {
    for (const candidates of songsByNormTitle.values()) {
      for (const candidate of candidates) {
        if (candidate.year !== null && Math.abs(candidate.year - entry.year) > 1) continue;
        if (candidate.filmTitle && filmDedupKey(candidate.filmTitle) === filmDedupKey(entry.film)) {
          if (isTitlePrefixMatch(entry.title, candidate.title)) {
            return { song: candidate, method: "prefix" };
          }
        }
      }
    }
  }

  return null;
}

/** Build the full matching report */
export async function buildGeetmalaReport(
  entries: GeetmalaEntry[],
): Promise<GeetmalaReport> {
  console.log("Fetching existing songs from Neo4j...");
  const existing = await fetchExistingSongs();
  console.log(`Found ${existing.length} songs in Neo4j`);

  // Build lookup maps
  // Key: songDedupKey(title, film) → first matching song
  const songsByKey = new Map<string, ExistingSong>();
  // Key: normalized title → all songs with that title
  const songsByNormTitle = new Map<string, ExistingSong[]>();
  // Key: slug → song
  const songsBySlug = new Map<string, ExistingSong>();

  for (const song of existing) {
    songsBySlug.set(song.slug, song);

    if (song.filmTitle) {
      const key = songDedupKey(song.title, song.filmTitle);
      if (!songsByKey.has(key)) songsByKey.set(key, song);
    }

    const normTitle = collapseSchwa(normalizeForDedup(song.title));
    const arr = songsByNormTitle.get(normTitle) || [];
    arr.push(song);
    songsByNormTitle.set(normTitle, arr);
  }

  const plans: GeetmalaPlan[] = [];
  const unmatchedCSV: GeetmalaEntry[] = [];
  const conflictEntries: GeetmalaReport["conflictEntries"] = [];
  const methodCounts: Record<string, number> = {};
  const yearCounts: Record<number, number> = {};

  for (const entry of entries) {
    const result = matchEntry(entry, songsByKey, songsByNormTitle, songsBySlug);

    if (!result) {
      unmatchedCSV.push(entry);
      continue;
    }

    // Conflict detection: song already has geetmala data
    if (result.song.geetmala_rank !== null) {
      conflictEntries.push({ entry, existingSong: result.song });
      continue;
    }

    plans.push({
      slug: result.song.slug,
      songTitle: result.song.title,
      csvTitle: entry.title,
      matchMethod: result.method,
      year: entry.year,
      rank: entry.rank,
    });

    methodCounts[result.method] = (methodCounts[result.method] || 0) + 1;
    yearCounts[entry.year] = (yearCounts[entry.year] || 0) + 1;
  }

  return {
    csvCount: entries.length,
    neo4jCount: existing.length,
    matchedCount: plans.length,
    unmatchedCSV,
    conflictEntries,
    plans,
    methodCounts,
    yearCounts,
  };
}
