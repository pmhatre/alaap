import type { Metadata } from "next";
import { getFavorites } from "@/lib/data/favorites";
import { EntityLink } from "@/app/components/entity-link";
import { YouTubeEmbed } from "@/app/components/youtube-embed";

export const metadata: Metadata = {
  title: "Praneet's Favorites — Alaap",
  description:
    "A personal canon of golden era Indian film songs — why these compositions matter and what to listen for.",
};

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const { intro, songs } = await getFavorites();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Hero */}
      <h1 className="font-heading text-3xl font-bold tracking-tight text-maroon">
        Praneet&apos;s Favorites
      </h1>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-600">
        {intro.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {/* Ornamental divider */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <span className="h-px w-16 bg-maroon/25" />
        <span className="text-sm text-maroon/40">&#10043;</span>
        <span className="h-px w-16 bg-maroon/25" />
      </div>

      {/* Song entries */}
      <div className="mt-10 space-y-14">
        {songs.map((entry, i) => (
          <article key={entry.song.slug}>
            {/* Header: rank + title */}
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-maroon/10 font-heading text-sm font-bold text-maroon">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-xl font-semibold">
                  <a
                    href={`/songs/${entry.song.slug}`}
                    className="text-stone-900 hover:text-maroon"
                  >
                    {entry.song.title}
                  </a>
                </h2>

                {/* Metadata: film, year, singers, composer, raga */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {entry.song.film && (
                    <EntityLink
                      type="film"
                      slug={entry.song.film.slug}
                      name={`${entry.song.film.title}${entry.song.year ? ` (${entry.song.year})` : ""}`}
                    />
                  )}
                  {entry.song.singers.map((s) => (
                    <EntityLink
                      key={s.slug}
                      type="artist"
                      slug={s.slug}
                      name={s.name}
                    />
                  ))}
                  {entry.song.composer && (
                    <EntityLink
                      type="artist"
                      slug={entry.song.composer.slug}
                      name={entry.song.composer.name}
                    />
                  )}
                  {entry.song.ragas.map((r) => (
                    <EntityLink
                      key={r.slug}
                      type="raga"
                      slug={r.slug}
                      name={r.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* YouTube embed */}
            {entry.song.youtube_id && (
              <div className="mt-5">
                <YouTubeEmbed
                  youtubeId={entry.song.youtube_id}
                  title={entry.song.title}
                />
              </div>
            )}

            {/* Annotation */}
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-stone-600">
              {entry.annotation.split("\n\n").map((para, j) => (
                <p key={j}>{para}</p>
              ))}
            </div>

            {/* Listen for callout */}
            {entry.listenFor && (
              <div className="mt-4 border-l-2 border-maroon/30 pl-4">
                <p className="text-xs font-medium uppercase tracking-wide text-maroon/70">
                  Listen for
                </p>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">
                  {entry.listenFor}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
