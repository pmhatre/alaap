# Technical Architecture

## Graph Database: Neo4j Aura Free

**Why Neo4j**: Best learning ecosystem (courses, docs, community), most mature TypeScript driver, generous free tier. Cypher is the most expressive graph query language for the traversal-heavy queries Alaap needs — raga recommendations, composer DNA overlap, related songs.

**Free tier**: 200K nodes, 400K relationships. Current usage: 15.5K songs, 253 ragas, 4.5K artists, 5.8K films, 37 taals — well within limits.

**Alternatives considered and rejected**:
- **Memgraph** — faster but weaker TS ecosystem, smaller community
- **SurrealDB** — multi-model but immature, weaker graph traversals
- **PostgreSQL + AGE** — familiar but fights the relational model, poor tooling
- **FalkorDB** — Redis-based, good perf but tiny community
- **Gel (EdgeDB)** — elegant but not a true graph DB, no graph algorithms

---

## Entity Model (Property Graph)

### Nodes

| Node | Key Properties |
|------|---------------|
| **Song** | title, titleDevanagari, slug, year, lyrics, lyricsTranslation, youtubeId, spotifyId, mood[] (array), notes, sources[] |
| **Raga** | name, nameDevanagari, slug, aroha, avaroha, vadi, samvadi, timeOfDay, rasa, pakad, description, sources[] |
| **Thaat** | name, nameDevanagari, swaras (swar pattern) |
| **Artist** | name, nameDevanagari, slug, bio, birthYear, deathYear, imageUrl, sources[] |
| **Film** | title, titleDevanagari, slug, year, language, sources[] |
| **Taal** | name, nameDevanagari, beats, vibhaag, description |
| **Alankar** | name, nameDevanagari, description, audioExample |
| **Journey** | title, slug, description, difficulty, author |

### Relationships

```
(Song)-[:BASED_ON_RAGA {primary, section}]->(Raga)  // multi-raga songs: primary flag + section label
(Song)-[:COMPOSED_BY]->(Artist)
(Song)-[:SUNG_BY]->(Artist)
(Song)-[:LYRICS_BY]->(Artist)
(Song)-[:FROM_FILM]->(Film)             // optional — non-filmi songs won't have this
(Song)-[:SET_TO_TAAL]->(Taal)
(Song)-[:FEATURES_ALANKAR {timestamp, description}]->(Alankar)
(Raga)-[:BELONGS_TO_THAAT]->(Thaat)
(Raga)-[:PARENT_OF]->(Raga)          // janak-janya
(Raga)-[:SIMILAR_TO {reason}]->(Raga)
(Journey)-[:INCLUDES {order, annotation}]->(Song)
(Artist)-[:COLLABORATED_WITH {count}]->(Artist)  // derived
```

**Key design decisions**:

- **Single Artist node type** — roles (composer, singer, lyricist) live on the relationships, not the node. This handles multi-role artists naturally — Hemant Kumar composed AND sang, Kishore Kumar acted AND sang.
- **`sources[]` array on major nodes** — tracks which data sources contributed to each entity (e.g., `["wikipedia", "chandrakantha", "hindigeetmala"]`). Critical for reconciliation when sources conflict.
- **`mood[]` as array property** — songs often carry multiple moods (romantic + melancholic). Array properties are natively supported in Neo4j. Can be promoted to a `Mood` node later if mood-based traversals become important.
- **`FROM_FILM` is optional** — non-filmi songs (ghazals, devotional, independent) exist without a film relationship.
- **`BASED_ON_RAGA` supports multi-raga songs** — songs that shift ragas or use raga-mala style get multiple edges, with `primary` (boolean) and `section` (string, e.g., "mukhda", "antara") as relationship properties.

---

## Application Stack

### Frontend + API: Next.js 15 (App Router)

- **Server Components** for data-heavy pages (song detail, raga detail, artist profile) — fetch directly from Neo4j, no API routes needed
- **Client Components** only for interactivity (search filters, lyrics toggle, YouTube embed)
- **Tailwind CSS** for styling
- **Radix UI** for accessible primitives (dialogs, dropdowns, tabs)
- **react-force-graph-2d** for graph visualization (F10, planned)
- **YouTube embeds** via custom facade pattern (thumbnail → iframe on click)

### Route Structure

```
app/
  # Implemented (Phase 1B)
  page.tsx                    # Home — stats, featured ragas, browse cards
  songs/[slug]/page.tsx       # F2: Song detail
  ragas/page.tsx              # Raga listing (paginated)
  ragas/[slug]/page.tsx       # F3: Raga detail
  artists/page.tsx            # Artist listing (paginated)
  artists/[slug]/page.tsx     # F4: Artist profile with role tabs
  films/[slug]/page.tsx       # Film detail
  search/page.tsx             # F1: Multi-dimensional search with filters
  components/                 # Shared UI: header, song-card, pagination, entity-link, etc.

  # Planned (Phase 2+)
  explore/page.tsx            # F10: Graph visualization
  ask/page.tsx                # F6: Natural language search
  journeys/page.tsx           # F9: Guided pathways list
  journeys/[slug]/page.tsx    # F9: Individual journey
  favorites/page.tsx          # F8: Praneet's personal canon
```

### Database Access

