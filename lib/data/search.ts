import { read } from "@/lib/neo4j";
import type { SongListItem } from "./songs";
import type { Song, Raga, Artist } from "@/lib/types";
import { toPlainObject, toNumber, PAGE_SIZE } from "./utils";

export type SortOption = "year_desc" | "year_asc" | "title_asc" | "relevance";

export interface SearchParams {
  query?: string;
  raga?: string;
  composer?: string;
  singer?: string;
  decade?: string;
  taal?: string;
  language?: string;
  sort?: SortOption;
  page?: number;
}

export interface FilterOptions {
  ragas: { name: string; slug: string }[];
  composers: { name: string; slug: string }[];
  singers: { name: string; slug: string }[];
  decades: string[];
  taals: { name: string }[];
  languages: string[];
}

export async function searchSongs(
  params: SearchParams,
): Promise<{ songs: SongListItem[]; total: number }> {
  const page = params.page ?? 1;
  const skip = (page - 1) * PAGE_SIZE;

  // Build dynamic WHERE clauses
  const conditions: string[] = [];
  const matchClauses: string[] = ["MATCH (s:Song)"];
  const queryParams: Record<string, unknown> = {
    skip: neo4jInt(skip),
    limit: neo4jInt(PAGE_SIZE),
  };

  if (params.query) {
    conditions.push("toLower(s.title) CONTAINS toLower($query)");
    queryParams.query = params.query;
  }

  if (params.raga) {
    matchClauses.push("MATCH (s)-[:BASED_ON_RAGA]->(filterRaga:Raga {slug: $ragaSlug})");
    queryParams.ragaSlug = params.raga;
  }

  if (params.composer) {
    matchClauses.push("MATCH (s)-[:COMPOSED_BY]->(filterComposer:Artist {slug: $composerSlug})");
    queryParams.composerSlug = params.composer;
  }

  if (params.singer) {
    matchClauses.push("MATCH (s)-[:SUNG_BY]->(filterSinger:Artist {slug: $singerSlug})");
    queryParams.singerSlug = params.singer;
  }

  if (params.taal) {
    matchClauses.push("MATCH (s)-[:SET_TO_TAAL]->(filterTaal:Taal {name: $taalName})");
    queryParams.taalName = params.taal;
  }

  if (params.language) {
    conditions.push("s.language = $language");
    queryParams.language = params.language;
  }

  if (params.decade) {
    const decadeStart = parseInt(params.decade);
    conditions.push("s.year >= $decadeStart AND s.year < $decadeEnd");
    queryParams.decadeStart = neo4jInt(decadeStart);
    queryParams.decadeEnd = neo4jInt(decadeStart + 10);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const baseQuery = `${matchClauses.join("\n")}
    ${whereClause}`;

  const sort = params.sort ?? "year_desc";
  const useRelevance = sort === "relevance" && !!params.query;

  let orderClause: string;
  if (sort === "year_asc") {
    orderClause = "ORDER BY s.year ASC";
  } else if (sort === "title_asc") {
    orderClause = "ORDER BY s.title ASC";
  } else {
    orderClause = "ORDER BY s.year DESC";
  }

  // For relevance sort: compute score, sort, and paginate BEFORE relationship expansion.
  // For other sorts: sort and paginate after expansion (standard pattern).
  const relevanceSortQuery = `${baseQuery}
       WITH s, CASE
           WHEN toLower(s.title) = toLower($query) THEN 0
           WHEN toLower(s.title) STARTS WITH toLower($query) THEN 1
           ELSE 2
         END AS relevanceScore
       ORDER BY relevanceScore ASC, s.title ASC
       SKIP $skip LIMIT $limit
       WITH s
       OPTIONAL MATCH (s)-[:BASED_ON_RAGA]->(r:Raga)
       OPTIONAL MATCH (s)-[:SUNG_BY]->(singer:Artist)
       OPTIONAL MATCH (s)-[:COMPOSED_BY]->(composer:Artist)
       OPTIONAL MATCH (s)-[:FROM_FILM]->(f:Film)
       RETURN properties(s) AS s,
              collect(DISTINCT {name: r.name, slug: r.slug}) AS ragas,
              collect(DISTINCT {name: singer.name, slug: singer.slug}) AS singers,
              {name: composer.name, slug: composer.slug} AS composer,
              {title: f.title, slug: f.slug} AS film`;

  const standardSortQuery = `${baseQuery}
       WITH s
       OPTIONAL MATCH (s)-[:BASED_ON_RAGA]->(r:Raga)
       OPTIONAL MATCH (s)-[:SUNG_BY]->(singer:Artist)
       OPTIONAL MATCH (s)-[:COMPOSED_BY]->(composer:Artist)
       OPTIONAL MATCH (s)-[:FROM_FILM]->(f:Film)
       RETURN properties(s) AS s,
              collect(DISTINCT {name: r.name, slug: r.slug}) AS ragas,
              collect(DISTINCT {name: singer.name, slug: singer.slug}) AS singers,
              {name: composer.name, slug: composer.slug} AS composer,
              {title: f.title, slug: f.slug} AS film
       ${orderClause}
       SKIP $skip LIMIT $limit`;

  const [songsResult, countResult] = await Promise.all([
    read<Record<string, unknown>>(
      useRelevance ? relevanceSortQuery : standardSortQuery,
      queryParams,
    ),
    read<Record<string, unknown>>(
      `${baseQuery}
       RETURN count(s) AS total`,
      queryParams,
    ),
  ]);

  return {
    songs: songsResult.map(mapSearchResult),
    total: toNumber(countResult[0]?.total) ?? 0,
  };
}

function mapSearchResult(row: Record<string, unknown>): SongListItem {
  const s = toPlainObject<Song>(row.s as Record<string, unknown>);
  const ragas = (row.ragas as Record<string, unknown>[]).map((r) =>
    toPlainObject<Pick<Raga, "name" | "slug">>(r),
  );
  const singers = (row.singers as Record<string, unknown>[]).map((a) =>
    toPlainObject<Pick<Artist, "name" | "slug">>(a),
  );
  const composer = row.composer as Record<string, unknown> | null;
  const film = row.film as Record<string, unknown> | null;
  return {
    ...s,
    ragas,
    singers,
    composerName: composer?.name as string | undefined,
    composerSlug: composer?.slug as string | undefined,
    filmTitle: film?.title as string | undefined,
    filmSlug: film?.slug as string | undefined,
  };
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const [ragaRows, composerRows, singerRows, decadeRows, taalRows, languageRows] =
    await Promise.all([
      read<Record<string, unknown>>(
        `MATCH (r:Raga)<-[:BASED_ON_RAGA]-(s:Song)
         WITH r, count(s) AS cnt
         WHERE cnt > 2
         RETURN r.name AS name, r.slug AS slug
         ORDER BY cnt DESC
         LIMIT 50`,
      ),
      read<Record<string, unknown>>(
        `MATCH (a:Artist)<-[:COMPOSED_BY]-(s:Song)
         WITH a, count(s) AS cnt
         RETURN a.name AS name, a.slug AS slug
         ORDER BY cnt DESC
         LIMIT 30`,
      ),
      read<Record<string, unknown>>(
        `MATCH (a:Artist)<-[:SUNG_BY]-(s:Song)
         WITH a, count(s) AS cnt
         RETURN a.name AS name, a.slug AS slug
         ORDER BY cnt DESC
         LIMIT 30`,
      ),
      read<Record<string, unknown>>(
        `MATCH (s:Song)
         WHERE s.year IS NOT NULL
         WITH (s.year / 10) * 10 AS decade
         RETURN DISTINCT toString(decade) AS decade
         ORDER BY decade`,
      ),
      read<Record<string, unknown>>(
        `MATCH (t:Taal)<-[:SET_TO_TAAL]-(s:Song)
         WITH t, count(s) AS cnt
         RETURN t.name AS name
         ORDER BY cnt DESC`,
      ),
      read<Record<string, unknown>>(
        `MATCH (s:Song)
         WHERE s.language IS NOT NULL
         WITH s.language AS language, count(s) AS cnt
         RETURN language
         ORDER BY cnt DESC`,
      ),
    ]);

  return {
    ragas: ragaRows.map((r) => ({
      name: r.name as string,
      slug: r.slug as string,
    })),
    composers: composerRows.map((r) => ({
      name: r.name as string,
      slug: r.slug as string,
    })),
    singers: singerRows.map((r) => ({
      name: r.name as string,
      slug: r.slug as string,
    })),
    decades: decadeRows.map((r) => r.decade as string).filter(Boolean),
    taals: taalRows.map((r) => ({ name: r.name as string })),
    languages: languageRows.map((r) => r.language as string).filter(Boolean),
  };
}

export interface Suggestion {
  title: string;
  slug: string;
  year?: number;
  filmTitle?: string;
}

export async function getSuggestions(
  query: string,
  limit: number = 8,
): Promise<Suggestion[]> {
  if (!query || query.length < 2) return [];

  const rows = await read<Record<string, unknown>>(
    `MATCH (s:Song)
     WHERE toLower(s.title) CONTAINS toLower($query)
     OPTIONAL MATCH (s)-[:FROM_FILM]->(f:Film)
     WITH s, f,
       CASE
         WHEN toLower(s.title) = toLower($query) THEN 0
         WHEN toLower(s.title) STARTS WITH toLower($query) THEN 1
         WHEN toLower(s.title) CONTAINS (' ' + toLower($query)) THEN 2
         ELSE 3
       END AS tier
     RETURN s.title AS title, s.slug AS slug, s.year AS year,
            f.title AS filmTitle, tier
     ORDER BY tier ASC, s.title ASC
     LIMIT $limit`,
    { query, limit: neo4jInt(limit) },
  );

  return rows.map((r) => ({
    title: r.title as string,
    slug: r.slug as string,
    year: toNumber(r.year),
    filmTitle: r.filmTitle as string | undefined,
  }));
}

function neo4jInt(n: number) {
  const neo4j = require("neo4j-driver").default;
  return neo4j.int(n);
}
