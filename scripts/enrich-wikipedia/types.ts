/** Types for Wikipedia raga enrichment script */

/** Parsed data from a Wikipedia Infobox raga */
export interface WikipediaInfobox {
  name: string; // raga name from the infobox
  articleTitle: string; // Wikipedia article title
  arohana: string;
  avarohana: string;
  vadi: string;
  samavadi: string;
  pakad: string;
  time: string;
  thaat: string;
}

/** Existing raga from Neo4j */
export interface ExistingRaga {
  name: string;
  slug: string;
  aroha: string | null;
  avaroha: string | null;
  vadi: string | null;
  samvadi: string | null;
  timeOfDay: string | null;
  pakad: string | null;
  description: string | null;
  sources: string[] | null;
}

/** Planned enrichment for a single raga */
export interface EnrichmentPlan {
  slug: string;
  ragaName: string;
  wikipediaName: string;
  matchMethod: string;
  updates: Partial<{
    aroha: string;
    avaroha: string;
    vadi: string;
    samvadi: string;
    timeOfDay: string;
    pakad: string;
  }>;
  thaat: string | null;
}

/** Summary report for dry-run output */
export interface EnrichmentReport {
  articlesFound: number;
  neo4jCount: number;
  matchedCount: number;
  enrichedCount: number;
  skippedCount: number;
  unmatchedNeo4j: string[];
  plans: EnrichmentPlan[];
  thaatCounts: Record<string, number>;
}