- `neo4j-driver` (official JS driver) in a shared `lib/neo4j.ts` module
- Connection pooling via driver instance (singleton pattern)
- Cypher queries in typed functions under `lib/data/` (songs, ragas, artists, films, search, home), imported by Server Components

### Natural Language Search (F6 — Phase 2)

- User query → Claude Haiku generates Cypher → execute against Neo4j → Claude Sonnet formats response
- System prompt includes schema definition + example queries
- Safety: read-only Neo4j user for the NL search endpoint

---

## Data Pipeline (Python)

Lives in `pipeline/`. Not deployed — runs locally.

```
pipeline/
  scrapers/                  # Source-specific scrapers
    wikipedia.py             # Phase 1: Wikipedia raga-song tables
    chandrakantha.py         # Phase 1: Already-scraped data (inovizz/scraping)
    carvaan.py               # Phase 1: Saregama spreadsheet
    bollywood_lyrics.py      # Phase 1: hbdeshmukh CSV
    raga_junglism.py         # Phase 2: Raga properties
    raag_hindustani.py       # Phase 2: Raga properties
    hindigeetmala.py         # Phase 3: Deep song metadata
  normalizers/               # Clean and standardize data
    names.py                 # Artist name normalization
    songs.py                 # Canonical song ID: normalize(title) + normalize(film) + year
    ragas.py                 # Raga name variants → canonical name
  loaders/                   # Load into Neo4j
    neo4j_loader.py          # Cypher MERGE queries, idempotent
  staging/                   # Intermediate canonical JSON (gitignored)
  reconcile.py               # Cross-source conflict detection
  requirements.txt
```

**Staging layer**: Scrapers write normalized JSON to `pipeline/staging/` before loading into Neo4j. Benefits:
- Data is versionable in git — diff between pipeline runs
- Debug and inspect without querying Neo4j
- Decouples scraping from loading — re-run loader without re-scraping
- Enables dry-run validation before loading

**Canonical song identifier**: `normalize(title) + normalize(film_title) + year`. Handles the cross-referencing problem across 15+ sources. Edge cases:
- **Non-filmi songs** (ghazals, devotional, independent) — film component is omitted; identity falls back to `normalize(title) + normalize(primary_singer) + year`
- **Title collisions** within the same film+year (rare) — disambiguate by adding primary singer to the key

**Pipeline phases align with data ingestion plan** (see `docs/research/data-ingestion-plan.md`):
- Phase 1 scrapers → seed knowledge base (Wikipedia, Chandrakantha, Carvaan, Bollywood Lyrics)
- Phase 2 scrapers → enrich raga properties (Raga Junglism, Raag Hindustani)
- Phase 3 scrapers → deepen song metadata (HindiGeetMala)

---

## Deployment

| Component | Host | Cost |
|-----------|------|------|
| Next.js app | Vercel (free tier) | $0 |
| Neo4j | Aura Free | $0 |
| Domain (optional) | Namecheap / Cloudflare | ~$10/yr |

**Total**: $0-10/month. No infrastructure to manage.

**Free tier ceiling**: Aura Free allows 200K nodes and 400K relationships. Current usage (~26K nodes) fits comfortably. If HindiGeetMala's full 40-60K catalog is ingested later (each song producing ~6-8 relationships), the ceiling gets tight. Options at that point: Aura Pro ($65/mo), self-hosted Neo4j Community, or scope the catalog more tightly to the golden era.

---

## Development Phases

### Phase 0: Scaffolding ✓
- Initialize Next.js 15 project with App Router, Tailwind, TypeScript
- Set up Neo4j Aura Free instance
- Create `lib/neo4j.ts` connection module
- Create `pipeline/` directory with Python project structure
- Write Cypher schema constraints (unique slugs, indexes)

### Phase 1A: Seed Data ✓
- Run Phase 1 scrapers (Wikipedia, Chandrakantha, Carvaan spreadsheet, Bollywood lyrics CSV)
- Load into Neo4j via idempotent MERGE queries
- Result: 15.5K songs, 4.5K artists, 5.8K films, 253 ragas, 37 taals

### Phase 1B: Core Pages (MVP — F1 through F4) ✓
- Search page with multi-dimensional filters (query, raga, composer, singer, decade, taal)
- Song detail page with metadata grid, raga cards, YouTube embed, collapsible lyrics
- Raga listing + detail page with properties and paginated song list
- Artist listing + profile page with signature ragas, collaborators, role tabs
- Film detail page with song list
- Home page with stats bar, featured ragas, browse cards
- Shared components: header, song-card, pagination, entity-link, empty-state, youtube-embed
- Data query layer: `lib/data/` with typed Cypher functions for all entities

### Phase 2A: Enrich Data
- Run Phase 2 scrapers (Raga Junglism, Raag Hindustani) for raga properties
- Run Phase 3 scrapers (HindiGeetMala) for deeper song metadata
- Cross-reference and reconcile

### Phase 2B: Discovery Features (F5-F7)
- "If you like X" recommendations (graph traversals)
- Natural language search (Text-to-Cypher via Claude)
- Ornamentation search (curated tagging)

### Phase 3: Soul (F8-F10)
- Praneet's favorites / personal canon
- Guided journeys
- Graph visualization
