/**
 * Apply Geetmala enrichment plans to Neo4j.
 * Sets geetmala_rank and geetmala_year on Song nodes,
 * appends "geetmala" to sources array.
 */

import { write } from "../../lib/neo4j";
import type { GeetmalaPlan } from "./types";

/** Update a single song with Geetmala chart data */
async function updateSong(plan: GeetmalaPlan): Promise<void> {
  await write(
    `MATCH (s:Song {slug: $slug})
     SET s.geetmala_rank = $rank,
         s.geetmala_year = $year,
         s.sources = CASE
           WHEN s.sources IS NULL THEN ["geetmala"]
           WHEN NOT "geetmala" IN s.sources THEN s.sources + "geetmala"
           ELSE s.sources END`,
    { slug: plan.slug, rank: plan.rank, year: plan.year },
  );
}

/** Apply all Geetmala plans to Neo4j */
export async function applyGeetmalaPlans(
  plans: GeetmalaPlan[],
): Promise<{ songsUpdated: number }> {
  let songsUpdated = 0;

  for (let i = 0; i < plans.length; i++) {
    await updateSong(plans[i]);
    songsUpdated++;

    if ((i + 1) % 50 === 0) {
      console.log(`  ... ${i + 1}/${plans.length} applied`);
    }
  }

  return { songsUpdated };
}
