import type { Metadata } from "next";
import Link from "next/link";
import { getAllRagas } from "@/lib/data/ragas";
import { Pagination } from "@/app/components/pagination";

export const metadata: Metadata = {
  title: "Ragas — Alaap",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function RagasPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const { ragas, total } = await getAllRagas(page);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Ragas</h1>
      <p className="mt-2 text-neutral-500">
        Browse ragas by number of songs in the collection.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ragas.map((raga) => (
          <Link
            key={raga.slug}
            href={`/ragas/${raga.slug}`}
            className="flex items-center justify-between rounded-lg border border-neutral-100 px-4 py-3 transition-colors hover:border-amber-200 hover:bg-amber-50/50"
          >
            <span className="font-medium">{raga.name}</span>
            <span className="text-sm text-neutral-400">
              {raga.songCount} songs
            </span>
          </Link>
        ))}
      </div>

      <Pagination currentPage={page} total={total} baseHref="/ragas" />
    </div>
  );
}
