/** Types for ragaDB enrichment script */

/** Raw entry from ragaDB JSON (key = raga name, value = this object) */
export interface RagaDBEntry {
  name: string; // derived from the JSON key
  aaroha: string[];
  avaroha: string[];
  vadi: string;
  samvadi: string;
  thaat: string;
  time: string;
  pakad: string[];
  jati: string; // skipped — not in our Raga type
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
  sources: string[] | null;
}

/** Planned enrichment for a single raga */
export interface EnrichmentPlan {
  slug: string;
  ragaName: string;
  ragaDBName: string;
  matchMethod: "exact" | "camelcase" | "manual" | "slug" | "dedup";
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
  ragaDBCount: number;
  neo4jCount: number;
  matchedCount: number;
  enrichedCount: number; // matched ragas that actually have properties to set
  skippedCount: number; // matched but all properties already populated
  unmatchedRagaDB: string[];
  unmatchedNeo4j: string[];
  plans: EnrichmentPlan[];
  thaatCounts: Record<string, number>;
}
