/**
 * Normalization for ragaDB → Neo4j matching.
 *
 * Three concerns:
 * 1. Name matching (CamelCase split, suffix strip, manual map, slug compare)
 * 2. Note formatting (arrays → space-separated strings)
 * 3. Time / thaat normalization (human-readable labels)
 */

import { normalizeForDedup } from "../dedup/normalize";

// ─── Name matching ──────────────────────────────────────────────────

/** Split CamelCase into words: "AhirBhairav" → "Ahir Bhairav" */
export function splitCamelCase(name: string): string {
  // Insert space before each uppercase letter that follows a lowercase letter
  // or before a sequence of uppercase letters followed by lowercase
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

/** Strip trailing single "R" suffix (thaat indicator): "BhairaviR" → "Bhairavi" */
export function stripRSuffix(name: string): string {
  // Only strip a single trailing R that follows a lowercase letter
  return name.replace(/([a-z])R$/, "$1");
}

/** Strip trailing B/P suffixes (variant indicators): "DeepakB" → "Deepak" */
export function stripVariantSuffix(name: string): string {
  return name.replace(/([a-z])[BP]$/, "$1");
}

/** Strip parenthetical prefixes: "(Miyaki)Todi" → "Todi" */
export function stripParenPrefix(name: string): string {
  return name.replace(/^\([^)]+\)/, "");
}

/**
 * Manual mapping for known mismatches between ragaDB keys and Neo4j raga names.
 * Maps normalized ragaDB name → Neo4j raga name (as stored).
 */
const MANUAL_NAME_MAP: Record<string, string> = {
  // Spelling variants
  "Kalyaan": "Kalyan",
  "Desh": "Des",
  "Deshkar": "Deskar",
  "Bilaval": "Bilawal",
  "Poorvi": "Purvi",
  "Pooriya": "Puriya",
  "Pooriya Dhanashri": "Puriya Dhanashri",
  "Pooriya Kalyan": "Puriya Kalyan",
  "Shree": "Sri",
  "Gaur Sarang": "Gaud Sarang",
  "Gaur Malhar": "Gaud Malhar",
  "Shuddh Sarang": "Shuddha Sarang",
  "Shuddh Kalyan": "Shuddha Kalyan",
  "Mand": "Maand",
  "Tilak Kamod": "Tilak Kamod",
  "Nat Bhairav": "Natt Bhairav",
  "Hamsadhwani": "Hansdhwani",
  "Khamaj": "Khamaj",
  "Bihagda": "Bihagra",
  "Jaunpuri": "Jaunpuri",
  "Gunkali": "Gunakali",
  "Madhuvanti": "Madhuwanti",
  "Nand": "Nand",
  "Lalit": "Lalit",
  "Chandrakauns": "Chandrakauns",
  "Basant Mukhari": "Basant Mukhari",
  "Rageshri": "Rageshree",
  "Jhinjhoti": "Jhinjhoti",
  "Bahar": "Bahar",
  "Bairagi": "Bairagi Bhairav",
  "Marva": "Marwa",
  "Multani": "Multani",
  "Miya Malhar": "Miyan Malhar",
  "Miya Ki Todi": "Miyan Ki Todi",
  "Miya Ki Malhar": "Miyan Ki Malhar",
  "Sindhu Bhairavi": "Sindhu Bhairavi",
  "Jayjaywanti": "Jayjaivanti",
  "Hem Kalyan": "Hemkalyan",
  "Bhimpalasi": "Bhimpalasi",
  "Durga": "Durga",
  "Hamskalyani": "Hans Kalyan",
  // Diacritics / transliteration variants
  "Abhogi Kanhada": "Abhogi Kanada",
  "Alhaiya Bilaval": "Alhiya Bilawal",
  "Anand Bhairavi": "Ananda Bhairavi",
  "Barva": "Barwa",
  "Hameer": "Hameer",
  "Nata Bhairavi": "Natabhairavi",
  "Gaud Malhar": "Gaur Malhar",
  "Gaud Sarang": "Gaur Sarang",
  "Devgandhar": "Devagandhari",
  "Gun Kali": "Gunkali",
};

/** Slugify a name: lowercase, spaces to hyphens, strip non-alnum */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export interface NameMatchResult {
  neo4jName: string;
  method: "exact" | "camelcase" | "manual" | "slug" | "dedup";
}

/**
 * Attempt to match a ragaDB key to a Neo4j raga name.
 * Tries multiple strategies in order of specificity.
 */
