/**
 * Parse Chandrakantha raga page HTML into structured data.
 *
 * Page structure (from live analysis):
 * - H1: Raga name (e.g. "Rag Bhairavi", "Rag Desh")
 * - H3 "Description": followed by <p> paragraphs of scholarly text
 * - H3 "Vadi" / "Samvadi" / "Time" / "That": followed by <p> with value
 * - H3 "Arohana" / "Avarohana" / "Pakad": images (skip — not extractable)
 *
 * NOT extracted: aroha, avaroha, pakad (rendered as images on Chandrakantha).
 */

import * as cheerio from "cheerio";
import type { ChandrakanthaEntry } from "./types";

/** Clean text: collapse whitespace, strip HTML entities, trim */
function cleanText(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/\u00a0/g, " ") // non-breaking space
    .replace(/\s+/g, " ")
    .trim();
}

/** Clean paragraph text: remove trailing dashes and link references */
function cleanParagraph(text: string): string {
  let cleaned = cleanText(text);
  // Strip "(general discussion...)" or "(more...)" link references
  cleaned = cleaned.replace(/\s*\((?:general discussion|more)[^)]*\)/gi, "");
  // Strip trailing dashes/en-dashes
  cleaned = cleaned.replace(/[\s\u2013\u2014-]+$/, "");
  return cleaned;
}

/** Extract raga name from H1, stripping "Rag " prefix and parenthetical alternates */
function extractName($: cheerio.CheerioAPI): string {
  const h1Text = cleanText($("h1").first().text());
  // Strip "Rag " prefix and parenthetical alternate names
  // e.g. "Rag Asawari (Asavari)" → "Asawari"
  // e.g. "Rag Kalyan (a.k.a. Yaman)" → "Kalyan"
  return h1Text
    .replace(/^Rag\s+/i, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim();
}

/**
 * Extract description paragraphs.
 * Description is <p> elements after the H3 "Description" heading,
 * until the next H2/H3 heading.
 */
function extractDescription($: cheerio.CheerioAPI): string {
  const paragraphs: string[] = [];
  let inDescription = false;

  // Find the "Description" heading
  $("h2, h3").each((_, heading) => {
    const text = cleanText($(heading).text());
    if (/^description$/i.test(text)) {
      inDescription = true;
      // Walk siblings after this heading
      let sibling = $(heading).next();
      while (sibling.length > 0) {
        const tag = sibling.prop("tagName")?.toLowerCase();
        // Stop at next heading
        if (tag === "h2" || tag === "h3" || tag === "h4") break;
        if (tag === "p") {
          const pText = cleanParagraph(sibling.text());
          if (pText.length > 10) {
            paragraphs.push(pText);
          }
        }
        sibling = sibling.next();
      }
    }
  });

  // Some pages may not have a "Description" heading — try using paragraphs
  // between H1 and first H3 as description
  if (!inDescription || paragraphs.length === 0) {
    const h1 = $("h1").first();
    if (h1.length > 0) {
      let sibling = h1.next();
      while (sibling.length > 0) {
        const tag = sibling.prop("tagName")?.toLowerCase();
        if (tag === "h2" || tag === "h3" || tag === "h4") break;
        if (tag === "p") {
          const pText = cleanParagraph(sibling.text());
          if (pText.length > 10) {
            paragraphs.push(pText);
          }
        }
        sibling = sibling.next();
      }
    }
  }

  return paragraphs.join("\n\n");
}

/**
 * Extract a field value from an H3 heading followed by a <p> tag.
 * Returns the cleaned text, or empty string if not found.
 */
function extractField($: cheerio.CheerioAPI, fieldName: string): string {
  let value = "";
  $("h3").each((_, heading) => {
    const text = cleanText($(heading).text());
    if (text.toLowerCase() === fieldName.toLowerCase()) {
      const next = $(heading).next("p");
      if (next.length > 0) {
        value = cleanParagraph(next.text());
      }
    }
  });
  return value;
}

/** Clean thaat value: extract the primary thaat name */
function cleanThaat(raw: string): string {
  if (!raw) return "";
  // Skip N/A values
  if (/^-?N\/?A$/i.test(raw.trim())) return "";
  // Skip explanations about not belonging to standard thaats
  if (/not (?:one of|belong)/i.test(raw) && !/suggest/i.test(raw)) return "";
  // "Not one of ... but some suggest that it is Kafi" → "Kafi"
  const suggestMatch = raw.match(/suggest.*?(?:is|it is)\s+(\w+)/i);
  if (suggestMatch) return suggestMatch[1];
  // "Khammaj That (by tradition), Bilawal That (de facto)" → take first
  const firstPart = raw.split(",")[0];
  // Strip "That"/"Thaat" suffix and any parenthetical
  return firstPart
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/\s*(?:that|thaat)\s*$/i, "")
    .trim();
}

/** Parse a single Chandrakantha raga page into a structured entry */
export function parsePage(
  html: string,
  url: string,
): ChandrakanthaEntry | null {
  const $ = cheerio.load(html);

  const name = extractName($);
  if (!name) {
    console.warn(`  Warning: could not extract name from ${url}`);
    return null;
  }

  const description = extractDescription($);
  const thaat = cleanThaat(extractField($, "That"));
  const vadi = extractField($, "Vadi");
  const samvadi = extractField($, "Samvadi");
  const time = extractField($, "Time");

  return { name, url, description, thaat, vadi, samvadi, time };
}
