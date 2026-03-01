/**
 * Match Wikipedia infobox data to existing Neo4j ragas and build enrichment plans.
 *
 * Unlike Chandrakantha (which iterates source entries and matches to Neo4j),
 * this script iterates Neo4j ragas and looks up their Wikipedia articles.
 * This inverted approach ensures we only fetch articles for ragas we care about.
 */

import { read } from "../../lib/neo4j";
import { normalizeThaat } from "../enrich-ragas/normalize";
import { fetchAllArticles, type FetchResult } from "./fetch";
import { parseInfobox } from "./parse";
import type {
  ExistingRaga,
  WikipediaInfobox,
  EnrichmentPlan,
  EnrichmentReport,
} from "./types";

/** Fetch existing ragas from Neo4j */
async function fetchExistingRagas(): Promise<ExistingRaga[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (r:Raga)
     RETURN r.name AS name, r.slug AS slug,
            r.aroha AS aroha, r.avaroha AS avaroha,
            r.vadi AS vadi, r.samvadi AS samvadi,
            r.timeOfDay AS timeOfDay, r.pakad AS pakad,
            r.description AS description,
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
    description: (r.description as string) ?? null,
    sources: (r.sources as string[]) ?? null,
  }));
}

/** Wikipedia time values → human-readable format */
const WIKIPEDIA_TIME_MAP: Record<string, string> = {
  "1st part of the night": "Evening (6-9 PM)",
  "1st prahar of the night": "Evening (6-9 PM)",
  "2nd prahar of the night": "Night (9 PM-12 AM)",
  "3rd prahar of the night": "Late Night (12-3 AM)",
  "4th prahar of the night": "Early Morning (3-6 AM)",
  "1st prahar of the day": "Morning (6-9 AM)",
  "2nd prahar of the day": "Late Morning (9 AM-12 PM)",
  "3rd prahar of the day": "Afternoon (12-3 PM)",
  "4th prahar of the day": "Afternoon (3-6 PM)",
  "late night": "Late Night (12-3 AM)",
  "late night, 12–3": "Late Night (12-3 AM)",
  "late night, 12-3": "Late Night (12-3 AM)",
  "night": "Night (9 PM-12 AM)",
  "evening": "Evening (6-9 PM)",
  "late evening": "Late Evening (6-9 PM)",
  "morning": "Morning (6-9 AM)",
  "early morning": "Early Morning (3-6 AM)",
  "morning; conclusion of a concert": "Early Morning",
  "afternoon": "Afternoon (12-3 PM)",
  "sunset": "Sunset (3-6 PM)",
  "any time": "Any Time",
  "anytime": "Any Time",
  "midnight": "Midnight",
  "before sunrise": "Before Sunrise (3-6 AM)",
};

function normalizeWikipediaTime(raw: string): string {
  if (!raw) return "";
  const key = raw.toLowerCase().trim();
  return WIKIPEDIA_TIME_MAP[key] ?? raw;
}

/** Build enrichment plan for a matched raga (only sets null properties) */
function buildPlan(
  infobox: WikipediaInfobox,
  existing: ExistingRaga,
  method: string,
): EnrichmentPlan {
  const updates: EnrichmentPlan["updates"] = {};

  if (existing.aroha === null && infobox.arohana) {
    updates.aroha = infobox.arohana;
  }
  if (existing.avaroha === null && infobox.avarohana) {
    updates.avaroha = infobox.avarohana;
  }
  if (existing.vadi === null && infobox.vadi) {
    updates.vadi = infobox.vadi;
  }
  if (existing.samvadi === null && infobox.samavadi) {
    updates.samvadi = infobox.samavadi;
  }
  if (existing.timeOfDay === null && infobox.time) {
    updates.timeOfDay = normalizeWikipediaTime(infobox.time);
  }
  if (existing.pakad === null && infobox.pakad) {
    updates.pakad = infobox.pakad;
  }

  const thaat = infobox.thaat ? normalizeThaat(infobox.thaat) || null : null;

  return {
    slug: existing.slug,
    ragaName: existing.name,
    wikipediaName: infobox.name,
    matchMethod: method,
    updates,
    thaat,
  };
}

/**
 * Fetch Wikipedia articles for all Neo4j ragas and build the enrichment report.
 * Inverted approach: iterate Neo4j ragas → look up Wikipedia.
 */
export async function buildEnrichmentReport(): Promise<EnrichmentReport> {
  console.log("Fetching existing ragas from Neo4j...");
  const existing = await fetchExistingRagas();
  console.log(`Found ${existing.length} ragas in Neo4j`);

  // Fetch Wikipedia articles for all raga names
  console.log("\n--- Fetching Wikipedia articles ---");
  const ragaNames = existing.map((r) => r.name);
  const articles = await fetchAllArticles(ragaNames);

  // Parse infoboxes and build plans
  console.log("\n--- Parsing infoboxes ---");
  const plans: EnrichmentPlan[] = [];
  const matchedNames = new Set<string>();

  // Build a lookup from raga name to existing raga
  const existingByName = new Map(existing.map((r) => [r.name, r]));

  for (const article of articles) {
    const infobox = parseInfobox(article.wikitext, article.articleTitle);
    if (!infobox) {
      console.warn(`  Warning: could not parse infobox from ${article.articleTitle}`);
      continue;
    }

    const existingRaga = existingByName.get(article.ragaName);
    if (!existingRaga) continue;

    matchedNames.add(article.ragaName);
    const plan = buildPlan(infobox, existingRaga, article.method);
    plans.push(plan);
  }

  const unmatchedNeo4j = ragaNames.filter((n) => !matchedNames.has(n));

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
    articlesFound: articles.length,
    neo4jCount: existing.length,
    matchedCount: plans.length,
    enrichedCount: enrichedPlans.length,
    skippedCount,
    unmatchedNeo4j,
    plans: enrichedPlans,
    thaatCounts,
  };
}
