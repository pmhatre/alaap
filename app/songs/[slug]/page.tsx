import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSongBySlug } from "@/lib/data/songs";
import { EntityLink } from "@/app/components/entity-link";
import { YouTubeEmbed } from "@/app/components/youtube-embed";
import { LyricsSection } from "./lyrics-section";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return { title: "Song not found — Alaap" };
  const parts = [song.title];
  if (song.film?.title) parts.push(song.film.title);
  return { title: `${parts.join(" — ")} — Alaap` };
}

export default async function SongPage({ params }: Props) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <h1 className="text-3xl font-bold tracking-tight">{song.title}</h1>
      {song.titleDevanagari && (
        <p className="mt-1 text-lg text-neutral-500">{song.titleDevanagari}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-neutral-600">
        {song.film && (
          <EntityLink
            type="film"
            slug={song.film.slug}
            name={`${song.film.title}${song.year ? ` (${song.year})` : ""}`}
          />
        )}
        {!song.film && song.year && (
          <span className="text-sm text-neutral-500">{song.year}</span>
        )}
      </div>

      {/* Metadata grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {song.singers.length > 0 && (
          <MetadataRow label="Singers">
            <div className="flex flex-wrap gap-1">
              {song.singers.map((s) => (
                <EntityLink key={s.slug} type="artist" slug={s.slug} name={s.name} />
              ))}
            </div>
          </MetadataRow>
        )}
        {song.composer && (
          <MetadataRow label="Composer">
            <EntityLink
              type="artist"
              slug={song.composer.slug}
              name={song.composer.name}
            />
          </MetadataRow>
        )}
        {song.lyricist && (
          <MetadataRow label="Lyricist">
            <EntityLink
              type="artist"
              slug={song.lyricist.slug}
              name={song.lyricist.name}
            />
          </MetadataRow>
        )}
        {song.taal && (
          <MetadataRow label="Taal">
            <span className="text-sm">{song.taal.name}</span>
          </MetadataRow>
        )}
        {song.language && song.language !== "Hindi" && (
          <MetadataRow label="Language">
            <span className="text-sm">{song.language}</span>
          </MetadataRow>
        )}
      </div>

      {/* Ragas */}
      {song.ragas.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Raga
          </h2>
          <div className="mt-2 space-y-2">
            {song.ragas.map((raga) => (
              <div key={raga.slug} className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                <EntityLink type="raga" slug={raga.slug} name={raga.name} />
                {(raga.timeOfDay || raga.rasa) && (
                  <div className="mt-1 flex gap-3 text-xs text-neutral-500">
                    {raga.timeOfDay && <span>Time: {raga.timeOfDay}</span>}
                    {raga.rasa && <span>Rasa: {raga.rasa}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YouTube */}
      {song.youtube_id && (
        <div className="mt-6">
          <YouTubeEmbed youtubeId={song.youtube_id} title={song.title} />
        </div>
      )}

      {/* Notes */}
      {song.notes && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Notes
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">
            {song.notes}
          </p>
        </div>
      )}

      {/* Lyrics */}
      {song.lyrics && <LyricsSection lyrics={song.lyrics} />}
    </div>
  );
}

function MetadataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
