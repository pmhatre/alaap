import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRagaBySlug, getRelatedRagas } from "@/lib/data/ragas";
import { getSongsByRaga } from "@/lib/data/songs";
import { SongCard } from "@/app/components/song-card";
import { Pagination } from "@/app/components/pagination";
import { EmptyState } from "@/app/components/empty-state";
import { RelatedRagas } from "@/app/components/related-ragas";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const raga = await getRagaBySlug(slug);
  if (!raga) return { title: "Raga not found — Alaap" };
  return { title: `Raga ${raga.name} — Alaap` };
}

const notationLabels = new Set(["Aroha", "Avaroha", "Pakad"]);

export default async function RagaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);

  const [raga, { songs, total }, relatedRagas] = await Promise.all([
    getRagaBySlug(slug),
    getSongsByRaga(slug, page),
    getRelatedRagas(slug),
  ]);
  if (!raga) notFound();

  const properties = [
    { label: "Thaat", value: raga.thaat },
    { label: "Aroha", value: raga.aroha },
    { label: "Avaroha", value: raga.avaroha },
    { label: "Vadi", value: raga.vadi },
    { label: "Samvadi", value: raga.samvadi },
    { label: "Time of day", value: raga.timeOfDay },
    { label: "Rasa", value: raga.rasa },
    { label: "Pakad", value: raga.pakad },
  ].filter((p) => p.value);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Raga {raga.name}</h1>
      {raga.nameDevanagari && (
        <p className="mt-1 text-lg text-stone-500">{raga.nameDevanagari}</p>
      )}

      {/* Properties */}
      {properties.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-stone-100 bg-stone-50 p-4 sm:grid-cols-3">
          {properties.map(({ label, value }) => (
            <div key={label}>
              <span className="text-xs font-medium uppercase tracking-wide text-stone-400">
                {label}
              </span>
              <p className={`mt-0.5 text-sm text-stone-700${notationLabels.has(label) ? " font-mono tracking-widest" : ""}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {raga.description && (
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-stone-600">
          {raga.description.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      {/* Related ragas */}
      <RelatedRagas ragas={relatedRagas} />

      {/* Song list */}
      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold">
          Songs in {raga.name}{" "}
          <span className="text-sm font-normal text-stone-400">({total})</span>
        </h2>
        {songs.length > 0 ? (
          <div className="mt-4">
            {songs.map((song) => (
              <SongCard key={song.slug} song={song} />
            ))}
            <Pagination
              currentPage={page}
              total={total}
              baseHref={`/ragas/${slug}`}
            />
          </div>
        ) : (
          <EmptyState message="No songs found for this raga." />
        )}
      </div>
    </div>
  );
}
