/**
 * Apply enrichment plans to Neo4j.
 * Non-destructive: only sets null properties, never overwrites existing data.
 */

import { write } from "../../lib/neo4j";
import type { EnrichmentPlan } from "./types";

/** Update raga properties and add "ragadb" to sources */
async function updateRagaProperties(plan: EnrichmentPlan): Promise<void> {
  const params: Record<string, unknown> = { slug: plan.slug };
  const setClauses: string[] = [];

  for (const [key, value] of Object.entries(plan.updates)) {
    params[key] = value;
    setClauses.push(
      `r.${key} = CASE WHEN r.${key} IS NULL THEN $${key} ELSE r.${key} END`,
    );
  }

  // Always update sources to include "ragadb"
  setClauses.push(
    `r.sources = CASE
      WHEN r.sources IS NULL THEN ["ragadb"]
      WHEN NOT "ragadb" IN r.sources THEN r.sources + "ragadb"
      ELSE r.sources END`,
  );

  const cypher = `
    MATCH (r:Raga {slug: $slug})
    SET ${setClauses.join(",\n        ")}
  `;

  await write(cypher, params);
}

/** Create Thaat node and BELONGS_TO_THAAT relationship */
async function createThaatRelationship(
  slug: string,
  thaatName: string,
): Promise<void> {
  await write(
    `MERGE (t:Thaat {name: $thaatName})
     WITH t
     MATCH (r:Raga {slug: $slug})
     MERGE (r)-[:BELONGS_TO_THAAT]->(t)`,
    { slug, thaatName },
  );
}

/** Apply all enrichment plans to Neo4j */
export async function applyEnrichments(
  plans: EnrichmentPlan[],
): Promise<{ propertiesUpdated: number; thaatsCreated: number }> {
  let propertiesUpdated = 0;
  let thaatsCreated = 0;

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];

    // Update properties if there are any to set
    if (Object.keys(plan.updates).length > 0) {
      await updateRagaProperties(plan);
      propertiesUpdated++;
    }

    // Create thaat relationship if applicable
    if (plan.thaat) {
      await createThaatRelationship(plan.slug, plan.thaat);
      thaatsCreated++;
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  ... ${i + 1}/${plans.length} applied`);
    }
  }

  return { propertiesUpdated, thaatsCreated };
}
