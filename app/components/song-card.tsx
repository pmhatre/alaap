import Link from "next/link";
import { EntityLink } from "./entity-link";
import type { SongListItem } from "@/lib/data/songs";

interface SongCardProps {
  song: SongListItem;
}

export function SongCard({ song }: SongCardProps) {
  return (
    <div className="border-b border-neutral-100 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/songs/${song.slug}`}
            className="font-medium text-neutral-900 hover:text-blue-700"
          >
            {song.title}
          </Link>
          {song.youtube_id && (
            <a
              href={`https://www.youtube.com/watch?v=${song.youtube_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1.5 inline-block text-red-500 hover:text-red-600"
              title="Listen on YouTube"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="inline h-4 w-4">
                <path d="M8 5v14l11-7z" />
              </svg>
            </a>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
            {song.filmTitle && song.filmSlug && (
              <Link
                href={`/films/${song.filmSlug}`}
                className="hover:text-neutral-700"
              >
                {song.filmTitle}
                {song.year ? ` (${song.year})` : ""}
              </Link>
            )}
            {!song.filmTitle && song.year && <span>{song.year}</span>}
            {song.singers.length > 0 && (
              <span>
                {song.singers
                  .filter((s) => s.name)
                  .map((s) => s.name)
                  .join(", ")}
              </span>
            )}
            {song.composerName && song.composerSlug && (
              <EntityLink
                type="artist"
                slug={song.composerSlug}
                name={song.composerName}
              />
            )}
            {song.composerName && !song.composerSlug && (
              <span>{song.composerName}</span>
            )}
          </div>
        </div>
        {song.ragas.length > 0 && (
          <div className="flex flex-shrink-0 flex-wrap gap-1">
            {song.ragas
              .filter((r) => r.name && r.slug)
              .map((raga) => (
                <EntityLink
                  key={raga.slug}
                  type="raga"
                  slug={raga.slug}
                  name={raga.name}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
