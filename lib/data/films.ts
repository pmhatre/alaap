import { read } from "@/lib/neo4j";
import type { Film } from "@/lib/types";
import { toPlainObject } from "./utils";
import { type SongListItem } from "./songs";

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
