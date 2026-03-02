import { getSongBySlug, type SongDetail } from "./songs";
import favoritesData from "@/app/data/favorites.json";

export interface FavoriteSong {
  song: SongDetail;
  annotation: string;
  listenFor?: string;
}

export interface FavoritesData {
  intro: string;
  songs: FavoriteSong[];
}

export async function getFavorites(): Promise<FavoritesData> {
  const results = await Promise.all(
    favoritesData.songs.map(async (entry) => {
      const song = await getSongBySlug(entry.slug);
      if (!song) return null;
      return {
        song,
        annotation: entry.annotation,
        listenFor: entry.listenFor || undefined,
      } satisfies FavoriteSong;
    }),
  );

  return {
    intro: favoritesData.intro,
    songs: results.filter((r) => r !== null),
  };
}
