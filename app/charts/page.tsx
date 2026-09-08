import Link from "next/link";
import type { Metadata } from "next";
import { getChartByYear, getChartYears } from "@/lib/data/charts";

export const metadata: Metadata = {
  title: "Binaca Geetmala Charts — Alaap",
  description: "Annual Hindi film song charts from the Binaca Geetmala countdown (Radio Ceylon)",
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ year?: string }>;
}

export default async function ChartsPage({ searchParams }: Props) {
  const { year: yearParam } = await searchParams;
  const years = getChartYears();

  if (years.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-maroon">
          Binaca Geetmala Charts
        </h1>
        <p className="mt-4 text-stone-500">
          No chart data available yet. Run the enrichment script to populate.
        </p>
      </div>
    );
  }

  const selectedYear = yearParam ? parseInt(yearParam, 10) : years[years.length - 1];
  const fullChart = await getChartByYear(selectedYear);
  const chart = fullChart.filter((e) => e.rank <= 10);

  return (
    <div className="py-8">
      <h1 className="font-heading text-3xl font-bold tracking-tight text-maroon">
        Binaca Geetmala Charts
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Top 10 most popular Hindi film songs each year, as voted by listeners.
      </p>
      <p className="mt-3 text-sm">
        <Link
          href="/charts/singers"
          className="text-maroon underline underline-offset-2 hover:text-maroon/80"
        >
          Most-charted singers, decade by decade
        </Link>
      </p>

      {/* Year selector */}
      <div className="mt-6 flex flex-wrap gap-2">
        {years.map((y) => (
          <Link
            key={y}
            href={`/charts?year=${y}`}
            className={
              y === selectedYear
                ? "rounded-md bg-maroon px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 hover:border-maroon/30 hover:text-maroon"
            }
          >
            {y}
          </Link>
        ))}
      </div>

      {/* Chart list */}
      {chart.length > 0 ? (
        <>
          {selectedYear >= 1994 && (
            <p className="mt-8 text-sm italic text-stone-400">
              Only the #1 topper is documented for years after 1993.
            </p>
          )}
          <ol className={`${selectedYear >= 1994 ? "mt-3" : "mt-8"} space-y-1`}>
            {chart.map((entry, i) => (
              <li
                key={`${entry.rank}-${i}`}
                className="flex items-start gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-maroon/5"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-maroon/10 font-heading text-sm font-bold text-maroon">
                  {entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  {entry.slug ? (
                    <Link
                      href={`/songs/${entry.slug}`}
                      className="font-medium text-stone-900 hover:text-maroon"
                    >
                      {entry.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-stone-900">{entry.title}</span>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                    {entry.filmSlug ? (
                      <Link
                        href={`/films/${entry.filmSlug}`}
                        className="text-green-700 hover:text-green-800"
                      >
                        {entry.filmTitle}
                      </Link>
                    ) : (
                      <span>{entry.filmTitle}</span>
                    )}
                    <span>{entry.singers}</span>
                    {entry.composerName && (
                      <span className="text-stone-400">{entry.composerName}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="mt-8 text-stone-500">No chart data for {selectedYear}.</p>
      )}

      {/* Attribution */}
      <p className="mt-10 border-t border-stone-100 pt-4 text-xs text-stone-400">
        Binaca Geetmala was broadcast on Radio Ceylon (1952–1988) and later
        Vividh Bharati (1989–1994), hosted by Ameen Sayani. Full annual charts
        ran 1953–1993; toppers documented through 2000. Rankings based on
        listener votes and postcards.
      </p>
    </div>
  );
}
