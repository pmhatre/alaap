import type { Metadata } from "next";
import { Suspense } from "react";
import { searchSongs, getFilterOptions } from "@/lib/data/search";
import { SongCard } from "@/app/components/song-card";
import { Pagination } from "@/app/components/pagination";
import { EmptyState } from "@/app/components/empty-state";
import { SearchFilters } from "./search-filters";

export const metadata: Metadata = {
  title: "Search — Alaap",
};

interface Props {
  searchParams: Promise<{
    query?: string;
    raga?: string;
    composer?: string;
    singer?: string;
    decade?: string;
    taal?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);

  const [{ songs, total }, filterOptions] = await Promise.all([
    searchSongs({
      query: params.query,
      raga: params.raga,
      composer: params.composer,
      singer: params.singer,
      decade: params.decade,
      taal: params.taal,
      page,
    }),
    getFilterOptions(),
  ]);

  // Build searchParams for pagination (preserve current filters)
  const paginationParams: Record<string, string> = {};
  if (params.query) paginationParams.query = params.query;
  if (params.raga) paginationParams.raga = params.raga;
  if (params.composer) paginationParams.composer = params.composer;
  if (params.singer) paginationParams.singer = params.singer;
  if (params.decade) paginationParams.decade = params.decade;
  if (params.taal) paginationParams.taal = params.taal;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Search</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {total.toLocaleString()} songs
      </p>

      <div className="mt-6">
        <Suspense fallback={null}>
          <SearchFilters filterOptions={filterOptions} />
        </Suspense>
      </div>

      <div className="mt-6">
        {songs.length > 0 ? (
          <>
            {songs.map((song) => (
              <SongCard key={song.slug} song={song} />
            ))}
            <Pagination
              currentPage={page}
              total={total}
              baseHref="/search"
              searchParams={paginationParams}
            />
          </>
        ) : (
          <EmptyState message="No songs match your search. Try adjusting your filters." />
        )}
      </div>
    </div>
  );
}
