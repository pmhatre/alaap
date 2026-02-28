import type { Metadata } from "next";
import Link from "next/link";
import { getAllFilms } from "@/lib/data/films";
import { Pagination } from "@/app/components/pagination";

export const metadata: Metadata = {
  title: "Films — Alaap",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function FilmsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const { films, total } = await getAllFilms(page);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Films</h1>
      <p className="mt-2 text-neutral-500">
        Browse films by number of songs in the collection.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {films.map((film) => (
          <Link
            key={film.slug}
            href={`/films/${film.slug}`}
            className="flex items-center justify-between rounded-lg border border-neutral-100 px-4 py-3 transition-colors hover:border-green-200 hover:bg-green-50/50"
          >
            <div className="min-w-0">
              <span className="font-medium">{film.title}</span>
              {film.year && (
                <span className="ml-1.5 text-sm text-neutral-400">
                  ({film.year})
                </span>
              )}
            </div>
            <span className="flex-shrink-0 text-sm text-neutral-400">
              {film.songCount} songs
            </span>
          </Link>
        ))}
      </div>

      <Pagination currentPage={page} total={total} baseHref="/films" />
    </div>
  );
}
