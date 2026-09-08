# Data Sources & Attribution

> Alaap is built on data from multiple public sources. This document provides full transparency on where our data comes from, what we use from each source, and how we process it.

---

## Active Sources (Ingested)

These sources have been scraped, processed, and loaded into the Neo4j knowledge graph.

### 1. Chandrakantha.com

- **URL**: https://chandrakantha.com/music-and-dance/film-and-pop/film-songs-rags/
- **What we get**: Song title, film, year, raga, taal, composer, singer(s), lyricist, notes
- **Why it matters**: The only source with taal (rhythmic cycle) data. Authoritative raga identifications curated by a practitioner.
- **Coverage**: ~80 ragas, ~1,000+ songs
- **How used**: HTML scraper (`pipeline/scrapers/chandrakantha.py`) with `AlaapBot/0.1` User-Agent and a 2s delay between pages
- **Source priority**: Highest — trusted for raga and taal assignments over other sources

### 2. Wikipedia: List of Film Songs Based on Ragas

- **URL**: https://en.wikipedia.org/wiki/List_of_film_songs_based_on_ragas
- **What we get**: Song title, film, composer, singer(s), raga, language
- **Why it matters**: Broadest coverage of raga-to-song mappings. Only source with non-Hindi language tags (Telugu, Kannada, Tamil, Malayalam, Bengali, Marathi).
- **Coverage**: ~200+ ragas, multi-language, 1943-modern era
- **How used**: HTML scraper (`pipeline/scrapers/wikipedia.py`) with `AlaapBot/0.1` User-Agent
- **Source priority**: 2nd — good for breadth and language data
- **Note**: Some entries have combined language values ("Hindi&Telugu") that could be normalized in a future pass

### 3. Bollywood Lyrics (GitHub)

- **URL**: https://github.com/hbdeshmukh/bollywood-lyrics
- **What we get**: Song title, film, year, singer, composer, lyricist, full lyrics text
- **Why it matters**: Primary source for lyrics. Broad metadata coverage.
- **Coverage**: ~5,000+ songs, 1940s-2000s
- **How used**: CSV download (`pipeline/scrapers/bollywood_lyrics.py`)
- **License**: MIT
- **Source priority**: 3rd — used for lyrics and lyricist fields; lower confidence on raga data

### 4. Saregama Carvaan (GitHub)

- **URL**: https://github.com/labnol/saregama-carvaan
- **What we get**: Song title, film, singer, YouTube video IDs
- **Why it matters**: Only source for YouTube listen links.
- **Coverage**: ~5,000+ golden era songs
- **How used**: GitHub API to fetch markdown files per artist (`pipeline/scrapers/carvaan.py`)
- **Source priority**: 4th — used only for YouTube IDs

### 5. ragaDB (GitHub)

- **URL**: https://github.com/shockmonger/ragaDB
- **What we get**: Aroha (ascending scale), avaroha (descending scale), vadi (primary note), samvadi (secondary note), pakad (characteristic phrase), thaat (parent scale), time of day, jati
- **Why it matters**: Clean, structured JSON covering core Hindustani concert repertoire. Primary seed for raga musicological properties.
- **Coverage**: 237 ragas (75 matched to our existing Neo4j ragas)
- **How used**: Direct JSON fetch (`scripts/enrich-ragas/fetch.ts`)
- **Note notation**: Uppercase = shuddha (natural), lowercase = komal (flat), M = tivra (sharp Ma)

---

## How Sources Are Reconciled

When multiple sources provide data for the same song, we use a priority-based reconciliation system (`pipeline/reconcile.py`):

1. Songs are matched across sources by a canonical ID (normalized title + film)
2. For conflicting field values, we pick the source with higher priority (Chandrakantha > Wikipedia > Bollywood Lyrics > Carvaan)
3. The `sources` array on each node tracks which sources contributed data
4. Conflicts are logged to `staging/conflicts.json` for manual review (~2-3% of songs have raga disagreements)

---

## Curated Dictionaries

The pipeline includes hand-curated normalization dictionaries to handle transliteration variants:

