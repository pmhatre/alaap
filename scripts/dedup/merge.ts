import { write } from "../../lib/neo4j";
import type { MergeGroup } from "./types";

const SOURCE_PRIORITY = ["chandrakantha", "wikipedia", "bollywood_lyrics", "carvaan"];

/**
 * Execute a film merge group: transfer relationships, merge properties, delete losers.
 */
export async function executeFilmMerge(group: MergeGroup): Promise<void> {
  const winnerSlug = group.winner.slug;

  for (const loser of group.losers) {
    // Transfer incoming FROM_FILM relationships from songs
    await write(
      `MATCH (s:Song)-[r:FROM_FILM]->(loser:Film {slug: $loserSlug})
       MATCH (winner:Film {slug: $winnerSlug})
       WHERE NOT (s)-[:FROM_FILM]->(winner)
       CREATE (s)-[:FROM_FILM]->(winner)`,
      { loserSlug: loser.slug, winnerSlug },
    );

    // Merge properties onto winner
    const mergedProps = mergeFilmProperties(group.winner, loser);
    await write(
      `MATCH (f:Film {slug: $slug})
       SET f.year = $year, f.sources = $sources`,
      {
        slug: winnerSlug,
        year: mergedProps.year ?? null,
        sources: mergedProps.sources ?? [],
      },
    );

    // Delete loser (DETACH removes all remaining relationships)
    await write(
      `MATCH (f:Film {slug: $slug}) DETACH DELETE f`,
      { slug: loser.slug },
    );
  }
}

/**
 * Execute a song merge group: transfer all relationships, merge properties, delete losers.
 */
export async function executeSongMerge(group: MergeGroup): Promise<void> {
  const winnerSlug = group.winner.slug;

  for (const loser of group.losers) {
    // Transfer all outgoing relationship types
    const relTypes = [
      "BASED_ON_RAGA",
      "SUNG_BY",
      "COMPOSED_BY",
      "LYRICS_BY",
      "FROM_FILM",
      "SET_TO_TAAL",
    ];

    for (const relType of relTypes) {
      await write(
        `MATCH (loser:Song {slug: $loserSlug})-[r:${relType}]->(target)
         MATCH (winner:Song {slug: $winnerSlug})
         WHERE NOT (winner)-[:${relType}]->(target)
         CREATE (winner)-[:${relType}]->(target)`,
        { loserSlug: loser.slug, winnerSlug },
      );
    }

    // Merge properties onto winner
    const mergedProps = mergeSongProperties(group.winner, loser);
    await write(
      `MATCH (s:Song {slug: $slug})
       SET s.year = $year,
           s.youtube_id = $youtube_id,
           s.lyrics = $lyrics,
           s.notes = $notes,
           s.sources = $sources`,
      {
        slug: winnerSlug,
        year: mergedProps.year ?? null,
        youtube_id: mergedProps.youtube_id ?? null,
        lyrics: mergedProps.lyrics ?? null,
        notes: mergedProps.notes ?? null,
        sources: mergedProps.sources ?? [],
      },
    );

    // Delete loser
    await write(
      `MATCH (s:Song {slug: $slug}) DETACH DELETE s`,
      { slug: loser.slug },
    );
  }
}

function mergeFilmProperties(
  winner: MergeGroup["winner"],
  loser: MergeGroup["losers"][0],
) {
  return {
    year: winner.year ?? loser.year,
    sources: unionSources(winner.sources, loser.sources),
  };
}

function mergeSongProperties(
  winner: MergeGroup["winner"],
  loser: MergeGroup["losers"][0],
) {
  // Source-specific field ownership:
  // notes: chandrakantha, lyrics: bollywood_lyrics, youtube_id: carvaan
  // year: first non-null by source priority
  return {
    year: pickBySourcePriority(winner, loser, "year"),
    youtube_id: winner.youtube_id ?? loser.youtube_id,
    lyrics: winner.lyrics ?? loser.lyrics,
    notes: winner.notes ?? loser.notes,
    sources: unionSources(winner.sources, loser.sources),
  };
}

function pickBySourcePriority(
  winner: MergeGroup["winner"],
  loser: MergeGroup["losers"][0],
  field: "year",
): number | undefined {
  // Winner is already sorted by source priority, so prefer winner's value
  return winner[field] ?? loser[field];
}

function unionSources(a?: string[], b?: string[]): string[] {
  const set = new Set([...(a ?? []), ...(b ?? [])]);
  // Return in priority order
  return SOURCE_PRIORITY.filter((s) => set.has(s));
}
