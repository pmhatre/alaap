# Alaap

## What This Is
A knowledge base and exploratory interface for golden era Indian film music (late 1940s-1970s), with emphasis on classical and semi-classical compositions. Built as a personal project by Praneet Mhatre.

## Project Status
Phase 0 (scaffolding) complete. Next.js 15 app and Python pipeline are set up. Ready for Phase 1A (data seeding) and Phase 1B (core pages).

## Key Documentation
- `docs/vision.md` — project vision, thesis, design principles
- `docs/features.md` — feature roadmap (Phases 1-3 + parking lot)
- `docs/research/data-sources.md` — exhaustive data source assessment (Tiers 1-4)
- `docs/research/data-ingestion-plan.md` — prioritized ingestion plan
- `docs/architecture.md` — technical architecture, entity model, development phases

## Project Structure
- `app/` — Next.js 15 App Router (pages, layouts)
- `lib/` — shared modules (`neo4j.ts` driver singleton, `types.ts` entity interfaces)
- `pipeline/` — Python data pipeline (scrapers, normalizers, loaders, staging)
- `db/` — Neo4j schema constraints and setup instructions

## Technical Stack
- **Graph DB**: Neo4j Aura Free — Cypher queries, `neo4j-driver` for TypeScript
- **Frontend + API**: Next.js 15 (App Router), Server Components, Route Handlers
- **Styling**: Tailwind CSS + Radix UI
- **Data pipeline**: Python (scrapers, normalizers, loaders) — lives in `pipeline/`, runs locally
- **Deployment**: Vercel (free tier) + Neo4j Aura Free — $0/month
- **NL search (Phase 2)**: Claude Haiku (text-to-Cypher) + Claude Sonnet (response formatting)
- **Graph viz**: react-force-graph-2d
- **Architecture doc**: `docs/architecture.md`

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
- **Praneet's voice** — when writing for the Favorites/personal canon sections, channel a personal, passionate tone — not encyclopedic
- **Completeness checks** — flag missing context that would make an entry feel thin (no recording story, no "why it matters", no related listening)

## Preferences
- This is a passion project, not a commercial product
- Prioritize depth and quality over breadth
- Keep the personal voice — Praneet's favorites section is core, not optional
- Accessible to non-classically-trained listeners while being musically rigorous
