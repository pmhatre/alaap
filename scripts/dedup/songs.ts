import { read } from "../../lib/neo4j";
import { toNumber } from "../../lib/data/utils";
import { songDedupKey, isTitlePrefixMatch } from "./normalize";
import type { NodeRecord, MergeGroup, DedupReport } from "./types";

const SOURCE_PRIORITY = ["chandrakantha", "wikipedia", "bollywood_lyrics", "carvaan"];

interface SongRow {
  slug: string;
  title: string;
  year: unknown;
  sources: string[] | null;
  youtube_id: string | null;
  lyrics: string | null;
  notes: string | null;
  filmSlug: string | null;
  filmTitle: string | null;
}

/**
 * Find song duplicates. Takes an optional film merge map to resolve
 * film slugs through previously identified film merges.
 */
export async function findSongDuplicates(
  filmMergeMap?: Map<string, string>,
): Promise<DedupReport> {
  const rows = await read<SongRow>(
    `MATCH (s:Song)
     OPTIONAL MATCH (s)-[:FROM_FILM]->(f:Film)
     RETURN s.slug AS slug, s.title AS title, s.year AS year,
            s.sources AS sources, s.youtube_id AS youtube_id,
            s.lyrics AS lyrics, s.notes AS notes,
            f.slug AS filmSlug, f.title AS filmTitle
     ORDER BY s.title`,
  );

  const songs: (NodeRecord & { filmTitle?: string })[] = rows.map((r) => {
    let fSlug = r.filmSlug ?? undefined;
    // Resolve through film merge map if loser
    if (fSlug && filmMergeMap?.has(fSlug)) {
      fSlug = filmMergeMap.get(fSlug)!;
    }
    return {
      slug: r.slug,
      title: r.title,
      year: toNumber(r.year),
      sources: r.sources ?? [],
      youtube_id: r.youtube_id ?? undefined,
      lyrics: r.lyrics ?? undefined,
      notes: r.notes ?? undefined,
      filmSlug: fSlug,
      filmTitle: r.filmTitle ?? undefined,
    };
  });

  // Group by dedup key (normalized title + normalized film)
  const groups = new Map<string, (NodeRecord & { filmTitle?: string })[]>();
  for (const song of songs) {
    const key = songDedupKey(song.title, song.filmTitle);
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) {
      existing.push(song);
    } else {
      groups.set(key, [song]);
    }
  }

  // Second pass: merge groups where shorter title is a prefix of longer
  // (handles Bollywood Lyrics full-first-line titles)
  const keys = [...groups.keys()];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const keyA = keys[i];
      const keyB = keys[j];
      const membersA = groups.get(keyA);
      const membersB = groups.get(keyB);
      if (!membersA || !membersB) continue;

      // Only compare songs with the same film context
      const filmPartA = keyA.includes("|") ? keyA.split("|")[1] : "";
      const filmPartB = keyB.includes("|") ? keyB.split("|")[1] : "";
      if (filmPartA !== filmPartB) continue;

      const titlePartA = keyA.includes("|") ? keyA.split("|")[0] : keyA;
      const titlePartB = keyB.includes("|") ? keyB.split("|")[0] : keyB;

      if (isTitlePrefixMatch(titlePartA, titlePartB)) {
        // Merge into the shorter key (canonical title is usually shorter)
        const mergeIntoKey =
          titlePartA.length <= titlePartB.length ? keyA : keyB;
        const mergeFromKey = mergeIntoKey === keyA ? keyB : keyA;
        const target = groups.get(mergeIntoKey)!;
        const source = groups.get(mergeFromKey)!;
        target.push(...source);
        groups.delete(mergeFromKey);
        // Update keys array
        keys.splice(keys.indexOf(mergeFromKey), 1);
        j--; // Re-check current j index
      }
    }
  }

  // Build merge groups
  const mergeGroups: MergeGroup[] = [];
  for (const [key, members] of groups) {
    if (members.length < 2) continue;

    // For songs without a film, be more cautious — only merge small groups
    const hasFilm = key.includes("|");
    if (!hasFilm && members.length > 3) continue;

    // Sort to pick winner
    members.sort((a, b) => {
      // Source priority
      const aPri = bestSourcePriority(a.sources);
      const bPri = bestSourcePriority(b.sources);
      if (aPri !== bPri) return aPri - bPri;
      // Prefer having a year
      if (a.year && !b.year) return -1;
      if (!a.year && b.year) return 1;
      // Prefer more properties (richer node)
      const aProps = countProperties(a);
      const bProps = countProperties(b);
      if (aProps !== bProps) return bProps - aProps;
      return 0;
    });

    const [winner, ...losers] = members;
    mergeGroups.push({ key, winner, losers });
  }

  return {
    entityType: "Song",
    totalNodes: songs.length,
    groups: mergeGroups,
    totalDuplicates: mergeGroups.reduce((sum, g) => sum + g.losers.length, 0),
  };
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

function countProperties(node: NodeRecord): number {
  let count = 0;
  if (node.year) count++;
  if (node.youtube_id) count++;
  if (node.lyrics) count++;
  if (node.notes) count++;
  if (node.sources && node.sources.length > 1) count++;
  return count;
}
