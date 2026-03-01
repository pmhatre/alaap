import { SongCard } from "./song-card";
import type { SongListItem } from "@/lib/data/songs";

interface RecommendedSongsProps {
  songs: SongListItem[];
}

export function RecommendedSongs({ songs }: RecommendedSongsProps) {
  if (songs.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="font-heading text-lg font-semibold">You might also enjoy</h2>
      <p className="mt-1 text-sm text-stone-500">
        Songs that share a raga or musical lineage
      </p>
      <div className="mt-4">
        {songs.map((song) => (
          <SongCard key={song.slug} song={song} />
        ))}
      </div>
    </div>
  );
}
