import { read } from "@/lib/neo4j";
import type { Raga } from "@/lib/types";
import { toPlainObject, toNumber, PAGE_SIZE } from "./utils";

export interface RagaWithCount extends Raga {
  songCount: number;
}

export interface RagaDetail extends Raga {
  thaat?: string;
}

export async function getRagaBySlug(
  slug: string,
): Promise<RagaDetail | null> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (r:Raga {slug: $slug})
     OPTIONAL MATCH (r)-[:BELONGS_TO_THAAT]->(t:Thaat)
     RETURN properties(r) AS raga, t.name AS thaat`,
    { slug },
  );
  if (rows.length === 0) return null;
  const raga = toPlainObject<Raga>(
    rows[0].raga as Record<string, unknown>,
  );
  return { ...raga, thaat: rows[0].thaat as string | undefined };
}

export async function getAllRagas(
  page: number = 1,
): Promise<{ ragas: RagaWithCount[]; total: number }> {
  const skip = (page - 1) * PAGE_SIZE;
  const [ragaRows, countRows] = await Promise.all([
    read<Record<string, unknown>>(
      `MATCH (r:Raga)
       OPTIONAL MATCH (s:Song)-[:BASED_ON_RAGA]->(r)
       RETURN properties(r) AS raga, count(s) AS songCount
       ORDER BY songCount DESC, raga.name ASC
       SKIP $skip LIMIT $limit`,
      { skip: neo4jInt(skip), limit: neo4jInt(PAGE_SIZE) },
    ),
    read<Record<string, unknown>>(
      `MATCH (r:Raga) RETURN count(r) AS total`,
    ),
  ]);
  return {
    ragas: ragaRows.map((row) => ({
      ...toPlainObject<Raga>(row.raga as Record<string, unknown>),
      songCount: toNumber(row.songCount) ?? 0,
    })),
    total: toNumber(countRows[0]?.total) ?? 0,
  };
}

export async function getRagaSongCount(ragaSlug: string): Promise<number> {
  const rows = await read<Record<string, unknown>>(
    `MATCH (s:Song)-[:BASED_ON_RAGA]->(r:Raga {slug: $ragaSlug})
     RETURN count(s) AS total`,
    { ragaSlug },
  );
  return toNumber(rows[0]?.total) ?? 0;
}

function neo4jInt(n: number) {
  const neo4j = require("neo4j-driver").default;
  return neo4j.int(n);
}
