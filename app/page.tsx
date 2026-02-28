import Link from "next/link";
import {
  getHomeStats,
  getFeaturedRagas,
  getRecentlyAddedSongs,
} from "@/lib/data/home";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, featuredRagas, recentSongs] = await Promise.all([
    getHomeStats(),
    getFeaturedRagas(10),
    getRecentlyAddedSongs(10),
  ]);

  return (
    <div className="py-12">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Alaap</h1>
        <p className="mt-4 text-lg text-neutral-600">
          Golden era Indian film music — ragas, compositions, and the artists
          who shaped them.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-center">
        <StatItem label="Songs" value={stats.songs} />
        <StatDivider />
        <StatItem label="Ragas" value={stats.ragas} />
        <StatDivider />
        <StatItem label="Artists" value={stats.artists} />
        <StatDivider />
        <StatItem label="Films" value={stats.films} />
        <StatDivider />
        <StatItem label="Taals" value={stats.taals} />
      </div>

      {/* Browse cards */}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BrowseCard
          href="/search"
          title="Search"
          description="Find songs by title, raga, composer, singer, or decade"
        />
        <BrowseCard
          href="/ragas"
          title="Ragas"
          description="Browse the melodic frameworks behind the compositions"
        />
        <BrowseCard
          href="/artists"
          title="Artists"
          description="Singers, composers, and lyricists of the golden era"
        />
      </div>

      {/* Featured ragas */}
      {featuredRagas.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">Featured Ragas</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Most represented ragas in the collection
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {featuredRagas.map((raga) => (
              <Link
                key={raga.slug}
                href={`/ragas/${raga.slug}`}
                className="rounded-lg border border-neutral-100 px-3 py-2.5 text-sm transition-colors hover:border-amber-200 hover:bg-amber-50/50"
              >
                <span className="font-medium">{raga.name}</span>
                <span className="ml-1 text-neutral-400">
                  ({raga.songCount})
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent songs */}
      {recentSongs.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">Well-Documented Songs</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Songs with the most cross-referenced data across sources
          </p>
          <div className="mt-4 space-y-1">
            {recentSongs.map((song) => (
              <Link
                key={song.slug}
                href={`/songs/${song.slug}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-neutral-50"
              >
                <span>
                  <span className="font-medium">{song.title}</span>
                  {song.filmTitle && (
                    <span className="ml-2 text-neutral-400">
                      {song.filmTitle}
                      {song.year ? ` (${song.year})` : ""}
                    </span>
                  )}
                </span>
                {song.composerName && (
                  <span className="text-xs text-neutral-400">
                    {song.composerName}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-sm text-neutral-500">{label}</div>
    </div>
  );
}

function StatDivider() {
  return <div className="hidden h-8 w-px bg-neutral-200 sm:block" />;
}

function BrowseCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-neutral-200 p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
    </Link>
  );
}
