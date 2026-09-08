import Link from "next/link";
import type { Metadata } from "next";
import { getSingerLeaderboards, type ChartBucket } from "@/lib/data/charts";

export const metadata: Metadata = {
  title: "Most-Charted Singers — Alaap",
  description:
    "Which playback singers appeared most often on the Binaca Geetmala countdown, decade by decade",
};

export const dynamic = "force-dynamic";

const TOP_PER_DECADE = 8;

export default async function ChartedSingersPage() {
  const { overall, decades } = await getSingerLeaderboards(TOP_PER_DECADE);

  if (overall.totalSongs === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-maroon">
          Most-Charted Singers
        </h1>
        <p className="mt-4 text-stone-500">No chart data available yet.</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <p className="text-sm text-stone-500">
        <Link href="/charts" className="hover:text-maroon">
          ← Binaca Geetmala Charts
        </Link>
      </p>

      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-maroon">
        Most-Charted Singers
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
        Every Geetmala entry from {overall.startYear} to {overall.endYear},
        counted by singer. A duet counts for both singers, so a bar shows the
        share of that period&apos;s charted songs a singer appears on.
      </p>

      <Leaderboard bucket={overall} showRank />

      {/* Ornamental divider */}
      <div className="mt-12 flex items-center justify-center gap-3">
        <span className="h-px w-16 bg-maroon/25" />
        <span className="text-sm text-maroon/40">&#10043;</span>
        <span className="h-px w-16 bg-maroon/25" />
      </div>

      <h2 className="mt-10 font-heading text-xl font-semibold text-stone-800">
        Decade by decade
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        The countdown outlasted most of the voices on it. Each decade is scaled
        to its own song count.
      </p>

      <div className="mt-2">
        {decades.map((bucket) => (
          <Leaderboard key={bucket.label} bucket={bucket} />
        ))}
      </div>

      <p className="mt-12 border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-400">
        Counts come from the Geetmala chart data, not from the full song
        catalogue — a singer&apos;s chart tally is a measure of popular reach in
        a given year, and says nothing about how much they recorded. Full annual
        charts ran 1953–1993; only the year&apos;s #1 is documented after that,
        so later years contribute one entry each.
      </p>
    </div>
  );
}

function Leaderboard({
  bucket,
  showRank = false,
}: {
  bucket: ChartBucket;
  showRank?: boolean;
}) {
  const { label, startYear, endYear, totalSongs, topperOnlyYears, singers } =
    bucket;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-stone-100 pb-2">
        <h3 className="font-heading text-lg font-semibold text-stone-800">
          {label}
        </h3>
        <span className="text-sm text-stone-500">
          {startYear}–{endYear}
        </span>
        <span className="text-sm text-stone-400">
          {totalSongs.toLocaleString()} charted songs
        </span>
      </div>

      {topperOnlyYears.length > 0 && (
        <p className="mt-2 text-xs italic text-stone-400">
          {topperOnlyYears[0]}–{topperOnlyYears[topperOnlyYears.length - 1]}:
          only the year&apos;s #1 is documented.
        </p>
      )}

      <ol className="mt-3 space-y-1">
        {singers.map((singer, i) => {
          const share = singer.songs / totalSongs;
          return (
            <li
              key={singer.name}
              className="grid grid-cols-[1.25rem_1fr] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 transition-colors hover:bg-maroon/5 sm:grid-cols-[1.25rem_10.5rem_minmax(0,20rem)_auto]"
            >
              <span className="text-right text-xs tabular-nums text-stone-400">
                {showRank ? i + 1 : ""}
              </span>

              <span className="min-w-0 truncate text-sm">
                {singer.slug ? (
                  <Link
                    href={`/artists/${singer.slug}`}
                    className="font-medium text-stone-900 hover:text-maroon"
                  >
                    {singer.name}
                  </Link>
                ) : (
                  <span className="font-medium text-stone-900">
                    {singer.name}
                  </span>
                )}
              </span>

              {/* Bar track spans the period's full song count, so the fill
                  reads as a share and stays comparable between decades. */}
              <span
                className="col-span-2 block h-2 w-full max-w-[20rem] overflow-hidden rounded-sm bg-stone-100 sm:col-span-1"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-r-[4px] bg-maroon/70"
                  style={{ width: `${Math.max(share * 100, 1)}%` }}
                />
              </span>

              {/* Fixed-width slots so the columns stay aligned down the list
                  even though most rows have no number-one finishes. */}
              <span className="col-span-2 flex items-baseline gap-2 text-xs sm:col-span-1">
                <span className="w-8 text-right tabular-nums text-stone-700">
                  {singer.songs}
                </span>
                <span className="w-8 text-right tabular-nums text-stone-400">
                  {Math.round(share * 100)}%
                </span>
                <span
                  className="w-12 text-right tabular-nums text-maroon/70"
                  title={
                    singer.toppers > 0
                      ? `${singer.toppers} number-one ${
                          singer.toppers === 1 ? "finish" : "finishes"
                        }`
                      : undefined
                  }
                >
                  {singer.toppers > 0 ? `${singer.toppers}×#1` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
