/**
 * Fetch Wikipedia raga articles via MediaWiki API.
 *
 * Strategy per raga name:
 * 1. Try "{Name}_(raga)" — most common pattern
 * 2. Try "{Name}_(Hindustani)" — for ragas with Carnatic homonyms
 * 3. Try "{Name}" directly (follows redirects)
 * 4. Search API fallback
 *
 * All requests use a polite User-Agent and 1-second delay.
 */

const API_BASE = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "Alaap/1.0 (https://github.com/pmhatre/alaap; raga enrichment)";
const DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiGet(params: Record<string, string>): Promise<unknown> {
  const url = new URL(API_BASE);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Wikipedia API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Try to get the wikitext for a specific title. Returns null if page doesn't exist. */
async function getWikitext(title: string): Promise<string | null> {
  const data = (await apiGet({
    action: "query",
    titles: title,
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    redirects: "1", // follow redirects
  })) as {
    query: {
      pages: Record<
        string,
        {
          pageid?: number;
          missing?: string;
          revisions?: Array<{ slots: { main: { "*": string } } }>;
        }
      >;
    };
  };

  const pages = data.query.pages;
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined || !page.revisions) return null;
  return page.revisions[0].slots.main["*"];
}

/** Search for a raga article by name */
async function searchForArticle(
  ragaName: string,
): Promise<string | null> {
  const data = (await apiGet({
    action: "query",
    list: "search",
    srsearch: `${ragaName} raga Hindustani`,
    srlimit: "3",
  })) as {
    query: { search: Array<{ title: string }> };
  };

  const results = data.query.search;
  if (!results || results.length === 0) return null;

  // Look for a result that likely matches our raga
  const nameNorm = ragaName.toLowerCase().replace(/\s+/g, "");
  for (const r of results) {
    const titleNorm = r.title
      .toLowerCase()
      .replace(/\s*\(.*?\)\s*/g, "")
      .replace(/\s+/g, "");
    if (titleNorm === nameNorm || titleNorm.startsWith(nameNorm)) {
      return r.title;
    }
  }
  return null;
}

/** Check if wikitext contains a disambiguation page marker */
function isDisambiguation(wikitext: string): boolean {
  return /\{\{disambig/i.test(wikitext) || /\{\{dab\}\}/i.test(wikitext);
}

/** Check if wikitext contains an Infobox raga */
function hasInfoboxRaga(wikitext: string): boolean {
  return /\{\{Infobox raga/i.test(wikitext);
}

export interface FetchResult {
  ragaName: string;
  articleTitle: string;
  wikitext: string;
  method: string;
}

/**
 * Try to find and fetch a Wikipedia article for the given raga name.
 * Tries multiple title strategies.
 */
export async function fetchArticle(
  ragaName: string,
): Promise<FetchResult | null> {
  // Strategy 1: {Name}_(raga)
  const titleRaga = `${ragaName}_(raga)`;
  const wt1 = await getWikitext(titleRaga);
  if (wt1 && !isDisambiguation(wt1) && hasInfoboxRaga(wt1)) {
    return {
      ragaName,
      articleTitle: titleRaga,
      wikitext: wt1,
      method: "title_(raga)",
    };
  }
  await sleep(DELAY_MS);

  // Strategy 2: {Name}_(Hindustani)
  const titleHindustani = `${ragaName}_(Hindustani)`;
  const wt2 = await getWikitext(titleHindustani);
  if (wt2 && !isDisambiguation(wt2) && hasInfoboxRaga(wt2)) {
    return {
      ragaName,
      articleTitle: titleHindustani,
      wikitext: wt2,
      method: "title_(Hindustani)",
    };
  }
  await sleep(DELAY_MS);

  // Strategy 3: {Name} directly (follows redirects)
  const wt3 = await getWikitext(ragaName);
  if (wt3 && !isDisambiguation(wt3) && hasInfoboxRaga(wt3)) {
    return {
      ragaName,
      articleTitle: ragaName,
      wikitext: wt3,
      method: "title_direct",
    };
  }
  await sleep(DELAY_MS);

  // Strategy 4: Search API fallback
  const searchTitle = await searchForArticle(ragaName);
  if (searchTitle) {
    await sleep(DELAY_MS);
    const wt4 = await getWikitext(searchTitle);
    if (wt4 && !isDisambiguation(wt4) && hasInfoboxRaga(wt4)) {
      return {
        ragaName,
        articleTitle: searchTitle,
        wikitext: wt4,
        method: "search",
      };
    }
  }

  return null;
}

/**
 * Fetch Wikipedia articles for all given raga names.
 * Polite: 1s delay between API calls (built into fetchArticle).
 */
export async function fetchAllArticles(
  ragaNames: string[],
): Promise<FetchResult[]> {
  const results: FetchResult[] = [];
  let found = 0;

  for (let i = 0; i < ragaNames.length; i++) {
    const name = ragaNames[i];
    console.log(
      `  [${i + 1}/${ragaNames.length}] Looking up "${name}"...`,
    );
    const result = await fetchArticle(name);
    if (result) {
      results.push(result);
      found++;
      console.log(`    Found: ${result.articleTitle} [${result.method}]`);
    } else {
      console.log(`    Not found`);
    }
  }

  console.log(
    `\nFound ${found}/${ragaNames.length} Wikipedia articles with Infobox raga`,
  );
  return results;
}
