import { read } from "@/lib/neo4j";
import type { Song, Raga, Artist, Film, Taal } from "@/lib/types";
import { toPlainObject, toNumber, PAGE_SIZE } from "./utils";

export interface SongDetail extends Song {
  ragas: Raga[];
  singers: Artist[];
  composer?: Artist;
  lyricist?: Artist;
  film?: Film;
  taal?: Taal;
}

export interface SongListItem extends Song {
  ragas: Pick<Raga, "name" | "slug">[];
  singers: Pick<Artist, "name" | "slug">[];
  composerName?: string;
  composerSlug?: string;
  filmTitle?: string;
  filmSlug?: string;
}

function mapSongListItem(row: Record<string, unknown>): SongListItem {
  const s = toPlainObject<Song>(row.s as Record<string, unknown>);
  const ragas = (row.ragas as Record<string, unknown>[]).map((r) =>
    toPlainObject<Pick<Raga, "name" | "slug">>(r),
  );
  const singers = (row.singers as Record<string, unknown>[]).map((a) =>
    toPlainObject<Pick<Artist, "name" | "slug">>(a),
  );
  const composer = row.composer as Record<string, unknown> | null;
  const film = row.film as Record<string, unknown> | null;
  return {
    ...s,
    ragas,
    singers,
    composerName: composer?.name as string | undefined,
    composerSlug: composer?.slug as string | undefined,
    filmTitle: film?.title as string | undefined,
    filmSlug: film?.slug as string | undefined,
  };
}

