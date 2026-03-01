# Feature Roadmap

## North Star

The raw data Alaap uses is a commodity — raga names, song metadata, artist catalogs all exist scattered across the internet. What makes Alaap uniquely valuable is the compounding intelligence layer built on top:

1. **The graph structure** — Nobody else maps Indian film songs → ragas → thaats → composers → eras in a queryable knowledge graph. The relationships are the product, not the nodes.
2. **The Guru's accumulated knowledge** — Every curated annotation, musicological insight, and "why this matters" narrative adds to a knowledge base that doesn't exist elsewhere. Over time, this becomes an authoritative reference.
3. **Derived intelligence** — Novel insights that emerge from the combination: which composers stretched raga grammar, which decade had the most classical depth, which raga-mood combinations produce the most beloved compositions. These don't exist in any source we're ingesting.
4. **Computational understanding** (long-term) — A system that can listen to a recording and place it in the Hindustani theoretical framework. This would be genuinely novel in a consumer-facing form.

The unique value prop compounds with every feature built, every annotation written, and every pattern recognized across the graph.

---

## Phase 1: Foundation (MVP) ✓

### F1. Multi-dimensional Search ✓

Core feature. Search the knowledge base across several dimensions:

- **By Raag** — find all songs based on a specific raga (e.g., Yaman, Bhairavi, Darbari)
- **By Taal** — find songs by rhythmic cycle (e.g., Teentaal, Ektaal, Keherwa)
- **By Composer** — browse a composer's catalog (Naushad, Madan Mohan, S.D. Burman, etc.)
- **By Singer** — browse by playback singer
- **By Film** — all songs from a specific film soundtrack
- **By Era/Decade** — temporal browsing
- **Autocomplete** — type-ahead song suggestions with relevance tiering (exact → starts-with → word-boundary → contains), 250ms debounce, keyboard navigation
- **Sort options** — newest first (default), oldest first, title A-Z, relevance (when text query active)

Each result returns the song with its full graph of relationships (raga, composer, singer, lyricist, film, year, taal, mood).

### F2. Song Detail View ✓

Rich page per song showing:

- Core metadata (title, film, year, composer, lyricist, singer(s))
- Raga information (name, thaat, aroha/avaroha, vadi/samvadi, time of day, mood/rasa)
- Taal information (if available)
- YouTube embed (lazy-loaded, click-to-play)
- Contextual annotation (what makes this composition notable, recording context)
- Lyrics (transliteration + Devanagari + English translation where available)
- Related songs (same raga, same composer, similar mood)

### F3. Raag Detail View ✓

Rich page per raga showing:

- Properties (thaat, aroha, avaroha, vadi, samvadi, time of day, rasa/mood, janak/janya relationships)
- All film songs based on this raga in the knowledge base
- Audio sample of the raga in its pure classical form
- Brief educational explanation (accessible to non-trained listeners)

### F4. Composer / Singer / Lyricist Profiles ✓

Pages for key artists with:

- Biography and career context
- Complete catalog within the knowledge base
- Signature ragas (which ragas they used most)
- Notable collaborations

### Quick Wins (post-Phase 1) ✓

Shipped alongside Phase 1:

- **YouTube listen links** — song cards link directly to YouTube (play icon)
- **Clickable composers** — composer names on song cards are EntityLinks to artist profiles
- **Films browse page** — paginated grid at `/films`, ordered by song count, green hover styling
- **Artist dedup** — script to find/merge duplicate artist nodes from transliteration variants (60 groups, 63 merged)
- **Improved dedup normalizer** — Hindi schwa collapse and "(film)" suffix stripping; caught 78 additional film dupes and 307 total song dupes across runs

---

## Phase 2: Discovery & Intelligence

### F5. "If You Like X, You'll Also Like Y"

Graph-powered recommendations:

- Song → songs sharing the same raga, similar mood, same era
- Raga → related ragas (same thaat, similar mood, adjacent time-of-day)
- Composer → composers with overlapping raga preferences or similar classical depth
- Cross-tradition: "If you appreciate this aspect of Western music, here's what will resonate in Indian film music"

This is where the graph DB earns its keep — these are traversal queries.

### F6. Natural Language Search

Conversational interface where users can ask open-ended questions:

- "Which Lata songs are based on evening ragas?"
- "What are the best classical compositions from the 1950s?"
- "Show me songs where the murki work is exceptional"
- "What ragas did Madan Mohan favor?"

Powered by LLM with the knowledge graph as context.

### F7. Ornamentation (Alankar) — via Guru

Originally scoped as "search by ornamentation" with metadata tagging, but alankar identification is inherently subjective and context-dependent (a murki shades into a kan swar depending on performer style). Metadata-based tagging hits a wall here.

