/**
 * Normalization functions for dedup matching.
 * Ports Python's _normalize_text() with aggressive transliteration flattening.
 */

/**
 * Core normalization: NFD decompose, strip combining marks, lowercase,
 * remove non-alphanumeric, collapse doubled vowels, collapse whitespace.
 */
export function normalizeForDedup(text: string): string {
  if (!text) return "";

  // NFD decompose and strip combining marks (accents/diacritics)
  let s = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Lowercase
  s = s.toLowerCase();

  // Remove non-alphanumeric except spaces
  s = s.replace(/[^a-z0-9\s]/g, "");

  // Remove 'y' glide between vowels (kijiye→kijie, gaye→gae)
  // Common in Hindi transliteration: some romanizations include the glide, others don't
  s = s.replace(/([aeiou])y([aeiou])/g, "$1$2");

  // Collapse doubled vowels (transliteration variants)
  s = s.replace(/aa/g, "a");
  s = s.replace(/ee/g, "e");
  s = s.replace(/ii/g, "i");
  s = s.replace(/oo/g, "u");
  s = s.replace(/uu/g, "u");

  // Collapse whitespace and trim
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Aggressive normalization that also strips spaces.
 * Used for film matching where sources sometimes concatenate words
 * (e.g., "Mughal-e-Azam" vs "Mughaleazam").
 */
export function normalizeSpaceless(text: string): string {
  return normalizeForDedup(text).replace(/\s/g, "");
}

/**
 * Collapse Hindi schwa: remove single 'a' between two consonants.
 * Handles transliteration variants like "bawara"/"bawra", "sahara"/"sahra".
 * Applied after doubled-vowel collapsing so 'aa' is already reduced to 'a'.
 */
export function collapseSchwa(text: string): string {
  const consonants = "[bcdfghjklmnpqrstvwxyz]";
  // Repeatedly collapse interior schwas (one pass may reveal new patterns)
  let s = text;
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(new RegExp(`(${consonants})a(${consonants})`, "g"), "$1$2");
  }
  return s;
}

/**
 * Build a dedup key for a film: spaceless normalized title (year excluded).
 * Strips disambiguation suffixes like "(film)" and collapses Hindi schwa
 * for aggressive matching across transliteration variants.
 */
export function filmDedupKey(title: string): string {
  // Strip common Wikipedia disambiguation suffixes before normalizing
  let cleaned = title.replace(/\s*\(film\)\s*/gi, " ");
  let key = normalizeSpaceless(cleaned);
  return collapseSchwa(key);
}

/**
 * Build a dedup key for an artist: normalized name.
 * Keeps spaces (unlike films) since artist names are short and spaces matter.
 */
export function artistDedupKey(name: string): string {
  return normalizeForDedup(name);
}

/**
 * Build a dedup key for a song: normalized title + "|" + spaceless normalized film.
 * Film part is spaceless to match through film concatenation variants.
 * Song title keeps spaces to avoid false positives on short titles.
 */
export function songDedupKey(title: string, filmTitle?: string): string {
  const normTitle = collapseSchwa(normalizeForDedup(title));
  if (filmTitle) {
    return `${normTitle}|${filmDedupKey(filmTitle)}`;
  }
  return normTitle;
}

/**
 * Prefix matching: if the shorter title (≥3 words) is a prefix of the longer
 * title after normalization, they're the same song. Handles Bollywood Lyrics'
 * full-first-line titles vs. shorter canonical titles.
 */
export function isTitlePrefixMatch(a: string, b: string): boolean {
  const normA = normalizeForDedup(a);
  const normB = normalizeForDedup(b);
  if (normA === normB) return true;

  const wordsA = normA.split(" ");
  const wordsB = normB.split(" ");

  const [shorter, longer] =
    wordsA.length <= wordsB.length ? [normA, normB] : [normB, normA];
  const shorterWords = shorter.split(" ");

  // Require at least 3 words in the shorter title to avoid false positives
  if (shorterWords.length < 3) return false;

  return longer.startsWith(shorter);
}
