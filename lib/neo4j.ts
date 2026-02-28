import neo4j, { Driver, Session, SessionMode } from "neo4j-driver";

const NEO4J_URI = process.env.NEO4J_URI!;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME!;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD!;

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
    );
  }
  return driver;
}

export function getSession(mode: SessionMode = neo4j.session.READ): Session {
  return getDriver().session({ defaultAccessMode: mode });
}

export async function read<T>(
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const session = getSession(neo4j.session.READ);
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject() as T);
  } finally {
    await session.close();
  }
}

export async function write<T>(
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const session = getSession(neo4j.session.WRITE);
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject() as T);
  } finally {
    await session.close();
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
