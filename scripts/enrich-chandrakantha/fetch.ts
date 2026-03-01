/**
 * Fetch Chandrakantha raga pages.
 * Discovers raga URLs from the index page, then fetches each one with a polite delay.
 */

import * as cheerio from "cheerio";

const INDEX_URL =
  "https://chandrakantha.com/music-and-dance/i-class-music/index-of-rags/";
const DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Discover all raga page URLs from the index page */
export async function discoverRagaUrls(): Promise<string[]> {
  console.log(`Fetching index page: ${INDEX_URL}`);
  const res = await fetch(INDEX_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch index: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const urls: string[] = [];
  // All raga links are under the index-of-rags/ path
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const absolute = href.startsWith("http")
      ? href
      : new URL(href, INDEX_URL).href;
    // Must be a subpage of the index, not the index itself or a fragment
    if (
      absolute.startsWith(INDEX_URL) &&
      absolute !== INDEX_URL &&
      absolute !== INDEX_URL.replace(/\/$/, "") &&
      !absolute.includes("#")
    ) {
      if (!urls.includes(absolute)) {
        urls.push(absolute);
      }
    }
  });

  console.log(`Found ${urls.length} raga page URLs`);
  return urls;
}

/** Fetch the raw HTML for a single raga page */
export async function fetchRagaPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  Warning: ${url} returned ${res.status}, skipping`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`  Warning: failed to fetch ${url}: ${err}`);
    return null;
  }
}

/** Fetch all raga pages with polite delay between requests */
export async function fetchAllPages(): Promise<
  Array<{ url: string; html: string }>
> {
  const urls = await discoverRagaUrls();
  const pages: Array<{ url: string; html: string }> = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`  [${i + 1}/${urls.length}] Fetching ${url}`);
    const html = await fetchRagaPage(url);
    if (html) {
      pages.push({ url, html });
    }
    if (i < urls.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`Successfully fetched ${pages.length}/${urls.length} pages`);
  return pages;
}