- **Artist names** (`pipeline/normalizers/`): ~50 canonical artist name mappings
- **Raga names** (`pipeline/normalizers/`): 80+ raga name normalizations
- **Song canonical IDs** (`pipeline/normalizers/`): Title normalization for cross-source matching
- **ragaDB name mappings** (`scripts/enrich-ragas/normalize.ts`): ~30 manual raga name mappings for ragaDB-to-Neo4j matching

---

## Planned Sources (Researched, Not Yet Ingested)

Full assessment in `docs/research/data-sources.md` and `docs/research/guru-knowledge-sources.md`.

### Phase 2: Raga Enrichment

| Source | URL | Data | Notes |
|--------|-----|------|-------|
| Chandrakantha raga pages | chandrakantha.com | ~44 raga detail pages | Extend existing scraper |
| Wikipedia raga articles | en.wikipedia.org | Raga theory properties | Structured tables |
| LearnRagas | learnragas.com | 75 ragas with audio | Beginner-friendly descriptions |
| Raga Junglism | ragajunglism.org | 1,000+ ragas, 365+ detailed | Richest structured raga data found |
| Ocean of Ragas | oceanofragas.com | 1,800+ ragas | Most exhaustive by count |

### Phase 3: Deep Enrichment & Knowledge Layer

| Source | URL | Data | Notes |
|--------|-----|------|-------|
| HindiGeetMala | hindigeetmala.net | 40-60K songs, ratings, charts | Binaca Geetmala 1953-1983 |
| MySwar.co | myswar.co | Deep production credits | Arrangers, instrumentalists, studios |
| Rajan Parrikar Archive | parrikar.org | ~40 deep raga essays | RAG context for Guru persona |
| The Raga Guide (Joep Bor) | archive.org | 74 ragas, scholarly | OCR required; gold standard reference |
| Tanarang | tanarang.com | 120 ragas, 1,500+ bandish | Composition-level knowledge |
| Raag Hindustani | raag-hindustani.com | 500 ragas, 3,000 bandish, 64 taals | Non-commercial license |
| Keep Alive Bollywood | keepalivebollywood.com | Binaca Geetmala charts 1953-1993 | Endorsed by Ameen Sayani |

### Contextual / Narrative Sources

| Source | URL | Value |
|--------|-----|-------|
| Songs of Yore | songsofyore.com | Classical-to-film raga pairings |
| MrAndMrs55 | mrandmrs55.com | Song translations, cultural context |
| Down Melody Lane | downmelodylane.com | Composer bios, filmographies |
| PanchamMagic | panchammagic.org | R.D. Burman resource |
| Dustedoff | madhulikaliddle.com | Classic Hindi cinema/music reviews |

### Composer-Specific Sites

| Source | URL | Coverage |
|--------|-----|----------|
| Madan Mohan Official | madanmohan.in | 100+ films, 600+ songs |
| Geeta Dutt Official | geetadutt.com | Complete discography |
| Mohammed Rafi Discography | mohdrafi.com | 5,052 songs (1942-1980) |

---

## Academic & Computational References

These aren't direct data sources but inform the project's approach:

- **compIAM** — Python library for computational Indian art music (potential Phase 3+ audio analysis)
- **Saraga Dataset** — 96.3 hours of annotated Hindustani and Carnatic recordings
- **Bhatkhande's Kramik Pustak Malika** — Foundational text for the 10-thaat system used by Alaap's raga classification
- **Hindi Cine Raag Encyclopaedia (K.L. Pandey)** — Print-only, 5 volumes, 20,000+ songs. Most comprehensive but not digitized.
- **Hindi Film Geet Kosh (Hamraaz)** — ~100,000 songs cataloged; being digitized at hamraaz.org

---

## Principles

- **No authenticated APIs**: All sources are public websites, open GitHub repos, or open datasets
- **Respectful scraping**: Custom User-Agent headers, reasonable request rates, robots.txt compliance
- **Source tracking**: Every node in the graph carries a `sources` array documenting provenance
- **Non-destructive enrichment**: New sources add data but never overwrite manually curated fields
- **Transparency**: This document exists because attribution matters. These creators built the resources that make Alaap possible.
