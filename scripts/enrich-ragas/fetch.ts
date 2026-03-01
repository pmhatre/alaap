/** Fetch ragaDB JSON from GitHub or local file */

import { readFileSync } from "fs";
import type { RagaDBEntry } from "./types";

const RAGADB_URL =
  "https://raw.githubusercontent.com/shockmonger/ragaDB/master/ragas.json";

export async function fetchRagaDB(localPath?: string): Promise<RagaDBEntry[]> {
  let raw: Record<string, Record<string, unknown>>;

  if (localPath) {
    console.log(`Reading ragaDB from local file: ${localPath}`);
    const text = readFileSync(localPath, "utf-8");
    raw = JSON.parse(text);
  } else {
    console.log(`Fetching ragaDB from GitHub...`);
    const response = await fetch(RAGADB_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch ragaDB: ${response.status} ${response.statusText}`);
    }
    raw = await response.json();
  }

  const entries: RagaDBEntry[] = Object.entries(raw).map(([key, value]) => ({
    name: key,
    aaroha: (value.aaroha as string[]) ?? [],
    avaroha: (value.avaroha as string[]) ?? [],
    vadi: (value.vadi as string) ?? "",
    samvadi: (value.samvadi as string) ?? "",
    thaat: (value.thaat as string) ?? "",
    time: (value.time as string) ?? "",
    pakad: (value.pakad as string[]) ?? [],
    jati: (value.jati as string) ?? "",
  }));

  console.log(`Loaded ${entries.length} ragas from ragaDB`);
  return entries;
}
