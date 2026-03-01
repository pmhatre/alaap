/** Types for Chandrakantha enrichment script */

/** Parsed entry from a Chandrakantha raga page */
export interface ChandrakanthaEntry {
  name: string; // raga name from the page heading
  url: string; // source URL
  description: string; // rich scholarly paragraphs
  thaat: string;
  vadi: string;
  samvadi: string;
  time: string;
}

/** Existing raga from Neo4j */
export interface ExistingRaga {
  name: string;
  slug: string;
  description: string | null;
  vadi: string | null;
  samvadi: string | null;
  timeOfDay: string | null;
  sources: string[] | null;
}

/** Planned enrichment for a single raga */
export interface EnrichmentPlan {
  slug: string;
  ragaName: string;
  chandrakanthaName: string;
  matchMethod: "exact" | "camelcase" | "manual" | "slug" | "dedup";
  updates: Partial<{
    description: string;
    vadi: string;
    samvadi: string;
    timeOfDay: string;
  }>;
  thaat: string | null;
}

/** Summary report for dry-run output */
export interface EnrichmentReport {
  chandrakanthaCount: number;
  neo4jCount: number;
  matchedCount: number;
  enrichedCount: number;
  skippedCount: number;
  unmatchedChandrakantha: string[];
  unmatchedNeo4j: string[];
  plans: EnrichmentPlan[];
  thaatCounts: Record<string, number>;
}
