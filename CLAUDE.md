# Alaap

## What This Is
A knowledge base and exploratory interface for golden era Indian film music (late 1940s-1970s), with emphasis on classical and semi-classical compositions. Built as a personal project by Praneet Mhatre.

## Project Status
Phase 0 (scaffolding), Phase 1A (data seeding), Phase 1B (core pages), quick wins, Phase 2A (ragaDB enrichment), F8 (Favorites + About), and homepage/listing refinements complete. Post-dedup, Neo4j has ~14.5K songs, ~4.5K artists, ~4.4K films, 274 ragas (75 enriched with musicological properties), 10 thaats, 37 taals from 5 sources. Songs and films have language tags; Wikipedia scraper includes non-Hindi songs (~230 non-Hindi). Raga detail pages show aroha, avaroha, vadi, samvadi, pakad, timeOfDay, and thaat for enriched ragas. Favorites page at `/favorites` with 6 curated songs + personal annotations. About page at `/about`. Artist listing shows role badges. Raga song listings default to Hindi language filter.

## Key Documentation
- `docs/vision.md` — project vision, thesis, design principles
- `docs/features.md` — feature roadmap (Phases 1-3 + parking lot)
- `docs/SOURCES.md` — full attribution of all data sources (active + planned)
- `docs/research/data-sources.md` — exhaustive data source assessment (Tiers 1-4)
- `docs/research/data-ingestion-plan.md` — prioritized ingestion plan
- `docs/architecture.md` — technical architecture, entity model, development phases

## Project Structure
- `app/` — Next.js 15 App Router
  - `components/` — shared UI: `header`, `song-card`, `pagination`, `entity-link`, `empty-state`, `youtube-embed`, `spotify-embed`
  - `data/` — curated flat files: `favorites.json` (song slugs, displayTitle overrides, annotations, listenFor notes)
  - `songs/[slug]/` — song detail page + lyrics toggle
  - `ragas/` — raga listing + `[slug]/` detail page (Hindi language default)
  - `artists/` — artist listing with role badges + `[slug]/` profile with role tabs
  - `films/` — paginated films listing + `[slug]/` detail page
  - `favorites/` — My Favorites personal canon page (6 songs, YouTube/Spotify embeds, annotations)
  - `about/` — About Alaap page (serious hobbyist framing, project origin)
  - `search/` — search with filters, autocomplete (`search-input.tsx`), and sort options
  - `api/search/suggest/` — autocomplete API route (song title suggestions with relevance tiering)
  - `api/keepalive/` — daily Vercel cron target; one tiny write keeps Aura Free from pausing (requires `CRON_SECRET`)
- `lib/` — shared modules
  - `neo4j.ts` — driver singleton, `read()`/`write()` helpers
  - `types.ts` — entity interfaces (Song, Raga, Artist, Film, Taal, etc.)
  - `data/` — typed Cypher query functions: `songs.ts`, `ragas.ts`, `artists.ts`, `films.ts`, `search.ts`, `home.ts`, `favorites.ts`, `utils.ts`
- `pipeline/` — Python data pipeline
  - `normalizers/` — curated dictionaries for artist names (~50), ragas (80+), song canonical IDs
  - `scrapers/` — 4 source scrapers: `bollywood_lyrics`, `carvaan`, `chandrakantha`, `wikipedia`
  - `loaders/neo4j_loader.py` — MERGE-based loader, batched, no APOC dependency
  - `reconcile.py` — merges staging JSONs by canonical_id with source-priority per field
  - `run_pipeline.py` — CLI orchestrator (`--scrape`, `--reconcile`, `--load`, `--all`)
  - `staging/` — intermediate JSON outputs (gitignored)
- `scripts/` — TypeScript maintenance scripts
  - `dedup.ts` — orchestrator for dedup (`--execute`, `--films-only`, `--artists-only`, `--songs-only`)
  - `dedup/` — modular dedup: `films.ts`, `artists.ts`, `songs.ts`, `normalize.ts` (schwa collapse, transliteration flattening), `merge.ts`, `types.ts`
  - `enrich-ragas.ts` — ragaDB enrichment orchestrator (`--execute`, `--local <path>`)
  - `enrich-ragas/` — modular enrichment: `types.ts`, `fetch.ts`, `normalize.ts` (name matching, note formatting, time/thaat normalization), `match.ts`, `apply.ts`
  - `run-cypher.ts` — runs a `.cypher` file statement by statement (`pnpm data:cypher <file>`); used for constraints and curation
  - `snapshot.ts` — full graph export/restore as gzipped JSONL (`pnpm data:snapshot`, `pnpm data:restore`)
  - `split-compound-artists.ts` — splits space-joined duet singer nodes ("Rafi Lata") into individuals via dictionary + alias table (`pnpm data:split-artists`, dry-run default). Run after dedup on every rebuild
- `db/` — `constraints.cypher`, `curation.cypher` (committed manual data fixes), and `README.md` (provisioning, backup, recovery runbook)
- `vercel.json` — daily keep-alive cron

