/**
 * Parse Wikipedia Infobox raga from wikitext.
 *
 * Handles wiki markup patterns:
 * - {{overline|Ma}} → M (tivra madhyam)
 * - {{underline|Re}} → r (komal)
 * - {{svaraH|S|r|g|...}} → S r g ...
 * - [[link|display]] → display
 * - [[link]] → link
 * - {{ubl|...}} → first item or joined
 * - Parenthetical grace notes preserved (musicologically significant)
 */

import type { WikipediaInfobox } from "./types";

/** Map of swar names to ragaDB notation (uppercase=shuddha, lowercase=komal, M=tivra) */
const SWAR_MAP: Record<string, string> = {
  // Shuddha (natural)
  "Sa": "S",
  "Re": "R",
  "Ga": "G",
  "Ma": "m", // shuddha Ma is lowercase in ragaDB
  "Pa": "P",
  "Dha": "D",
  "Ni": "N",
  // Already in notation form
  "S": "S",
  "R": "R",
  "G": "G",
  "m": "m",
  "M": "M", // tivra Ma
  "P": "P",
  "D": "D",
  "N": "N",
  "r": "r",
  "g": "g",
  "d": "d",
  "n": "n",
  // Komal (lowercase in wiki notation)
  "re": "r",
  "ga": "g",
  "ma": "m",
  "dha": "d",
  "ni": "n",
  // Octave markers
  "Sa'": "S'",
  "S'": "S'",
  "'Sa": "'S",
  "'S": "'S",
  "'Ni": "'N",
  "'ni": "'n",
  "'N": "'N",
  "'n": "'n",
};

/**
 * Convert a swar name from wiki format to ragaDB notation.
 * overline = tivra, underline = komal
 */
function convertSwar(name: string, modifier?: "tivra" | "komal"): string {
  const cleaned = name.trim();
  // Handle octave prefixes/suffixes
  const hasUpperOctave = cleaned.endsWith("'") || cleaned.endsWith("'");
  const hasLowerOctave = cleaned.startsWith("'") || cleaned.startsWith("'");
  const baseName = cleaned
    .replace(/^['']/, "")
    .replace(/['']$/, "");

  let base = SWAR_MAP[baseName] ?? baseName;

  if (modifier === "tivra") {
    // Tivra Ma → M (uppercase)
    if (/^m$/i.test(base) || /^Ma$/i.test(baseName)) base = "M";
  } else if (modifier === "komal") {
    // Komal → lowercase
    base = base.toLowerCase();
    // But Sa and Pa don't have komal forms — keep as-is
    if (/^s$/i.test(base) && !/^sa$/i.test(baseName)) base = "S";
    if (/^p$/i.test(base)) base = "P";
  }

  const prefix = hasLowerOctave ? "'" : "";
  const suffix = hasUpperOctave ? "'" : "";
  return `${prefix}${base}${suffix}`;
}

/** Process {{overline|X}} → tivra */
function processOverline(text: string): string {
  return text.replace(/\{\{overline\|([^}]+)\}\}/gi, (_, swar) => {
    return convertSwar(swar, "tivra");
  });
}

/** Process {{underline|X}} → komal */
function processUnderline(text: string): string {
  return text.replace(/\{\{underline\|([^}]+)\}\}/gi, (_, swar) => {
    return convertSwar(swar, "komal");
  });
}

/** Process {{svaraH|S|r|g|...}} → S r g ... */
function processSvaraH(text: string): string {
  return text.replace(/\{\{svaraH\|([^}]+)\}\}/gi, (_, args) => {
    return args
      .split("|")
      .map((s: string) => convertSwar(s.trim()))
      .join(" ");
  });
}

/** Process wiki links: [[link|display]] → display, [[link]] → link */
function processLinks(text: string): string {
  // [[target|display]] → display
  text = text.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1");
  return text;
}

/** Process {{ubl|item1|item2}} → first item only */
function processUbl(text: string): string {
  return text.replace(/\{\{ubl\|([^}]+)\}\}/gi, (_, args) => {
    const items = args.split("|");
    return items[0].trim();
  });
}

/** Strip remaining wiki templates and HTML tags we don't understand */
function stripTemplates(text: string): string {
  // Remove <ref>...</ref> and self-closing <ref ... /> tags
  let cleaned = text.replace(/<ref[^>]*\/>/g, "");
  cleaned = cleaned.replace(/<ref[^>]*>.*?<\/ref>/g, "");
  // Remove {{anything}} that wasn't already processed
  cleaned = cleaned.replace(/\{\{[^}]*\}\}/g, "");
  return cleaned.trim();
}

