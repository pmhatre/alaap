import { readFileSync } from "fs";
import { resolve } from "path";
import { read } from "@/lib/neo4j";
import { neo4jInt, toNumber } from "./utils";

export interface ChartEntry {
  rank: number;
  title: string;
  slug?: string;
  filmTitle: string;
  filmSlug?: string;
  singers: string;
  composerName?: string;
}

const CSV_PATH = resolve(process.cwd(), "pipeline/data/geetmala.csv");

interface CSVEntry {
  year: number;
  rank: number;
  title: string;
  film: string;
  singers: string;
}

let csvCache: CSVEntry[] | null = null;

/** Parse the geetmala CSV (inline to avoid cross-boundary imports) */
function parseCSV(): CSVEntry[] {
  if (csvCache) return csvCache;
  const content = readFileSync(CSV_PATH, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const entries: CSVEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    fields.push(current.trim());
    if (fields.length < 5) continue;
    const year = parseInt(fields[0], 10);
    const rank = parseInt(fields[1], 10);
    if (isNaN(year) || isNaN(rank)) continue;
    entries.push({ year, rank, title: fields[2], film: fields[3], singers: fields[4] });
  }
  csvCache = entries;
  return entries;
}

/** Neo4j match data for a charted song */
interface MatchedSong {
  slug: string;
  filmSlug?: string;
  composerName?: string;
}

/**
 * Get chart entries for a specific year.
 * Source of truth for the full list is the CSV.
 * Neo4j provides slugs and enriched metadata for matched songs.
 */
export async function getChartByYear(year: number): Promise<ChartEntry[]> {
  const allCSV = parseCSV();
  const yearEntries = allCSV.filter((e) => e.year === year);
  if (yearEntries.length === 0) return [];

  const rows = await read<Record<string, unknown>>(
    `MATCH (s:Song {geetmala_year: $year})
     OPTIONAL MATCH (s)-[:FROM_FILM]->(f:Film)
     OPTIONAL MATCH (s)-[:COMPOSED_BY]->(composer:Artist)
     RETURN s.geetmala_rank AS rank, s.slug AS slug,
            head(collect(DISTINCT f.slug)) AS filmSlug,
            head(collect(DISTINCT composer.name)) AS composerName
     ORDER BY s.geetmala_rank ASC`,
    { year: neo4jInt(year) },
  );

  const matchByRank = new Map<number, MatchedSong>();
  for (const r of rows) {
    const rank = toNumber(r.rank);
    if (rank == null) continue;
    matchByRank.set(rank, {
      slug: r.slug as string,
      filmSlug: (r.filmSlug as string) ?? undefined,
      composerName: (r.composerName as string) ?? undefined,
    });
  }

  return yearEntries
    .sort((a, b) => a.rank - b.rank)
    .map((csv) => {
      const match = matchByRank.get(csv.rank);
      return {
        rank: csv.rank,
        title: csv.title,
        slug: match?.slug,
        filmTitle: csv.film,
        filmSlug: match?.filmSlug,
        singers: csv.singers,
        composerName: match?.composerName,
      };
    });
}

/** Get all years in the CSV, ascending */
export function getChartYears(): number[] {
  const allCSV = parseCSV();
  const years = [...new Set(allCSV.map((e) => e.year))].sort((a, b) => a - b);
  return years;
}

/** Get total count of charted songs */
export function getGeetmalaCount(): number {
  return parseCSV().length;
}

/**
 * Chart appearances per singer, bucketed by decade.
 *
 * A duet counts once for each singer, so the tallies are "charted songs this
 * singer appears on" and can sum to more than the number of songs in the
 * bucket. Shares are therefore computed against the bucket's song count, not
 * against the sum of the tallies.
 */
export interface SingerTally {
  name: string;
  slug?: string;
  songs: number;
  toppers: number;
}

export interface ChartBucket {
  label: string;
  startYear: number;
  endYear: number;
  /** Chart rows in this bucket — the denominator for a singer's share. */
  totalSongs: number;
  /** Years in this bucket where only the #1 song is documented. */
  topperOnlyYears: number[];
  singers: SingerTally[];
}

export interface SingerLeaderboards {
  overall: ChartBucket;
  decades: ChartBucket[];
}

