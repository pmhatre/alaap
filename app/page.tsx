import Link from "next/link";
import {
  getHomeStats,
  getFeaturedRagas,
} from "@/lib/data/home";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, featuredRagas] = await Promise.all([
    getHomeStats(),
    getFeaturedRagas(10),
  ]);

  return (
    <div className="py-12">
      {/* Hero */}
      <div className="text-center">
        <h1 className="font-heading text-5xl font-bold tracking-tight text-maroon">
          Alaap
        </h1>
        <p className="mt-4 text-lg text-stone-600">
          Golden era Indian film music — ragas, compositions, and the artists
          who shaped them.
        </p>
      </div>

      {/* Ornamental divider */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <span className="h-px w-16 bg-maroon/25" />
        <span className="text-sm text-maroon/40">&#10043;</span>
        <span className="h-px w-16 bg-maroon/25" />
      </div>

      {/* Stats */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-center">
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
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <BrowseCard
          href="/charts"
          title="Charts"
          description="Binaca Geetmala annual countdown — the golden era hit parade"
        />
      </div>

      {/* Featured ragas */}
      {featuredRagas.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-xl font-semibold text-maroon">Featured Ragas</h2>
          <p className="mt-1 text-sm text-stone-500">
            Most represented ragas in the collection
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {featuredRagas.map((raga) => (
              <Link
                key={raga.slug}
                href={`/ragas/${raga.slug}`}
                className="rounded-lg border border-stone-200 px-3 py-2.5 text-sm transition-colors hover:border-maroon/30 hover:bg-maroon/5"
              >
                <span className="font-medium">{raga.name}</span>
                <span className="ml-1 text-stone-400">
                  ({raga.songCount})
                </span>
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
      <div className="text-sm text-stone-500">{label}</div>
    </div>
  );
}

function StatDivider() {
  return <div className="hidden h-8 w-px bg-maroon/15 sm:block" />;
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
      className="rounded-lg border border-stone-200 p-5 transition-colors hover:border-maroon/30 hover:bg-maroon/5"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </Link>
  );
}
