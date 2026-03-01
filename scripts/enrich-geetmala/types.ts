/** Types for Binaca Geetmala enrichment script */

/** Parsed row from geetmala CSV */
export interface GeetmalaEntry {
  year: number;
  rank: number;
  title: string;
  film: string;
  singers: string;
}

/** Existing song from Neo4j for matching */
export interface ExistingSong {
  slug: string;
  title: string;
  year: number | null;
  filmTitle: string | null;
  geetmala_rank: number | null;
  geetmala_year: number | null;
}

/** Planned enrichment for a single song */
export interface GeetmalaPlan {
  slug: string;
  songTitle: string;
  csvTitle: string;
  matchMethod: "exact" | "normalized" | "title_only" | "prefix" | "manual";
  year: number;
  rank: number;
}

/** Summary report for dry-run output */
export interface GeetmalaReport {
  csvCount: number;
  neo4jCount: number;
  matchedCount: number;
  unmatchedCSV: GeetmalaEntry[];
  conflictEntries: Array<{ entry: GeetmalaEntry; existingSong: ExistingSong }>;
  plans: GeetmalaPlan[];
  methodCounts: Record<string, number>;
  yearCounts: Record<number, number>;
}
