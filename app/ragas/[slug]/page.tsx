import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRagaBySlug } from "@/lib/data/ragas";
import { getSongsByRaga } from "@/lib/data/songs";
import { SongCard } from "@/app/components/song-card";
import { Pagination } from "@/app/components/pagination";
import { EmptyState } from "@/app/components/empty-state";

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

export default async function RagaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);

  const raga = await getRagaBySlug(slug);
  if (!raga) notFound();

  const { songs, total } = await getSongsByRaga(slug, page);

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
      <h1 className="text-3xl font-bold tracking-tight">Raga {raga.name}</h1>
      {raga.nameDevanagari && (
        <p className="mt-1 text-lg text-neutral-500">{raga.nameDevanagari}</p>
      )}

      {/* Properties */}
      {properties.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-4 sm:grid-cols-3">
          {properties.map(({ label, value }) => (
            <div key={label}>
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                {label}
              </span>
              <p className="mt-0.5 text-sm text-neutral-700">{value}</p>
            </div>
          ))}
        </div>
      )}

      {raga.description && (
        <p className="mt-4 text-sm leading-relaxed text-neutral-600">
          {raga.description}
        </p>
      )}

      {/* Song list */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">
          Songs in {raga.name}{" "}
          <span className="text-sm font-normal text-neutral-400">({total})</span>
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
