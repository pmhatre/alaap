import { read } from "@/lib/neo4j";
import { toNumber } from "./utils";

export interface HomeStats {
  songs: number;
  ragas: number;
  artists: number;
  films: number;
  taals: number;
}

export interface FeaturedRaga {
  name: string;
  slug: string;
  songCount: number;
}

export interface RecentSong {
  title: string;
  slug: string;
  year?: number;
  filmTitle?: string;
  filmSlug?: string;
  composerName?: string;
}

export async function getHomeStats(): Promise<HomeStats> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (s:Song)
     WITH count(s) AS songs
     MATCH (r:Raga)
     WITH songs, count(r) AS ragas
     MATCH (a:Artist)
     WITH songs, ragas, count(a) AS artists
     MATCH (f:Film)
     WITH songs, ragas, artists, count(f) AS films
     MATCH (t:Taal)
     RETURN songs, ragas, artists, films, count(t) AS taals`,
  );
  if (rows.length === 0) {
    return { songs: 0, ragas: 0, artists: 0, films: 0, taals: 0 };
  }
  const row = rows[0];
  return {
    songs: toNumber(row.songs) ?? 0,
    ragas: toNumber(row.ragas) ?? 0,
    artists: toNumber(row.artists) ?? 0,
    films: toNumber(row.films) ?? 0,
    taals: toNumber(row.taals) ?? 0,
  };
}

export async function getFeaturedRagas(
  limit: number = 10,
): Promise<FeaturedRaga[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (r:Raga)<-[:BASED_ON_RAGA]-(s:Song)
     RETURN r.name AS name, r.slug AS slug, count(s) AS songCount
     ORDER BY songCount DESC
     LIMIT $limit`,
    { limit: neo4jInt(limit) },
  );
  return rows.map((r) => ({
    name: r.name as string,
    slug: r.slug as string,
    songCount: toNumber(r.songCount) ?? 0,
  }));
}

export async function getRecentlyAddedSongs(
  limit: number = 10,
): Promise<RecentSong[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (s:Song)
     WHERE s.sources IS NOT NULL
     OPTIONAL MATCH (s)-[:FROM_FILM]->(f:Film)
     OPTIONAL MATCH (s)-[:COMPOSED_BY]->(c:Artist)
     RETURN s.title AS title, s.slug AS slug, s.year AS year,
            f.title AS filmTitle, f.slug AS filmSlug,
            c.name AS composerName
     ORDER BY size(s.sources) DESC, s.year DESC
     LIMIT $limit`,
    { limit: neo4jInt(limit) },
  );
  return rows.map((r) => ({
    title: r.title as string,
    slug: r.slug as string,
    year: toNumber(r.year),
    filmTitle: r.filmTitle as string | undefined,
    filmSlug: r.filmSlug as string | undefined,
    composerName: r.composerName as string | undefined,
  }));
}

function neo4jInt(n: number) {
  const neo4j = require("neo4j-driver").default;
  return neo4j.int(n);
}
