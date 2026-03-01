/**
 * Parse Binaca Geetmala CSV file into typed entries.
 * Simple parser — no library dependency.
 */

import { readFileSync } from "fs";
import type { GeetmalaEntry } from "./types";

/** Parse a CSV line, handling quoted fields */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Read CSV file and return parsed GeetmalaEntry[] */
export function parseGeetmalaCSV(filePath: string): GeetmalaEntry[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  // Skip header
  const dataLines = lines.slice(1);
  const entries: GeetmalaEntry[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const fields = parseLine(dataLines[i]);
    if (fields.length < 5) {
      console.warn(`Skipping line ${i + 2}: expected 5 fields, got ${fields.length}`);
      continue;
    }

    const year = parseInt(fields[0], 10);
    const rank = parseInt(fields[1], 10);
    if (isNaN(year) || isNaN(rank)) {
      console.warn(`Skipping line ${i + 2}: invalid year or rank`);
      continue;
    }

    entries.push({
      year,
      rank,
      title: fields[2],
      film: fields[3],
      singers: fields[4],
    });
  }

  return entries;
}
