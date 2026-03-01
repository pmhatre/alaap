import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFilmBySlug } from "@/lib/data/films";
import { getSongsByFilm } from "@/lib/data/songs";
import { SongCard } from "@/app/components/song-card";
import { EmptyState } from "@/app/components/empty-state";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const film = await getFilmBySlug(slug);
  if (!film) return { title: "Film not found — Alaap" };
  return {
    title: `${film.title}${film.year ? ` (${film.year})` : ""} — Alaap`,
  };
}

export default async function FilmPage({ params }: Props) {
  const { slug } = await params;
  const film = await getFilmBySlug(slug);
  if (!film) notFound();

  const songs = await getSongsByFilm(slug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold tracking-tight">{film.title}</h1>
      {film.titleDevanagari && (
        <p className="mt-1 text-lg text-stone-500">
          {film.titleDevanagari}
        </p>
      )}
      {film.year && (
        <p className="mt-1 text-sm text-stone-500">{film.year}</p>
      )}
      {film.language && (
        <p className="mt-1 text-sm text-stone-500">{film.language}</p>
      )}

      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold">
          Songs{" "}
          <span className="text-sm font-normal text-stone-400">
            ({songs.length})
          </span>
        </h2>
        {songs.length > 0 ? (
          <div className="mt-4">
            {songs.map((song) => (
              <SongCard key={song.slug} song={song} />
            ))}
          </div>
        ) : (
          <EmptyState message="No songs found for this film." />
        )}
      </div>
    </div>
  );
}