**Reframed approach**: Fold into the Guru co-pilot feature rather than building as standalone search.

- **Curated annotations** (near-term) — Timestamped notes on specific compositions: "listen to Lata's meend at 2:15", "exceptional taan work in the antara". Stored as rich annotations on Song nodes. Start with the personal canon (F8) songs. The curator persona is the right voice for this.
- **Guru-assisted identification** (mid-term) — The Guru uses its knowledge layer to suggest: "this passage likely contains gamak based on the melodic contour." Pattern recognition grounded in raga theory, not audio analysis.
- **Computational detection** (stretch) — compIAM has some ornament detection, but film songs with orchestration make this much harder than solo classical. Bleeding-edge MIR research territory.

Ornamentations to cover:

- **Murki** — quick grace notes
- **Gamak** — heavy oscillation
- **Meend** — glide between notes
- **Taan** — rapid melodic passages
- **Kan swar** — touch notes

---

## Phase 3: Soul & Community

### F8. Praneet's Favorites / Personal Canon

A curated, personal section:

- The songs that drew me into classical-leaning Hindi film music
- Personal annotations — why each song matters, the story of discovering it
- A guided journey for newcomers ("start here, then explore these")
- Adds soul and personal voice to what could otherwise feel like a database

This is NOT optional — it's what makes the project feel alive and human.

### F9. Guided Journeys / Curated Pathways

Structured discovery paths:

- "Introduction to Raag-Based Film Songs" (beginner pathway)
- "The Naushad Masterclass" (composer deep-dive)
- "The Classical Trinity: Lata, Rafi, and the Ragas They Owned"
- "From Bhairav to Bhairavi: A Day in Ragas Through Film Songs"
- Potentially user-contributed pathways later

### F10. Graph Visualization

Visual, interactive exploration of the knowledge graph:

- See how ragas connect to thaats, to songs, to composers
- Zoom into clusters (which composers share raga DNA?)
- Click-to-explore navigation

Could be a simple force-directed graph or something more designed.

---

## Parking Lot

### ~~Language Tagging~~ ✓ Shipped

All 4 scrapers emit language (Wikipedia captures from Lang column, others default Hindi). Search has language filter dropdown, song cards show purple badge for non-Hindi, song detail shows Language metadata row. ~230 non-Hindi songs (Telugu, Kannada, Tamil, Malayalam, Bengali, Marathi) now in DB. Future: normalize combined Wikipedia values ("Hindi&Telugu"), Hindi-first sorting on raga pages.

### ~~Relevance-Based Search Sorting~~ ✓ Shipped

Implemented as a sort option in search. Relevance scoring: exact match > starts-with > contains. Pre-sorted before relationship expansion in Cypher. Future improvements: metadata richness weighting, source count boosting.

---

## Ongoing: Design Refresh

The app is functional but visually bare-bones. Given the subject matter (golden era Indian film music, classical tradition) and the project name (Alaap — the opening, exploratory movement of a raga), the design should reflect that identity. Areas to address:

- **Color palette** — warm tones that evoke the era (golds, deep reds, cream), replacing the generic neutral Tailwind defaults
- **Typography** — consider serif or display fonts for headings that nod to the period; Devanagari-friendly type pairing
- **Visual identity** — logo/wordmark for "Alaap", subtle motifs or textures inspired by Indian classical aesthetics
- **Layout refinement** — the home page, song detail, and raga pages deserve more considered information hierarchy and visual rhythm
- **Dark mode** — consider whether a warm dark theme suits the content better
- **Mobile polish** — responsive breakpoints work but aren't designed with care

This is iterative, not a big-bang redesign. Can be tackled page-by-page.

### Design system specifics identified

- **Entity link legend** — amber/gold = raga, blue = artist, green = film. Currently undocumented to the user. Add a legend or tooltip system so the color-coding is self-explanatory, especially on the search results page.
- **Artist role badges** — the artists listing page mixes singers, composers, and lyricists with no visual differentiation. Add role tags (e.g., "composer", "singer", "lyricist") or color-code by role. Data exists in the graph via relationship types (COMPOSED_BY, SUNG_BY, LYRICS_BY).
- **Consistent visual language** — ensure the design system communicates entity types and relationships clearly across all pages.

---

## Ongoing: Domain Knowledge & Persona Enrichment ("Guru" Co-Pilot)

The `/musicologist` and `/curator` personas in CLAUDE.md are behavioral prompts — they shape how Claude reasons about the domain but don't add knowledge Claude doesn't already have. The goal is to build toward a "Guru" co-pilot: a PhD-level, encyclopedic Hindustani music expert grounded in Bhatkhande's systematization, available as an in-app feature.

