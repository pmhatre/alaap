import { read } from "@/lib/neo4j";
import type { Film } from "@/lib/types";
import { neo4jInt, toPlainObject, toNumber, PAGE_SIZE } from "./utils";
import { type SongListItem } from "./songs";

export interface FilmWithCount extends Film {
  songCount: number;
}

export async function getAllFilms(
  page: number = 1,
): Promise<{ films: FilmWithCount[]; total: number }> {
  const skip = (page - 1) * PAGE_SIZE;
  const [filmRows, countRows] = await Promise.all([
    read<Record<string, unknown>>(
      `MATCH (f:Film)
       OPTIONAL MATCH (s:Song)-[:FROM_FILM]->(f)
       RETURN properties(f) AS film, count(s) AS songCount
       ORDER BY songCount DESC, film.title ASC
       SKIP $skip LIMIT $limit`,
      { skip: neo4jInt(skip), limit: neo4jInt(PAGE_SIZE) },
    ),
    read<Record<string, unknown>>(
      `MATCH (f:Film) RETURN count(f) AS total`,
    ),
  ]);
  return {
    films: filmRows.map((row) => ({
      ...toPlainObject<Film>(row.film as Record<string, unknown>),
      songCount: toNumber(row.songCount) ?? 0,
    })),
    total: toNumber(countRows[0]?.total) ?? 0,
  };
}

export async function getFilmBySlug(slug: string): Promise<Film | null> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (f:Film {slug: $slug})
     RETURN properties(f) AS film`,
    { slug },
  );
  if (rows.length === 0) return null;
  return toPlainObject<Film>(rows[0].film as Record<string, unknown>);
}

export async function getFilmSongs(filmSlug: string): Promise<SongListItem[]> {
  // Re-use getSongsByFilm from songs.ts
  const { getSongsByFilm } = await import("./songs");
  return getSongsByFilm(filmSlug);
}
