/**
 * Match ragaDB entries to existing Neo4j ragas and build enrichment plans.
 * Only matches existing ragas — does NOT create new Raga nodes.
 */

import { read } from "../../lib/neo4j";
import type { RagaDBEntry, ExistingRaga, EnrichmentPlan, EnrichmentReport } from "./types";
import { matchName, formatNotes, normalizeTime, normalizeThaat } from "./normalize";

/** Fetch all existing ragas from Neo4j */
async function fetchExistingRagas(): Promise<ExistingRaga[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (r:Raga)
     RETURN r.name AS name, r.slug AS slug,
            r.aroha AS aroha, r.avaroha AS avaroha,
            r.vadi AS vadi, r.samvadi AS samvadi,
            r.timeOfDay AS timeOfDay, r.pakad AS pakad,
            r.sources AS sources`,
  );
  return rows.map((r) => ({
    name: r.name as string,
    slug: r.slug as string,
    aroha: (r.aroha as string) ?? null,
    avaroha: (r.avaroha as string) ?? null,
    vadi: (r.vadi as string) ?? null,
    samvadi: (r.samvadi as string) ?? null,
    timeOfDay: (r.timeOfDay as string) ?? null,
    pakad: (r.pakad as string) ?? null,
    sources: (r.sources as string[]) ?? null,
  }));
}

/** Build enrichment plan for a matched raga (only sets null properties) */
function buildPlan(
  entry: RagaDBEntry,
  existing: ExistingRaga,
  method: "exact" | "camelcase" | "manual" | "slug" | "dedup",
): EnrichmentPlan {
  const updates: EnrichmentPlan["updates"] = {};

  const aroha = formatNotes(entry.aaroha);
  const avaroha = formatNotes(entry.avaroha);
  const vadi = entry.vadi || "";
  const samvadi = entry.samvadi || "";
  const timeOfDay = normalizeTime(entry.time);
  const pakad = formatNotes(entry.pakad);

  // Only set properties that are currently null in Neo4j
  if (existing.aroha === null && aroha) updates.aroha = aroha;
  if (existing.avaroha === null && avaroha) updates.avaroha = avaroha;
  if (existing.vadi === null && vadi) updates.vadi = vadi;
  if (existing.samvadi === null && samvadi) updates.samvadi = samvadi;
  if (existing.timeOfDay === null && timeOfDay) updates.timeOfDay = timeOfDay;
  if (existing.pakad === null && pakad) updates.pakad = pakad;

  const thaat = normalizeThaat(entry.thaat) || null;

  return {
    slug: existing.slug,
    ragaName: existing.name,
    ragaDBName: entry.name,
    matchMethod: method,
    updates,
    thaat,
  };
}

/** Match ragaDB entries to Neo4j ragas and build the full enrichment report */
export async function buildEnrichmentReport(
  entries: RagaDBEntry[],
): Promise<EnrichmentReport> {
  console.log("Fetching existing ragas from Neo4j...");
  const existing = await fetchExistingRagas();
  console.log(`Found ${existing.length} ragas in Neo4j`);

  // Build lookup structures
  const neo4jNames = existing.map((r) => r.name);
  const neo4jSlugs = new Map(existing.map((r) => [r.name, r.slug]));
  const neo4jByName = new Map(existing.map((r) => [r.name, r]));

  const plans: EnrichmentPlan[] = [];
  const matchedNeo4jNames = new Set<string>();
  const unmatchedRagaDB: string[] = [];

  for (const entry of entries) {
    const result = matchName(entry.name, neo4jNames, neo4jSlugs);

    if (result) {
      matchedNeo4jNames.add(result.neo4jName);
      const existingRaga = neo4jByName.get(result.neo4jName)!;
      const plan = buildPlan(entry, existingRaga, result.method);
      plans.push(plan);
    } else {
      unmatchedRagaDB.push(entry.name);
    }
  }

  // Neo4j ragas with no ragaDB match
  const unmatchedNeo4j = neo4jNames.filter((n) => !matchedNeo4jNames.has(n));

  // Count thaats
  const thaatCounts: Record<string, number> = {};
  for (const plan of plans) {
    if (plan.thaat) {
      thaatCounts[plan.thaat] = (thaatCounts[plan.thaat] || 0) + 1;
    }
  }

  const enrichedPlans = plans.filter(
    (p) => Object.keys(p.updates).length > 0 || p.thaat,
  );
  const skippedCount = plans.length - enrichedPlans.length;

  return {
    ragaDBCount: entries.length,
    neo4jCount: existing.length,
    matchedCount: plans.length,
    enrichedCount: enrichedPlans.length,
    skippedCount,
    unmatchedRagaDB,
    unmatchedNeo4j,
    plans: enrichedPlans,
    thaatCounts,
  };
}
