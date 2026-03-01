import { SongCard } from "./song-card";
import type { RecommendedSong } from "@/lib/data/songs";

interface RecommendedSongsProps {
  songs: RecommendedSong[];
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
          <div key={song.slug}>
            <SongCard song={song} />
            {song.reason && (
              <p className="-mt-2 mb-2 pl-0.5 text-xs italic text-stone-400">
                {song.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
