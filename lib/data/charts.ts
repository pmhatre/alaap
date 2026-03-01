import { readFileSync } from "fs";
import { resolve } from "path";
import { read } from "@/lib/neo4j";
import { toNumber } from "./utils";

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

/** Parse the geetmala CSV (inline to avoid cross-boundary imports) */
function parseCSV(): CSVEntry[] {
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
  return entries;
}

function neo4jInt(n: number) {
  const neo4j = require("neo4j-driver").default;
  return neo4j.int(n);
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