The Guru converges with F6 (Natural Language Search), F7 (Ornamentation), and the archivist knowledge layer. It's the single most ambitious feature on the roadmap — a chat-based interface where users can ask open-ended musicological questions and get answers grounded in real data.

### Three-stage build

1. **Enrich the graph** (Phase 2A) — Three sources ingested:
   - ✅ **ragaDB**: 75 ragas enriched with aroha/avaroha/vadi/samvadi/pakad/timeOfDay
   - ✅ **Chandrakantha**: 34 ragas get scholarly descriptions (first source for descriptions), thaat, vadi, samvadi, timeOfDay. Script: `scripts/enrich-chandrakantha.ts`
   - ✅ **Wikipedia**: 65 ragas enriched via MediaWiki API Infobox raga parsing (aroha, avaroha, pakad, thaat). Script: `scripts/enrich-wikipedia.ts`
   - **Current coverage**: 34 descriptions, 92 aroha, 92 thaat, 10 canonical Thaat nodes. Remaining: LearnRagas (75), Ocean of Ragas (1,800+). See `docs/research/guru-knowledge-sources.md`.
2. **RAG-backed chat interface** (Phase 2B) — Build the NL search (F6) with the enriched graph as context. LLM queries the graph, retrieves relevant raga/song/artist data, and responds with the Guru's musicological voice.
3. **Audio analysis** (Phase 3+, stretch) — Computational raga identification via compIAM/Saraga. Film songs are harder than solo classical (orchestration, loose raga treatment). Realistic for pure classical recordings, experimental for film songs.

### Knowledge layer (feeds the Guru)

- **Raga reference data** — 92 ragas have aroha/avaroha/thaat (ragaDB + Wikipedia), 34 have scholarly descriptions (Chandrakantha). Three sources ingested; remaining ~182 ragas need LearnRagas/Ocean of Ragas.
- **Editorial annotations** — recording context, "why this matters" narratives, compositional analysis notes (Phase 3 F8/F9 content)
- **Authoritative sources** — ragaDB (primary seed, 75 ragas), Chandrakantha (34 descriptions), Wikipedia Infobox (65 ragas). Remaining: Rajan Parrikar essays, LearnRagas. Full assessment: `docs/research/guru-knowledge-sources.md`
- **Archivist knowledge** — recording history, industry context, commercial success data (see Archivist section above)
- **Curated corrections** — a feedback loop where Praneet flags musicological errors and the correction gets persisted

### Persona improvement path

- Personas are static text in CLAUDE.md — they don't learn between sessions automatically
- They improve when: (a) richer data enters the graph, (b) persona instructions get refined based on observed shortcomings, (c) retrieval paths are built so the persona pulls relevant context before answering
- Long-term: the personas could be backed by a retrieval system (RAG over raga/composition reference material) rather than relying on Claude's training data alone

### Archivist knowledge layer

Distinct from the musicological knowledge (raga theory, thaat system) — this is the recording history and film industry knowledge domain:

- **Recording stories** — who recorded where, studio conditions, retakes, creative disputes
- **Industry context** — HMV/Columbia sales data, studio system dynamics, singer-composer partnerships and rivalries
- **Cultural impact** — which songs became anthems, which were sleepers that found audiences later
- **Production history** — the shift from mono to stereo, playback recording techniques, notable recording innovations

This knowledge feeds the `/curator` persona and enriches song annotations with historical depth. Sources: published interviews, documentaries (e.g., Lata Mangeshkar documentary with HMV head), biographies, oral history archives.

### ~~F11. Commercial Success & Charts (Binaca Geetmala)~~ ✓ Shipped

Binaca Geetmala charts page at `/charts?year=YYYY`. 1,197 entries: full ranked charts (1953-1993) + #1 toppers (1994-2000). CSV source of truth with Neo4j enrichment for linked songs. Top 10 shown per year. Geetmala badges on song cards and detail pages. 486 songs matched to Neo4j.

#### F11b. Geetmala Aggregate Visualizations (future)

- **Most charted singers** — who dominated the Geetmala across decades (Lata, Rafi, Kishore, Kumar Sanu eras)
- **Most charted composers** — Shankar-Jaikishan vs Laxmikant-Pyarelal vs Nadeem-Shravan dominance by era
- **Raga × popularity** — which ragas produced the most Geetmala hits? Do classical ragas chart differently than light compositions?
- **Era analysis** — songs per film, composer concentration, singer diversity over time
- **Interactive timeline** — visual arc of the Geetmala's 48-year run

### Other Ideas

- Community contributions (allow others to submit raga identifications, annotations)
- Audio analysis integration (computational raga identification for untagged songs via compIAM)
- Multilingual support (Hindi/Urdu/English toggle)
- Mobile app
- Podcast/blog companion content
- Streaming integration (Spotify playlist generation based on raga/mood)