/** First year for which only the chart topper is documented. */
const TOPPER_ONLY_FROM = 1994;

/**
 * A decade needs this many charted songs before a leaderboard means anything.
 * The 2000s hold a single documented topper, which would otherwise render as a
 * two-way tie at 100%. Those songs still count toward the all-years bucket.
 */
const MIN_DECADE_SONGS = 10;

/**
 * Singer names that appear in the chart data in a different form than on the
 * Artist node, kept explicit because the set is small, hand-verified, and only
 * changes when the CSV does. Unmapped misses render as plain text, so a wrong
 * guess here would be worse than no entry.
 */
const SINGER_ALIASES: Record<string, string> = {
  "S.P. Balasubrahmanyam": "S P Balasubrahmanyam",
  "S. Janaki": "S Janaki",
  "P. Susheela": "P.Susheela",
  "S.D. Burman": "S. D. Burman",
  Yesudas: "K.J. Yesudas",
  "Bhupinder Singh": "Bhupinder",
  "Sudesh Bhonsle": "Sudesh Bhosle",
};

/** Split a chart row's singer field into individual names. */
function splitSingers(field: string): string[] {
  return field
    .split(";")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}

function buildBucket(
  label: string,
  entries: CSVEntry[],
  slugByName: Map<string, string>,
  limit: number,
): ChartBucket {
  const tallies = new Map<string, SingerTally>();
  for (const entry of entries) {
    for (const name of splitSingers(entry.singers)) {
      const tally = tallies.get(name) ?? {
        name,
        slug: slugByName.get(SINGER_ALIASES[name] ?? name),
        songs: 0,
        toppers: 0,
      };
      tally.songs += 1;
      if (entry.rank === 1) tally.toppers += 1;
      tallies.set(name, tally);
    }
  }

  const years = entries.map((e) => e.year);
  const topperOnlyYears = [
    ...new Set(years.filter((y) => y >= TOPPER_ONLY_FROM)),
  ].sort((a, b) => a - b);

  return {
    label,
    startYear: Math.min(...years),
    endYear: Math.max(...years),
    totalSongs: entries.length,
    topperOnlyYears,
    singers: [...tallies.values()]
      .sort(
        (a, b) =>
          b.songs - a.songs || b.toppers - a.toppers || a.name.localeCompare(b.name),
      )
      .slice(0, limit),
  };
}

/**
 * Most-charted singers overall and by decade.
 * The CSV is the source of truth for the tallies; Neo4j supplies artist slugs
 * so a singer can link through to their profile.
 */
export async function getSingerLeaderboards(
  limit = 10,
): Promise<SingerLeaderboards> {
  const entries = parseCSV();
  if (entries.length === 0) {
    const empty: ChartBucket = {
      label: "All years",
      startYear: 0,
      endYear: 0,
      totalSongs: 0,
      topperOnlyYears: [],
      singers: [],
    };
    return { overall: empty, decades: [] };
  }

  const names = new Set<string>();
  for (const entry of entries) {
    for (const name of splitSingers(entry.singers)) {
      names.add(SINGER_ALIASES[name] ?? name);
    }
  }

  const rows = await read<{ name: string; slug: string }>(
    `MATCH (a:Artist) WHERE a.name IN $names RETURN a.name AS name, a.slug AS slug`,
    { names: [...names] },
  );
  const slugByName = new Map<string, string>();
  for (const row of rows) {
    if (row.name && row.slug) slugByName.set(row.name, row.slug);
  }

  const byDecade = new Map<number, CSVEntry[]>();
  for (const entry of entries) {
    const decade = Math.floor(entry.year / 10) * 10;
    const bucket = byDecade.get(decade) ?? [];
    bucket.push(entry);
    byDecade.set(decade, bucket);
  }

  const overall = buildBucket(
    "All years",
    entries,
    slugByName,
    Math.max(limit, 15),
  );
  const decades = [...byDecade.entries()]
    .sort((a, b) => a[0] - b[0])
    .filter(([, decadeEntries]) => decadeEntries.length >= MIN_DECADE_SONGS)
    .map(([decade, decadeEntries]) =>
      buildBucket(`${decade}s`, decadeEntries, slugByName, limit),
    );

  return { overall, decades };
}