export function matchName(
  ragaDBKey: string,
  neo4jNames: string[],
  neo4jSlugs: Map<string, string>, // name → slug
): NameMatchResult | null {
  // Clean the ragaDB key through normalization layers
  let cleaned = stripParenPrefix(ragaDBKey);
  cleaned = stripRSuffix(cleaned);
  cleaned = stripVariantSuffix(cleaned);
  const expanded = splitCamelCase(cleaned);

  // 1. Exact match on expanded name
  const exactMatch = neo4jNames.find(
    (n) => n.toLowerCase() === expanded.toLowerCase(),
  );
  if (exactMatch) return { neo4jName: exactMatch, method: "exact" };

  // 2. CamelCase split match (different casing)
  const camelMatch = neo4jNames.find(
    (n) => n.toLowerCase().replace(/\s+/g, "") === cleaned.toLowerCase().replace(/\s+/g, ""),
  );
  if (camelMatch) return { neo4jName: camelMatch, method: "camelcase" };

  // 3. Manual mapping (uses normalizeForDedup for diacritics-insensitive comparison)
  const manualTarget = MANUAL_NAME_MAP[expanded];
  if (manualTarget) {
    const targetNorm = normalizeForDedup(manualTarget);
    const manualMatch = neo4jNames.find(
      (n) => normalizeForDedup(n) === targetNorm,
    );
    if (manualMatch) return { neo4jName: manualMatch, method: "manual" };
  }

  // 4. Slug comparison
  const ragaDBSlug = slugify(expanded);
  for (const [name, slug] of neo4jSlugs) {
    if (slug === ragaDBSlug) return { neo4jName: name, method: "slug" };
  }

  // 5. Dedup normalizer fallback (schwa collapse, vowel flattening)
  const ragaDBNorm = normalizeForDedup(expanded);
  for (const name of neo4jNames) {
    if (normalizeForDedup(name) === ragaDBNorm) {
      return { neo4jName: name, method: "dedup" };
    }
  }

  return null;
}

// ─── Note formatting ────────────────────────────────────────────────

/**
 * Format a note array into a space-separated string.
 * Handles edge cases from ragaDB:
 * - Apostrophe-prefixed octave markers: "'N" stays as-is
 * - Underscored separators: "n_S_" → "n S"
 * - Concatenated notes: "mP" → "m P" (split uppercase after lowercase)
 */
export function formatNotes(notes: string[]): string {
  if (!notes || notes.length === 0) return "";

  return notes
    .map((n) =>
      n
        .replace(/_/g, " ") // underscores → spaces
        .replace(/([a-z])([A-Z])/g, "$1 $2") // split concatenated notes
        .trim(),
    )
    .filter((n) => n.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Time normalization ─────────────────────────────────────────────

const TIME_MAP: Record<string, string> = {
  "EarlyMorning3-6": "Early Morning (3-6 AM)",
  "Atdaybreak3-6": "Daybreak (3-6 AM)",
  "Atdaybreak6-9": "Daybreak (6-9 AM)",
  "Atdaybreak": "Daybreak",
  "BeforeSunrise3-6": "Before Sunrise (3-6 AM)",
  "Morning6-9": "Morning (6-9 AM)",
  "Morning9-12": "Late Morning (9 AM-12 PM)",
  "Morning12-3": "Afternoon (12-3 PM)",
  "LateMorning9-12": "Late Morning (9 AM-12 PM)",
  "EarlyAfternoon12-3": "Early Afternoon (12-3 PM)",
  "Afternoon12-3": "Afternoon (12-3 PM)",
  "Afternoon3-6": "Afternoon (3-6 PM)",
  "AtSunset3-6": "Sunset (3-6 PM)",
  "Sunset3-6": "Sunset (3-6 PM)",
  "Evening6-9": "Evening (6-9 PM)",
  "Aftersunset6-9": "After Sunset (6-9 PM)",
  "Aftersunset3-6": "After Sunset (3-6 PM)",
  "Justaftersunset3-6": "After Sunset (3-6 PM)",
  "LateEvening3-6": "Late Evening (3-6 AM)",
  "LateEvening6-9": "Late Evening (6-9 PM)",
  "Night6-9": "Night (6-9 PM)",
  "Night9-12": "Night (9 PM-12 AM)",
  "EarlyNight9-12": "Early Night (9 PM-12 AM)",
  "LateNight12-3": "Late Night (12-3 AM)",
  "Midnight": "Midnight",
  "AroundMidnight12-3": "Around Midnight (12-3 AM)",
  "Monsoon": "Monsoon Season",
  "Anytimeinrainyseason": "Rainy Season",
  "Anytimeinmonsoon": "Monsoon Season",
  "SpringSeason3-6": "Spring Season (3-6 PM)",
  "Anytimedayornight": "Any Time",
  "Nospecifictime": "Any Time",
  "Anytimeinrains/midnight": "Rainy Season / Midnight",
  "Morning/concertend6-9": "Morning (6-9 AM)",
};

export function normalizeTime(time: string): string {
  if (!time) return "";
  return TIME_MAP[time] ?? time;
}

// ─── Thaat normalization ────────────────────────────────────────────

const THAAT_MAP: Record<string, string> = {
  "Bilaval": "Bilawal",
  "Kalyaan": "Kalyan",
  "Marva": "Marwa",
  "Poorvi": "Purvi",
  // These stay as-is but listed for completeness:
  "Bhairav": "Bhairav",
  "Bhairavi": "Bhairavi",
  "Kafi": "Kafi",
  "Asavari": "Asavari",
  "Khamaj": "Khamaj",
  "Todi": "Todi",
};

export function normalizeThaat(thaat: string): string {
  if (!thaat) return "";
  return THAAT_MAP[thaat] ?? thaat;
}
