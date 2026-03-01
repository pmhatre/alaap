# Feature Roadmap

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

### F7. Search by Ornamentation (Alankar)

Surface songs that are classic examples of specific ornamentations:

- **Murki** — quick grace notes
- **Gamak** — heavy oscillation
- **Meend** — glide between notes
- **Taan** — rapid melodic passages
- **Kan swar** — touch notes

Start as curated highlights rather than comprehensive tagging. Phase in over time.

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

---

## Ongoing: Domain Knowledge & Persona Enrichment

The `/musicologist` and `/curator` personas in CLAUDE.md are behavioral prompts — they shape how Claude reasons about the domain but don't add knowledge Claude doesn't already have. The goal is to build toward PhD-level, encyclopedic domain expertise by giving the personas a real knowledge layer to draw on.

### Knowledge layer (feeds the personas)

- **Raga reference data** — aroha/avaroha/vadi/samvadi/pakad/thaat/time/rasa for all 278 ragas (Phase 2A enrichment, stored in Neo4j)
- **Editorial annotations** — recording context, "why this matters" narratives, compositional analysis notes (Phase 3 F8/F9 content)
- **Authoritative sources** — ingest from Chandrakantha raga descriptions, Rajan Parrikar essays, Wikipedia musicology sections
- **Curated corrections** — a feedback loop where Praneet flags musicological errors and the correction gets persisted

### Persona improvement path

- Personas are static text in CLAUDE.md — they don't learn between sessions automatically
- They improve when: (a) richer data enters the graph, (b) persona instructions get refined based on observed shortcomings, (c) retrieval paths are built so the persona pulls relevant context before answering
- Long-term: the personas could be backed by a retrieval system (RAG over raga/composition reference material) rather than relying on Claude's training data alone

### Other Ideas

- Community contributions (allow others to submit raga identifications, annotations)
- Audio analysis integration (computational raga identification for untagged songs via compIAM)
- Multilingual support (Hindi/Urdu/English toggle)
- Mobile app
- Podcast/blog companion content
- Streaming integration (Spotify playlist generation based on raga/mood)
