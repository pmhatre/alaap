/**
 * Match Chandrakantha entries to existing Neo4j ragas and build enrichment plans.
 * Reuses matchName() infrastructure from enrich-ragas.
 */

import { read } from "../../lib/neo4j";
import { matchName, normalizeThaat, normalizeTime } from "../enrich-ragas/normalize";
import { normalizeForDedup } from "../dedup/normalize";
import type {
  ChandrakanthaEntry,
  ExistingRaga,
  EnrichmentPlan,
  EnrichmentReport,
} from "./types";

/**
 * Extra manual mappings for Chandrakantha names that don't match via
 * the shared matchName() infrastructure (e.g. Neo4j names with qualifiers).
 */
const CHANDRAKANTHA_MANUAL_MAP: Record<string, string> = {
  "Todi": "Todi (Raga)",
  "Shree": "Shree (Hindustani Raga)",
  "Mian Ki Todi": "Miyan Ki Todi",
  "Kirvani": "Kirwani",
  "Asawari": "Asavari",
  "Khammaj": "Khamaj",
};

/** Fetch existing ragas from Neo4j (including description field) */
async function fetchExistingRagas(): Promise<ExistingRaga[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (r:Raga)
     RETURN r.name AS name, r.slug AS slug,
            r.description AS description,
            r.vadi AS vadi, r.samvadi AS samvadi,
            r.timeOfDay AS timeOfDay,
            r.sources AS sources`,
  );
  return rows.map((r) => ({
    name: r.name as string,
    slug: r.slug as string,
    description: (r.description as string) ?? null,
    vadi: (r.vadi as string) ?? null,
    samvadi: (r.samvadi as string) ?? null,
    timeOfDay: (r.timeOfDay as string) ?? null,
    sources: (r.sources as string[]) ?? null,
  }));
}

/** Chandrakantha time values → human-readable format */
const CHANDRAKANTHA_TIME_MAP: Record<string, string> = {
  "early morning": "Early Morning",
  "early morning or conclusion of performance": "Early Morning",
  "late morning": "Late Morning (9 AM-12 PM)",
  "late night": "Late Night (12-3 AM)",
  "night": "Night (9 PM-12 AM)",
  "evening": "Evening (6-9 PM)",
  "late evening": "Late Evening (6-9 PM)",
  "afternoon": "Afternoon (12-3 PM)",
  "late afternoon": "Afternoon (3-6 PM)",
  "morning": "Morning (6-9 AM)",
  "sunset": "Sunset (3-6 PM)",
  "any time": "Any Time",
  "anytime": "Any Time",
};

function normalizeChandrakanthaTime(raw: string): string {
  if (!raw) return "";
  const key = raw.toLowerCase().trim();
  return CHANDRAKANTHA_TIME_MAP[key] ?? (normalizeTime(raw) || raw);
}

/** Build enrichment plan for a matched raga (only sets null properties) */
function buildPlan(
  entry: ChandrakanthaEntry,
  existing: ExistingRaga,
  method: "exact" | "camelcase" | "manual" | "slug" | "dedup",
): EnrichmentPlan {
  const updates: EnrichmentPlan["updates"] = {};

  if (existing.description === null && entry.description) {
    updates.description = entry.description;
  }
  if (existing.vadi === null && entry.vadi && !/^disputed$/i.test(entry.vadi)) {
    updates.vadi = entry.vadi;
  }
  if (existing.samvadi === null && entry.samvadi && !/^disputed$/i.test(entry.samvadi)) {
    updates.samvadi = entry.samvadi;
  }
  if (existing.timeOfDay === null && entry.time) {
    updates.timeOfDay = normalizeChandrakanthaTime(entry.time);
  }

  const thaat = entry.thaat ? normalizeThaat(entry.thaat) || null : null;

  return {
    slug: existing.slug,
    ragaName: existing.name,
    chandrakanthaName: entry.name,
    matchMethod: method,
    updates,
    thaat,
  };
}

/** Match Chandrakantha entries to Neo4j ragas and build the full enrichment report */
export async function buildEnrichmentReport(
  entries: ChandrakanthaEntry[],
): Promise<EnrichmentReport> {
  console.log("Fetching existing ragas from Neo4j...");
  const existing = await fetchExistingRagas();
  console.log(`Found ${existing.length} ragas in Neo4j`);

  const neo4jNames = existing.map((r) => r.name);
  const neo4jSlugs = new Map(existing.map((r) => [r.name, r.slug]));
  const neo4jByName = new Map(existing.map((r) => [r.name, r]));

  const plans: EnrichmentPlan[] = [];
  const matchedNeo4jNames = new Set<string>();
  const unmatchedChandrakantha: string[] = [];

  for (const entry of entries) {
    // Try shared matchName() first
    let result = matchName(entry.name, neo4jNames, neo4jSlugs);

    // Fallback: Chandrakantha-specific manual mappings
    if (!result) {
      const manualTarget = CHANDRAKANTHA_MANUAL_MAP[entry.name];
      if (manualTarget) {
        const targetNorm = normalizeForDedup(manualTarget);
        const manualMatch = neo4jNames.find(
          (n) => normalizeForDedup(n) === targetNorm,
        );
        if (manualMatch) {
          result = { neo4jName: manualMatch, method: "manual" };
        }
      }
    }

    if (result) {
      matchedNeo4jNames.add(result.neo4jName);
      const existingRaga = neo4jByName.get(result.neo4jName)!;
      const plan = buildPlan(entry, existingRaga, result.method);
      plans.push(plan);
    } else {
      unmatchedChandrakantha.push(entry.name);
    }
  }

  const unmatchedNeo4j = neo4jNames.filter((n) => !matchedNeo4jNames.has(n));

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
    chandrakanthaCount: entries.length,
    neo4jCount: existing.length,
    matchedCount: plans.length,
    enrichedCount: enrichedPlans.length,
    skippedCount,
    unmatchedChandrakantha,
    unmatchedNeo4j,
    plans: enrichedPlans,
    thaatCounts,
  };
}