/** Clean up notation string: normalize spaces and separators */
function cleanNotation(text: string): string {
  let cleaned = text
    .replace(/[–—]/g, "-") // normalize dashes
    .replace(/\s*[-/]\s*/g, " ") // slashes and dashes → spaces
    .replace(/,/g, " ") // commas → spaces
    .replace(/\s+/g, " ") // collapse spaces
    .trim();

  // Convert remaining full swar names to notation
  for (const [name, notation] of Object.entries(SWAR_MAP)) {
    if (name.length > 1) {
      // Only replace standalone words (not substrings)
      const regex = new RegExp(`\\b${name}\\b`, "g");
      cleaned = cleaned.replace(regex, notation);
    }
  }

  return cleaned;
}

/** Clean thaat value from wiki markup */
function cleanThaat(raw: string): string {
  let cleaned = processLinks(raw);
  cleaned = stripTemplates(cleaned);
  // Strip <ref>...</ref> and self-closing <ref ... /> tags
  cleaned = cleaned.replace(/<ref[^>]*\/>/g, "");
  cleaned = cleaned.replace(/<ref[^>]*>.*?<\/ref>/g, "");
  // Strip "(thaat)" suffix
  cleaned = cleaned.replace(/\s*\(thaat\)\s*/gi, "");
  // Take first item if multiple (e.g. "Bhairavi (or Asavari)")
  cleaned = cleaned.replace(/\s*\(or\s+.*?\)\s*/i, "");
  // "Kafi / Asavari" or "Khamaj or Kafi" → take first
  cleaned = cleaned.split(/\s*[/]\s*/)[0];
  cleaned = cleaned.split(/\s+or\s+/i)[0];
  // Strip "( Hindustani)" qualifier
  cleaned = cleaned.replace(/\s*\(\s*Hindustani\s*\)\s*/i, "");
  // Strip bullet/list markup
  cleaned = cleaned.replace(/^\*\s*/, "");
  return cleaned.trim();
}

/** Clean a simple field value (vadi, samavadi) */
function cleanFieldValue(raw: string): string {
  let cleaned = processOverline(raw);
  cleaned = processUnderline(cleaned);
  cleaned = processLinks(cleaned);
  cleaned = stripTemplates(cleaned);
  cleaned = cleaned.trim();
  // Convert swar name to notation
  return SWAR_MAP[cleaned] ?? cleaned;
}

/** Clean time value */
function cleanTime(raw: string): string {
  let cleaned = processLinks(raw);
  cleaned = stripTemplates(cleaned);
  return cleaned.trim();
}

/**
 * Extract the Infobox raga template from wikitext.
 * Handles nested templates by counting braces.
 */
function extractInfobox(wikitext: string): string | null {
  const startIdx = wikitext.search(/\{\{Infobox raga/i);
  if (startIdx === -1) return null;

  let depth = 0;
  let i = startIdx;
  while (i < wikitext.length) {
    if (wikitext[i] === "{" && wikitext[i + 1] === "{") {
      depth++;
      i += 2;
    } else if (wikitext[i] === "}" && wikitext[i + 1] === "}") {
      depth--;
      if (depth === 0) {
        return wikitext.slice(startIdx, i + 2);
      }
      i += 2;
    } else {
      i++;
    }
  }
  return null;
}

/**
 * Parse key-value pairs from an Infobox template string.
 * Each field is on a line like: | key = value
 */
function parseInfoboxFields(
  infobox: string,
): Record<string, string> {
  const fields: Record<string, string> = {};
  // Remove the outer {{ and }}
  const inner = infobox.replace(/^\{\{Infobox raga\s*/i, "").replace(/\}\}$/, "");

  // Split on | that starts a field (at line beginning or after whitespace)
  const lines = inner.split(/\n\s*\|/);
  for (const line of lines) {
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim().toLowerCase();
    const value = line.slice(eqIdx + 1).trim();
    if (key && value) {
      fields[key] = value;
    }
  }
  return fields;
}

/** Parse a Wikipedia Infobox raga into our structured format */
export function parseInfobox(
  wikitext: string,
  articleTitle: string,
): WikipediaInfobox | null {
  const infoboxStr = extractInfobox(wikitext);
  if (!infoboxStr) return null;

  const fields = parseInfoboxFields(infoboxStr);

  const name = fields["name"] || articleTitle.replace(/[\s_]*\(.*?\)/, "").trim();

  // Process arohana/avarohana: apply all wiki markup transforms, then clean notation
  function processNotation(raw: string | undefined): string {
    if (!raw) return "";
    let processed = processSvaraH(raw);
    processed = processOverline(processed);
    processed = processUnderline(processed);
    processed = processUbl(processed);
    processed = processLinks(processed);
    processed = stripTemplates(processed);
    return cleanNotation(processed);
  }

  return {
    name,
    articleTitle,
    arohana: processNotation(fields["arohana"]),
    avarohana: processNotation(fields["avarohana"]),
    vadi: cleanFieldValue(fields["vadi"] ?? ""),
    samavadi: cleanFieldValue(fields["samavadi"] ?? ""),
    pakad: processNotation(fields["pakad"]),
    time: cleanTime(fields["time"] ?? fields["time of day (gayan samaye)"] ?? ""),
    thaat: cleanThaat(fields["thaat"] ?? ""),
  };
}
