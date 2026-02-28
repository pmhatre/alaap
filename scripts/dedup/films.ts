import { read } from "../../lib/neo4j";
import { toNumber } from "../../lib/data/utils";
import { filmDedupKey } from "./normalize";
import type { NodeRecord, MergeGroup, DedupReport } from "./types";

const SOURCE_PRIORITY = ["chandrakantha", "wikipedia", "bollywood_lyrics", "carvaan"];

interface FilmRow {
  slug: string;
  title: string;
  year: unknown;
  sources: string[] | null;
}

export async function findFilmDuplicates(): Promise<DedupReport> {
  const rows = await read<FilmRow>(
    `MATCH (f:Film)
     RETURN f.slug AS slug, f.title AS title, f.year AS year, f.sources AS sources
     ORDER BY f.title`,
  );

  const films: NodeRecord[] = rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    year: toNumber(r.year),
    sources: r.sources ?? [],
  }));

  // Skip sentinel/placeholder film nodes (e.g. "Non-Film Song")
  const SKIP_TITLES = new Set(["nonfilm song", "non film song"]);

  // Group by normalized title
  const titleGroups = new Map<string, NodeRecord[]>();
  for (const film of films) {
    const key = filmDedupKey(film.title);
    if (!key || SKIP_TITLES.has(key)) continue;
    const existing = titleGroups.get(key);
    if (existing) {
      existing.push(film);
    } else {
      titleGroups.set(key, [film]);
    }
  }

  // Sub-group by year compatibility: films with DIFFERENT years are different
  // films (remakes, etc). Only merge when years match or one is missing.
  const mergeGroups: MergeGroup[] = [];
  for (const [titleKey, members] of titleGroups) {
    if (members.length < 2) continue;

    // Split into year-compatible sub-groups
    const subGroups = splitByYearCompatibility(members);

    for (const subGroup of subGroups) {
      if (subGroup.length < 2) continue;

      // Pick winner: prefer node with year, then source priority
      subGroup.sort((a, b) => {
        if (a.year && !b.year) return -1;
        if (!a.year && b.year) return 1;
        const aPri = bestSourcePriority(a.sources);
        const bPri = bestSourcePriority(b.sources);
        if (aPri !== bPri) return aPri - bPri;
        return 0;
      });

      const [winner, ...losers] = subGroup;
      const key = winner.year ? `${titleKey}|${winner.year}` : titleKey;
      mergeGroups.push({ key, winner, losers });
    }
  }

  return {
    entityType: "Film",
    totalNodes: films.length,
    groups: mergeGroups,
    totalDuplicates: mergeGroups.reduce((sum, g) => sum + g.losers.length, 0),
  };
}

/**
 * Split a list of same-title films into year-compatible sub-groups.
 * Films with DIFFERENT known years are kept separate (remakes).
 * Films without a year can merge with any year group.
 */
function splitByYearCompatibility(films: NodeRecord[]): NodeRecord[][] {
  const withYear = films.filter((f) => f.year);
  const withoutYear = films.filter((f) => !f.year);

  // Group films that have years by their actual year
  const byYear = new Map<number, NodeRecord[]>();
  for (const f of withYear) {
    const existing = byYear.get(f.year!);
    if (existing) {
      existing.push(f);
    } else {
      byYear.set(f.year!, [f]);
    }
  }

  if (byYear.size === 0) {
    // All missing years — one group
    return [withoutYear];
  }

  if (byYear.size === 1) {
    // All same year (or no year) — one group
    const [, group] = [...byYear.entries()][0];
    return [[...group, ...withoutYear]];
  }

  // Multiple different years — assign no-year films to the largest year group
  const yearGroups = [...byYear.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  // Add yearless films to the biggest group (most likely match)
  if (withoutYear.length > 0) {
    yearGroups[0][1].push(...withoutYear);
  }

  return yearGroups.map(([, group]) => group);
}

function bestSourcePriority(sources?: string[]): number {
  if (!sources || sources.length === 0) return SOURCE_PRIORITY.length;
  let best = SOURCE_PRIORITY.length;
  for (const s of sources) {
    const idx = SOURCE_PRIORITY.indexOf(s);
    if (idx >= 0 && idx < best) best = idx;
  }
  return best;
}

/**
 * Build a map from loser film slugs to winner film slugs.
 * Used by song dedup to resolve film references through merged films.
 */
export function buildFilmMergeMap(report: DedupReport): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of report.groups) {
    for (const loser of group.losers) {
      map.set(loser.slug, group.winner.slug);
    }
  }
  return map;
}
