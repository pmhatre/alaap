# Neo4j Setup, Backups, and Recovery

Alaap runs on Neo4j Aura Free. Aura Free pauses an instance after 72 hours without
activity and permanently deletes it after 30 days paused. That happened once
(August 2026), so this directory now carries everything needed to keep the instance
alive and to rebuild it from scratch.

## Provisioning a fresh instance

1. Create a free instance at [Neo4j Aura](https://console.neo4j.io/) (AuraDB Free).
2. Put `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` in `.env.local`
   (see `.env.local.example`). Never paste them into chat or commit them.
3. Apply the schema:

   ```bash
   pnpm data:cypher db/constraints.cypher
   ```

4. Restore data (see below).
5. Update the same three variables on Vercel for production, preview, and development
   (`vercel env rm` then `vercel env add`; pipe values with `printf`, not `echo`),
   then redeploy.

## Restoring data

### From a graph snapshot (preferred)

Snapshots are full exports of every node and relationship, including dedup results,
enrichment, and manual curation. They live in the private
[`pmhatre/alaap-data`](https://github.com/pmhatre/alaap-data) repo, cloned as a sibling
directory.

```bash
pnpm data:restore -- ../alaap-data/snapshots/<latest>.jsonl.gz            # dry run
pnpm data:restore -- ../alaap-data/snapshots/<latest>.jsonl.gz --execute
```

Restore is idempotent (MERGE on slug or name), so re-running is safe.

### From pipeline staging (fallback)

The last full pipeline run (2026-02-28) is archived in `alaap-data/staging/`. Rebuild
from it when no snapshot exists or when the loader or dedup logic has changed:

```bash
tar xzf ../alaap-data/staging/alaap-staging-2026-02-28.tar.gz -C pipeline/staging
(cd pipeline && uv run python run_pipeline.py --load)
pnpm data:dedup -- --execute
pnpm data:split-artists -- --execute
pnpm data:enrich:ragas -- --execute
pnpm data:enrich:chandrakantha -- --execute
pnpm data:enrich:wikipedia -- --execute
pnpm data:enrich:geetmala -- --execute
pnpm data:cypher db/curation.cypher
```

## Keeping the instance alive

`app/api/keepalive/route.ts` performs one tiny write (a `Keepalive` node that nothing
else reads). `vercel.json` schedules it daily; the Hobby plan allows one run per day.
The route requires `CRON_SECRET`, set on Vercel production. To check it by hand:

```bash
vercel crons ls
vercel crons run /api/keepalive
```

Neo4j does not document whether reads count as activity, which is why the route writes.
Also keep an eye on the Aura emails: "paused" is the warning, "deleted" is final.

## Compound singer names

Bollywood Lyrics joins duet singers with a space and no delimiter, so every load
creates artists like "Kumar Sanu Alka Yagnik" or "Rafi Lata". `pnpm data:split-artists`
finds them by matching tokens against the graph's own singer names plus a small alias
table, re-points their songs to the individual singers, and deletes the compound node.
Dry run by default; `-- --execute` applies. Run it after dedup on every rebuild. Names it
cannot fully resolve are listed at the end of the report for hand curation.

## Manual data corrections

Hand edits made directly in Neo4j vanish on the next rebuild. Put them in
`db/curation.cypher` instead and apply with `pnpm data:cypher db/curation.cypher`.
Statements should be idempotent (MATCH ... SET, MERGE), and the file runs last in the
rebuild sequence above.

## Taking a snapshot

After any manual change or enrichment run:

```bash
pnpm data:snapshot -- --out ../alaap-data/snapshots/alaap-$(date +%F).jsonl.gz
(cd ../alaap-data && git add snapshots && git commit -m "Snapshot $(date +%F)" && git push)
```

`db/snapshots/` is gitignored in this repo because snapshots include the full lyrics
corpus and this repo is public.

## Verifying

```cypher
SHOW CONSTRAINTS;
MATCH (n) RETURN labels(n)[0] AS label, count(*) ORDER BY count(*) DESC;
```
