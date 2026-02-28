import { read } from "@/lib/neo4j";
import type { Artist, Raga } from "@/lib/types";
import { toPlainObject, toNumber } from "./utils";

export interface ArtistRole {
  role: "singer" | "composer" | "lyricist";
  count: number;
}

export interface ArtistCollaborator {
  name: string;
  slug: string;
  sharedSongs: number;
}

export async function getArtistBySlug(
  slug: string,
): Promise<Artist | null> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (a:Artist {slug: $slug})
     RETURN properties(a) AS artist`,
    { slug },
  );
  if (rows.length === 0) return null;
  return toPlainObject<Artist>(rows[0].artist as Record<string, unknown>);
}

export async function getArtistRoles(
  artistSlug: string,
): Promise<ArtistRole[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (a:Artist {slug: $slug})
     OPTIONAL MATCH (s1:Song)-[:SUNG_BY]->(a)
     WITH a, count(DISTINCT s1) AS singerCount
     OPTIONAL MATCH (s2:Song)-[:COMPOSED_BY]->(a)
     WITH a, singerCount, count(DISTINCT s2) AS composerCount
     OPTIONAL MATCH (s3:Song)-[:LYRICS_BY]->(a)
     RETURN singerCount, composerCount, count(DISTINCT s3) AS lyricistCount`,
    { slug: artistSlug },
  );
  if (rows.length === 0) return [];
  const row = rows[0];
  const roles: ArtistRole[] = [];
  const singerCount = toNumber(row.singerCount) ?? 0;
  const composerCount = toNumber(row.composerCount) ?? 0;
  const lyricistCount = toNumber(row.lyricistCount) ?? 0;
  if (singerCount > 0) roles.push({ role: "singer", count: singerCount });
  if (composerCount > 0)
    roles.push({ role: "composer", count: composerCount });
  if (lyricistCount > 0)
    roles.push({ role: "lyricist", count: lyricistCount });
  return roles;
}

export async function getArtistTopRagas(
  artistSlug: string,
  limit: number = 8,
): Promise<(Pick<Raga, "name" | "slug"> & { songCount: number })[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (a:Artist {slug: $slug})<-[:SUNG_BY|COMPOSED_BY]-(s:Song)-[:BASED_ON_RAGA]->(r:Raga)
     RETURN r.name AS name, r.slug AS slug, count(DISTINCT s) AS songCount
     ORDER BY songCount DESC
     LIMIT $limit`,
    { slug: artistSlug, limit: neo4jInt(limit) },
  );
  return rows.map((r) => ({
    name: r.name as string,
    slug: r.slug as string,
    songCount: toNumber(r.songCount) ?? 0,
  }));
}

export async function getArtistCollaborators(
  artistSlug: string,
  limit: number = 8,
): Promise<ArtistCollaborator[]> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (a:Artist {slug: $slug})<-[:SUNG_BY|COMPOSED_BY|LYRICS_BY]-(s:Song)-[:SUNG_BY|COMPOSED_BY|LYRICS_BY]->(other:Artist)
     WHERE other.slug <> $slug
     RETURN other.name AS name, other.slug AS slug, count(DISTINCT s) AS sharedSongs
     ORDER BY sharedSongs DESC
     LIMIT $limit`,
    { slug: artistSlug, limit: neo4jInt(limit) },
  );
  return rows.map((r) => ({
    name: r.name as string,
    slug: r.slug as string,
    sharedSongs: toNumber(r.sharedSongs) ?? 0,
  }));
}

function neo4jInt(n: number) {
  const neo4j = require("neo4j-driver").default;
  return neo4j.int(n);
}
