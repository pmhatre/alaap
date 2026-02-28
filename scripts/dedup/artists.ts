import { read } from "../../lib/neo4j";
import { toNumber } from "../../lib/data/utils";
import { artistDedupKey } from "./normalize";
import type { NodeRecord, MergeGroup, DedupReport } from "./types";

const SOURCE_PRIORITY = ["chandrakantha", "wikipedia", "bollywood_lyrics", "carvaan"];

interface ArtistRow {
  slug: string;
  name: string;
  sources: string[] | null;
  relCount: unknown;
}

export async function findArtistDuplicates(): Promise<DedupReport> {
  const rows = await read<ArtistRow>(
    `MATCH (a:Artist)
     OPTIONAL MATCH (s1:Song)-[:SUNG_BY]->(a)
     OPTIONAL MATCH (s2:Song)-[:COMPOSED_BY]->(a)
     OPTIONAL MATCH (s3:Song)-[:LYRICS_BY]->(a)
     WITH a, count(DISTINCT s1) + count(DISTINCT s2) + count(DISTINCT s3) AS relCount
     RETURN a.slug AS slug, a.name AS name, a.sources AS sources, relCount
     ORDER BY a.name`,
  );

  const artists: (NodeRecord & { relCount: number })[] = rows.map((r) => ({
    slug: r.slug,
    title: r.name,
    sources: r.sources ?? [],
    relCount: toNumber(r.relCount) ?? 0,
  }));

  // Group by normalized name
  const nameGroups = new Map<string, (NodeRecord & { relCount: number })[]>();
  for (const artist of artists) {
    const key = artistDedupKey(artist.title);
    if (!key) continue;
    const existing = nameGroups.get(key);
    if (existing) {
      existing.push(artist);
    } else {
      nameGroups.set(key, [artist]);
    }
  }

  // Build merge groups
  const mergeGroups: MergeGroup[] = [];
  for (const [key, members] of nameGroups) {
    if (members.length < 2) continue;

    // Pick winner: most relationships, then source priority
    members.sort((a, b) => {
      if (a.relCount !== b.relCount) return b.relCount - a.relCount;
      const aPri = bestSourcePriority(a.sources);
      const bPri = bestSourcePriority(b.sources);
      if (aPri !== bPri) return aPri - bPri;
      return 0;
    });

    const [winner, ...losers] = members;
    mergeGroups.push({ key, winner, losers });
  }

  return {
    entityType: "Artist",
    totalNodes: artists.length,
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
