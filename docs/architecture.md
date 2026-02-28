# Technical Architecture

## Graph Database: Neo4j Aura Free

**Why Neo4j**: Best learning ecosystem (courses, docs, community), most mature TypeScript driver, generous free tier. Cypher is the most expressive graph query language for the traversal-heavy queries Alaap needs — raga recommendations, composer DNA overlap, related songs.

**Free tier**: 200K nodes, 400K relationships. More than enough for the golden era catalog (est. 5-10K songs, ~200 ragas, ~50 composers, ~100 singers, ~3K films).

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
| **Song** | title, titleDevanagari, slug, year, lyrics, lyricsTranslation, youtubeId, spotifyId, mood, notes |
| **Raga** | name, nameDevanagari, slug, aroha, avaroha, vadi, samvadi, timeOfDay, rasa, pakad, description |
| **Thaat** | name, nameDevanagari, spiccato (swar pattern) |
| **Artist** | name, nameDevanagari, slug, bio, birthYear, deathYear, imageUrl |
| **Film** | title, titleDevanagari, slug, year, language |
| **Taal** | name, nameDevanagari, beats, vibhaag, description |
| **Alankar** | name, nameDevanagari, description, audioExample |
| **Journey** | title, slug, description, difficulty, author |

### Relationships

```
(Song)-[:BASED_ON_RAGA]->(Raga)
(Song)-[:COMPOSED_BY]->(Artist)
(Song)-[:SUNG_BY]->(Artist)
(Song)-[:LYRICS_BY]->(Artist)
(Song)-[:FROM_FILM]->(Film)
(Song)-[:SET_TO_TAAL]->(Taal)
(Song)-[:FEATURES_ALANKAR {timestamp, description}]->(Alankar)
(Raga)-[:BELONGS_TO_THAAT]->(Thaat)
(Raga)-[:PARENT_OF]->(Raga)          // janak-janya
(Raga)-[:SIMILAR_TO {reason}]->(Raga)
(Journey)-[:INCLUDES {order, annotation}]->(Song)
(Artist)-[:COLLABORATED_WITH {count}]->(Artist)  // derived
```

**Key design decision**: Artist is a single node type. Roles (composer, singer, lyricist) live on the relationships, not the node. This handles multi-role artists naturally — Hemant Kumar composed AND sang, Kishore Kumar acted AND sang.

---

## Application Stack

### Frontend + API: Next.js 15 (App Router)

- **Server Components** for data-heavy pages (song detail, raga detail, artist profile)
- **Route Handlers** for API endpoints (not GraphQL — unnecessary complexity for a solo project)
- **Tailwind CSS** for styling
- **Radix UI** for accessible primitives (dialogs, dropdowns, tabs)
- **react-force-graph-2d** for graph visualization (F10)
- **lite-youtube-embed** for performant YouTube embeds

### Route Structure

```
app/
  page.tsx                    # Home — featured songs, recent additions
  songs/[slug]/page.tsx       # F2: Song detail
  ragas/[slug]/page.tsx       # F3: Raga detail
  artists/[slug]/page.tsx     # F4: Artist profile
  films/[slug]/page.tsx       # Film detail
  search/page.tsx             # F1: Multi-dimensional search
  explore/page.tsx            # F10: Graph visualization
  ask/page.tsx                # F6: Natural language search
  journeys/page.tsx           # F9: Guided pathways list
  journeys/[slug]/page.tsx    # F9: Individual journey
  favorites/page.tsx          # F8: Praneet's personal canon
  api/
    songs/route.ts
    ragas/route.ts
    artists/route.ts
    search/route.ts
    ask/route.ts              # Text-to-Cypher endpoint
```

### Database Access

- `neo4j-driver` (official JS driver) in a shared `lib/neo4j.ts` module
- Connection pooling via driver instance (singleton pattern)
- Cypher queries co-located with route handlers, not abstracted into an ORM

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
  reconcile.py               # Cross-source conflict detection
  requirements.txt
```

**Canonical song identifier**: `normalize(title) + normalize(film_title) + year`. Handles the cross-referencing problem across 15+ sources.

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

---

## Development Phases

### Phase 0: Scaffolding
- Initialize Next.js 15 project with App Router, Tailwind, TypeScript
- Set up Neo4j Aura Free instance
- Create `lib/neo4j.ts` connection module
- Create `pipeline/` directory with Python project structure
- Write Cypher schema constraints (unique slugs, indexes)

### Phase 1A: Seed Data
- Run Phase 1 scrapers (Wikipedia, Chandrakantha, Carvaan spreadsheet, Bollywood lyrics CSV)
- Load into Neo4j via idempotent MERGE queries
- Verify with Neo4j Browser queries

### Phase 1B: Core Pages (MVP — F1 through F4)
- Search page with multi-dimensional filters
- Song detail page
- Raga detail page
- Artist profile page
- Film page
- Home page with featured content

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