export async function getSongBySlug(
  slug: string,
): Promise<SongDetail | null> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (s:Song {slug: $slug})
     OPTIONAL MATCH (s)-[:BASED_ON_RAGA]->(r:Raga)
     OPTIONAL MATCH (s)-[:SUNG_BY]->(singer:Artist)
     OPTIONAL MATCH (s)-[:COMPOSED_BY]->(composer:Artist)
     OPTIONAL MATCH (s)-[:LYRICS_BY]->(lyricist:Artist)
     OPTIONAL MATCH (s)-[:FROM_FILM]->(f:Film)
     OPTIONAL MATCH (s)-[:SET_TO_TAAL]->(t:Taal)
     RETURN s,
            collect(DISTINCT properties(r)) AS ragas,
            collect(DISTINCT properties(singer)) AS singers,
            properties(composer) AS composer,
            properties(lyricist) AS lyricist,
            properties(f) AS film,
            properties(t) AS taal`,
    { slug },
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  const songNode = row.s as Record<string, unknown>;
  if (!songNode) return null;
  const s = toPlainObject<Song>(
    (songNode as { properties?: Record<string, unknown> }).properties ??
      songNode,
  );
  return {
    ...s,
    ragas: (row.ragas as Record<string, unknown>[]).map((r) =>
      toPlainObject<Raga>(r),
    ),
    singers: (row.singers as Record<string, unknown>[]).map((a) =>
      toPlainObject<Artist>(a),
    ),
    composer: row.composer
      ? toPlainObject<Artist>(row.composer as Record<string, unknown>)
      : undefined,
    lyricist: row.lyricist
      ? toPlainObject<Artist>(row.lyricist as Record<string, unknown>)
      : undefined,
    film: row.film
      ? toPlainObject<Film>(row.film as Record<string, unknown>)
      : undefined,
    taal: row.taal
      ? toPlainObject<Taal>(row.taal as Record<string, unknown>)
      : undefined,
  };
}

export async function getSongsByRaga(
  ragaSlug: string,
  page: number = 1,
  language: string = "Hindi",
): Promise<{ songs: SongListItem[]; total: number }> {
  const skip = (page - 1) * PAGE_SIZE;
  const langFilter = language
    ? "WHERE s.language = $language OR s.language IS NULL"
    : "";
  const [songsResult, countResult] = await Promise.all([
    read<Record<string, unknown>>(
      `MATCH (s:Song)-[:BASED_ON_RAGA]->(r:Raga {slug: $ragaSlug})
       ${langFilter}
       OPTIONAL MATCH (s)-[:BASED_ON_RAGA]->(allR:Raga)
       OPTIONAL MATCH (s)-[:SUNG_BY]->(singer:Artist)
       OPTIONAL MATCH (s)-[:COMPOSED_BY]->(composer:Artist)
       OPTIONAL MATCH (s)-[:FROM_FILM]->(f:Film)
       RETURN properties(s) AS s,
              collect(DISTINCT {name: allR.name, slug: allR.slug}) AS ragas,
              collect(DISTINCT {name: singer.name, slug: singer.slug}) AS singers,
              {name: composer.name, slug: composer.slug} AS composer,
              {title: f.title, slug: f.slug} AS film
       ORDER BY s.year DESC
       SKIP $skip LIMIT $limit`,
      { ragaSlug, language, skip: neo4jInt(skip), limit: neo4jInt(PAGE_SIZE) },
    ),
    read<Record<string, unknown>>(
      `MATCH (s:Song)-[:BASED_ON_RAGA]->(r:Raga {slug: $ragaSlug})
       ${langFilter}
       RETURN count(s) AS total`,
      { ragaSlug, language },
    ),
  ]);
  return {
    songs: songsResult.map(mapSongListItem),
    total: toNumber(countResult[0]?.total) ?? 0,
  };
}

export async function getSongsByArtist(
  artistSlug: string,
  role: "singer" | "composer" | "lyricist",
  page: number = 1,
): Promise<{ songs: SongListItem[]; total: number }> {
  const relMap = {
    singer: "SUNG_BY",
    composer: "COMPOSED_BY",
    lyricist: "LYRICS_BY",
  };
  const rel = relMap[role];
  const skip = (page - 1) * PAGE_SIZE;
  const [songsResult, countResult] = await Promise.all([
    read<Record<string, unknown>>(
      `MATCH (s:Song)-[:${rel}]->(a:Artist {slug: $artistSlug})
       OPTIONAL MATCH (s)-[:BASED_ON_RAGA]->(r:Raga)
       OPTIONAL MATCH (s)-[:SUNG_BY]->(singer:Artist)
       OPTIONAL MATCH (s)-[:COMPOSED_BY]->(composer:Artist)
       OPTIONAL MATCH (s)-[:FROM_FILM]->(f:Film)
       RETURN properties(s) AS s,
              collect(DISTINCT {name: r.name, slug: r.slug}) AS ragas,
              collect(DISTINCT {name: singer.name, slug: singer.slug}) AS singers,
              {name: composer.name, slug: composer.slug} AS composer,
              {title: f.title, slug: f.slug} AS film
       ORDER BY s.year DESC
       SKIP $skip LIMIT $limit`,
      { artistSlug, skip: neo4jInt(skip), limit: neo4jInt(PAGE_SIZE) },
    ),
    read<Record<string, unknown>>(
      `MATCH (s:Song)-[:${rel}]->(a:Artist {slug: $artistSlug})
       RETURN count(s) AS total`,
      { artistSlug },
    ),
  ]);
  return {
    songs: songsResult.map(mapSongListItem),
    total: toNumber(countResult[0]?.total) ?? 0,
  };
}

export async function getSongsByFilm(
  filmSlug: string,
): Promise<SongListItem[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (s:Song)-[:FROM_FILM]->(f:Film {slug: $filmSlug})
     OPTIONAL MATCH (s)-[:BASED_ON_RAGA]->(r:Raga)
     OPTIONAL MATCH (s)-[:SUNG_BY]->(singer:Artist)
     OPTIONAL MATCH (s)-[:COMPOSED_BY]->(composer:Artist)
     RETURN properties(s) AS s,
            collect(DISTINCT {name: r.name, slug: r.slug}) AS ragas,
            collect(DISTINCT {name: singer.name, slug: singer.slug}) AS singers,
            {name: composer.name, slug: composer.slug} AS composer,
            {title: f.title, slug: f.slug} AS film
     ORDER BY s.title`,
    { filmSlug },
  );
  return rows.map(mapSongListItem);
}