## Technical Stack
- **Graph DB**: Neo4j Aura Free — Cypher queries, `neo4j-driver` for TypeScript
- **Frontend + API**: Next.js 15 (App Router), Server Components, Route Handlers
- **Styling**: Tailwind CSS + Radix UI
- **Data pipeline**: Python (scrapers, normalizers, loaders) — lives in `pipeline/`, runs locally via `uv run python run_pipeline.py`
- **Deployment**: Vercel (free tier) + Neo4j Aura Free — $0/month
- **NL search (Phase 2)**: Claude Haiku (text-to-Cypher) + Claude Sonnet (response formatting)
- **Graph viz**: react-force-graph-2d
- **Architecture doc**: `docs/architecture.md`

## Data Durability
Aura Free pauses an instance after 72 hours without activity and deletes it after 30 days paused. The original instance was deleted on 2026-08-23 and rebuilt on 2026-09-07 from archived pipeline staging. Rules that follow from that:
- **Keep-alive**: `vercel.json` schedules `/api/keepalive` daily (Hobby plan allows once per day). It writes a `Keepalive` node that nothing else reads. `CRON_SECRET` must exist on Vercel production.
- **Snapshots**: after any manual data change or enrichment run, `pnpm data:snapshot -- --out ../alaap-data/snapshots/alaap-YYYY-MM-DD.jsonl.gz`, then commit and push in the private `pmhatre/alaap-data` repo (sibling directory). Never commit snapshots here: they contain the full lyrics corpus and this repo is public. `db/snapshots/` is gitignored.
- **Restore**: `pnpm data:restore -- <file> --execute` (idempotent MERGE). Fallback rebuild from the staging archive is documented in `db/README.md`.
- **Manual fixes go in `db/curation.cypher`** and are applied with `pnpm data:cypher db/curation.cypher`. Hand edits made only in Neo4j are lost on the next rebuild.

## Domain Context
- **Raag** (raga) — melodic framework in Indian classical music. Central organizing concept.
- **Thaat** — parent scale. 10 thaats in Hindustani music, each spawning multiple ragas.
- **Taal** — rhythmic cycle (Teentaal, Ektaal, etc.)
- **Alankar** — ornamentation (murki, gamak, meend, taan, kan swar)
- **Playback singer** — in Indian film music, singers record songs separately from actors who lip-sync on screen. The composer, lyricist, and singer are distinct from the film's cast.
- **Golden era composers** — Naushad, S.D. Burman, R.D. Burman, Madan Mohan, Shankar-Jaikishan, O.P. Nayyar, Roshan, Salil Chowdhury, Khayyam, C. Ramchandra, Hemant Kumar
- **Golden era singers** — Lata Mangeshkar, Mohammed Rafi, Kishore Kumar, Asha Bhosle, Mukesh, Geeta Dutt, Talat Mahmood, Manna Dey, Hemant Kumar

## Alaap-Specific Personas

These activate via slash commands or automatically when the task context demands it. They supplement the global personas in `~/.claude/CLAUDE.md`.

### `/musicologist` — Hindustani Music Scholar
Think like a classically trained Hindustani musician and musicologist. Focus on:
- **Raga accuracy** — validate raga identifications, catch misattributions, verify thaat/aroha/avaroha/vadi/samvadi
- **Musical relationships** — reason about raga families (janak/janya), time theory (samay), rasa (mood/emotion), and how ragas relate to each other
- **Compositional analysis** — identify what makes a film composition classical vs. light, which ornamentations (alankar) are present, how the raga is treated
- **Cross-tradition connections** — relate Hindustani concepts to Carnatic equivalents where relevant
- **Data quality** — flag inconsistencies in musical data across sources, prioritize authoritative sources for musicological claims
- **Accessible explanation** — translate technical concepts for non-trained listeners without dumbing them down

### `/curator` — Golden Era Film Music Editor
Think like a deeply knowledgeable editor and cultural curator of golden era Hindi film music. Focus on:
- **Editorial voice** — write contextual annotations, recording stories, and "why this matters" narratives with warmth and authority
- **Historical context** — place compositions in their cultural moment: studio system dynamics, playback singer rivalries, composer-lyricist partnerships, censorship constraints
- **Canon judgment** — assess what makes a composition remarkable, which songs are essential listening, what deserves highlight vs. catalog-level treatment
- **Guided pathways** — design discovery sequences for different audiences (newcomers, raga-curious, deep listeners)
- **Praneet's voice** — the Favorites/personal canon prose is written by Praneet himself. Do not draft, rewrite, or polish it. When asked to help there, limit yourself to fact-checks (raga, year, film, personnel), typos, or a sentence of structural feedback
- **Completeness checks** — flag missing context that would make an entry feel thin (no recording story, no "why it matters", no related listening)

## Preferences
- This is a passion project, not a commercial product
- Prioritize depth and quality over breadth
- Keep the personal voice — Praneet's favorites section is core, not optional
- Accessible to non-classically-trained listeners while being musically rigorous

## Author's Perspective
Praneet is a serious hobbyist and music lover, not a trained musician or musicologist. The curiosity that drives Alaap comes from wanting to understand *why* certain songs have more repeat value than others — what makes them stick. That curiosity is what sends him down the path of ragas, ornamentation, and recording history. This framing matters for editorial voice: annotations should read as a curious listener sharing discoveries, not an authority lecturing. The tone is "here's what I found" rather than "here's what you should know."
