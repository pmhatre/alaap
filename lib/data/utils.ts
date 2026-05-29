import neo4j from "neo4j-driver";

/**
 * Safely convert Neo4j Integer objects to JavaScript numbers.
 * Neo4j driver returns Integer objects for all integer values.
 */
export function toNumber(val: unknown): number | undefined {
  if (val == null) return undefined;
  if (neo4j.isInt(val)) return val.toNumber();
  if (typeof val === "number") return val;
  return undefined;
}

/** Convert all Neo4j Integer properties in an object to numbers */
export function toPlainObject<T>(
  obj: Record<string, unknown>,
): T {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (neo4j.isInt(val)) {
      result[key] = val.toNumber();
    } else if (Array.isArray(val)) {
      result[key] = val.map((v) => (neo4j.isInt(v) ? v.toNumber() : v));
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

export const PAGE_SIZE = 20;

export function neo4jInt(n: number) {
  return neo4j.int(n);
}
