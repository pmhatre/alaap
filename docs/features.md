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

### Language Tagging

Song nodes currently have no `language` property. South Indian songs (Tamil, Telugu, Kannada, Malayalam) show up alongside Hindi songs on raga pages and in search results with no way to distinguish or filter. Needs:

- Add `language` property to Song nodes (likely infer from film metadata or source)
- Language filter in search UI
- Visual indicator on song cards (badge or subtitle)
- Option to scope raga/artist pages by language

### ~~Relevance-Based Search Sorting~~ ✓ Shipped

Implemented as a sort option in search. Relevance scoring: exact match > starts-with > contains. Pre-sorted before relationship expansion in Cypher. Future improvements: metadata richness weighting, source count boosting, Hindi-first sorting on raga pages once language tagging exists.

### Other Ideas

- Community contributions (allow others to submit raga identifications, annotations)
- Audio analysis integration (computational raga identification for untagged songs via compIAM)
- Multilingual support (Hindi/Urdu/English toggle)
- Mobile app
- Podcast/blog companion content
- Streaming integration (Spotify playlist generation based on raga/mood)
