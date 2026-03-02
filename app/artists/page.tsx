import type { Metadata } from "next";
import Link from "next/link";
import { read } from "@/lib/neo4j";
import { toNumber, PAGE_SIZE } from "@/lib/data/utils";

export const metadata: Metadata = {
  title: "Artists — Alaap",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

interface ArtistListItem {
  name: string;
  slug: string;
  songCount: number;
  roles: ("singer" | "composer" | "lyricist")[];
}

const roleStyles: Record<string, string> = {
  singer: "bg-blue-50 text-blue-700",
  composer: "bg-amber-50 text-amber-700",
  lyricist: "bg-green-50 text-green-700",
};

export default async function ArtistsPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const neo4j = (await import("neo4j-driver")).default;

  const [artistRows, countRows] = await Promise.all([
    read<Record<string, unknown>>(
      `MATCH (a:Artist)<-[:SUNG_BY|COMPOSED_BY|LYRICS_BY]-(s:Song)
       WITH a, count(DISTINCT s) AS songCount
       OPTIONAL MATCH (s1:Song)-[:SUNG_BY]->(a)
       WITH a, songCount, count(DISTINCT s1) AS sc
       OPTIONAL MATCH (s2:Song)-[:COMPOSED_BY]->(a)
       WITH a, songCount, sc, count(DISTINCT s2) AS cc
       OPTIONAL MATCH (s3:Song)-[:LYRICS_BY]->(a)
       RETURN a.name AS name, a.slug AS slug, songCount,
              sc > 0 AS isSinger, cc > 0 AS isComposer, count(DISTINCT s3) > 0 AS isLyricist
       ORDER BY songCount DESC
       SKIP $skip LIMIT $limit`,
      { skip: neo4j.int(skip), limit: neo4j.int(PAGE_SIZE) },
    ),
    read<Record<string, unknown>>(
      `MATCH (a:Artist)<-[:SUNG_BY|COMPOSED_BY|LYRICS_BY]-(s:Song)
       WITH a, count(DISTINCT s) AS songCount
       WHERE songCount > 0
       RETURN count(a) AS total`,
    ),
  ]);

  const artists: ArtistListItem[] = artistRows.map((r) => {
    const roles: ("singer" | "composer" | "lyricist")[] = [];
    if (r.isSinger) roles.push("singer");
    if (r.isComposer) roles.push("composer");
    if (r.isLyricist) roles.push("lyricist");
    return {
      name: r.name as string,
      slug: r.slug as string,
      songCount: toNumber(r.songCount) ?? 0,
      roles,
    };
  });
  const total = toNumber(countRows[0]?.total) ?? 0;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Artists</h1>
      <p className="mt-2 text-stone-500">
        Singers, composers, and lyricists by number of songs.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => (
          <Link
            key={artist.slug}
            href={`/artists/${artist.slug}`}
            className="flex flex-col gap-1.5 rounded-lg border border-stone-100 px-4 py-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{artist.name}</span>
              <span className="text-sm text-stone-400">
                {artist.songCount} songs
              </span>
            </div>
            <div className="flex gap-1">
              {artist.roles.map((role) => (
                <span
                  key={role}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleStyles[role]}`}
                >
                  {role}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-4 py-6 text-sm">
          {page > 1 ? (
            <Link
              href={page === 2 ? "/artists" : `/artists?page=${page - 1}`}
              className="rounded px-3 py-1.5 text-stone-600 hover:bg-stone-100"
            >
              &larr; Previous
            </Link>
          ) : (
            <span className="rounded px-3 py-1.5 text-stone-300">
              &larr; Previous
            </span>
          )}
          <span className="text-stone-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/artists?page=${page + 1}`}
              className="rounded px-3 py-1.5 text-stone-600 hover:bg-stone-100"
            >
              Next &rarr;
            </Link>
          ) : (
            <span className="rounded px-3 py-1.5 text-stone-300">
              Next &rarr;
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