export interface RecommendedSong extends SongListItem {
  reason: string;
}

export async function getRecommendedSongs(
  songSlug: string,
): Promise<RecommendedSong[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (seed:Song {slug: $slug})
     OPTIONAL MATCH (seed)-[:BASED_ON_RAGA]->(sr:Raga)
     WITH seed, collect(DISTINCT sr) AS seedRagas
     WHERE size(seedRagas) > 0
     OPTIONAL MATCH (seed)-[:COMPOSED_BY]->(sc:Artist)
     WITH seed, seedRagas, head(collect(DISTINCT sc)) AS sc
     OPTIONAL MATCH (seed)-[:FROM_FILM]->(sf:Film)
     WITH seed, seedRagas, sc, head(collect(DISTINCT sf)) AS sf
     UNWIND seedRagas AS sr
     MATCH (candidate:Song)-[:BASED_ON_RAGA]->(sr)
     WHERE candidate <> seed
     WITH candidate, seed, sc, sf, collect(DISTINCT sr.name) AS sharedRagaNames
     OPTIONAL MATCH (candidate)-[:FROM_FILM]->(cf:Film)
     WITH candidate, seed, sc, sf, sharedRagaNames, head(collect(DISTINCT cf)) AS cf
     WHERE cf IS NULL OR sf IS NULL OR cf <> sf
     OPTIONAL MATCH (candidate)-[:COMPOSED_BY]->(cc:Artist)
     WITH candidate, seed, sc, sharedRagaNames, head(collect(DISTINCT cc)) AS cc
     WITH candidate, sharedRagaNames,
          size(sharedRagaNames) * 100
          + CASE WHEN cc IS NOT NULL AND sc IS NOT NULL AND cc = sc THEN 10 ELSE 0 END
          + CASE WHEN seed.year IS NOT NULL AND candidate.year IS NOT NULL
               THEN toFloat(10) / (abs(seed.year - candidate.year) + 1)
               ELSE 0 END AS score,
          CASE WHEN cc IS NOT NULL AND sc IS NOT NULL AND cc = sc THEN cc.name ELSE null END AS sharedComposerName
     ORDER BY score DESC
     LIMIT 6
     OPTIONAL MATCH (candidate)-[:BASED_ON_RAGA]->(r:Raga)
     OPTIONAL MATCH (candidate)-[:SUNG_BY]->(singer:Artist)
     OPTIONAL MATCH (candidate)-[:COMPOSED_BY]->(composer:Artist)
     OPTIONAL MATCH (candidate)-[:FROM_FILM]->(f:Film)
     RETURN properties(candidate) AS s,
            collect(DISTINCT {name: r.name, slug: r.slug}) AS ragas,
            collect(DISTINCT {name: singer.name, slug: singer.slug}) AS singers,
            head(collect(DISTINCT {name: composer.name, slug: composer.slug})) AS composer,
            head(collect(DISTINCT {title: f.title, slug: f.slug})) AS film,
            sharedRagaNames,
            sharedComposerName`,
    { slug: songSlug },
  );
  const seen = new Set<string>();
  return rows
    .map((row) => {
      const song = mapSongListItem(row);
      const ragaNames = row.sharedRagaNames as string[];
      const composerName = row.sharedComposerName as string | null;
      const parts: string[] = [];
      if (ragaNames.length === 1) {
        parts.push(`Also in Raga ${ragaNames[0]}`);
      } else if (ragaNames.length > 1) {
        parts.push(`Shares ragas ${ragaNames.join(", ")}`);
      }
      if (composerName) {
        parts.push("Same composer");
      }
      return { ...song, reason: parts.join(" · ") };
    })
    .filter((song) => {
      if (seen.has(song.slug)) return false;
      seen.add(song.slug);
      return true;
    });
}

function neo4jInt(n: number) {
  const neo4j = require("neo4j-driver").default;
  return neo4j.int(n);
}
