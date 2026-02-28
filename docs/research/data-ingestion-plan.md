# Data Ingestion Plan

Prioritized by effort-to-value ratio. Each phase builds on the previous.

## Phase 1: Seed the Knowledge Base

Low effort, structured sources. Gets us to a working prototype.

| # | Source | What We Get | Format | Effort |
|---|--------|-------------|--------|--------|
| 1 | Wikipedia "List of Film Songs Based on Ragas" | Song-raga mappings with composer/singer | API / DBpedia CSV | Low |
| 2 | Chandrakantha.com | ~80+ ragas, songs with **taal** data | Already scraped (GitHub: inovizz/scraping) | Low |
| 3 | Indiapicks.com S.N. Tata index | 167 ragas → film songs | HTML scraping | Medium |
| 4 | Bollywood-lyrics (GitHub: hbdeshmukh) | Lyrics + metadata, 1940s-2000s | CSV, MIT license | Low |
| 5 | Saregama Carvaan spreadsheet (GitHub: labnol) | 5,000+ songs with YouTube links | Google Sheets | Low |

**Outcome**: A knowledge base with several hundred raga-tagged songs, basic metadata, and YouTube links.

## Phase 2: Enrich with Raga Properties

Build the raga taxonomy — the structural backbone of the graph.

| # | Source | What We Get | Format | Effort |
|---|--------|-------------|--------|--------|
| 6 | Raga Junglism | 1,000+ ragas: swara strings, families, time-of-day, symmetry | HTML scraping | Medium |
| 7 | Raag Hindustani | ~500 ragas with audio, notation, structural analysis | HTML scraping | Medium |
| 8 | Multitask Carnatic Dataset | 40 ragas: aaroh/avroh/melakarta/janak-janya | Zenodo download | Low |

**Outcome**: Every raga in the knowledge base has rich properties — thaat, scale, mood, time, related ragas.

## Phase 3: Deepen Song Metadata

Scale up from hundreds to thousands of songs with full metadata.

| # | Source | What We Get | Format | Effort |
|---|--------|-------------|--------|--------|
| 9 | HindiGeetMala | 40-60K songs, all golden era films | HTML scraping (movie pages by year) | High |
| 10 | MySwar.co | Deep credits (arrangers, studios, instrumentalists) | HTML scraping | High |
| 11 | Keep Alive Bollywood | Binaca Geetmala charts 1953-1993 | Structured web data | Medium |
| 12 | Giitaayan | 10,000+ songs with lyrics | GitHub CSV | Low |

**Outcome**: Comprehensive golden era catalog with deep metadata.

## Phase 4: Contextual/Narrative Enrichment

Add the "soul" layer — what makes each song, raga, and composer remarkable.

| # | Source | What We Get | Format | Effort |
|---|--------|-------------|--------|--------|
| 13 | Songs of Yore | 14+ raga articles pairing classical with film | Blog content | Medium |
| 14 | MrAndMrs55 | Song translations, cultural context | Blog content | Medium |
| 15 | Various blogs | Film-by-film raga analysis, composer profiles | Blog content | Medium |
| 16 | YouTube channels | Raga analysis (Rohit Kataria), oral history (70mm with Rahoul) | Video reference | Low |

**Outcome**: Knowledge base has narrative depth, not just data.

## Longer-term: Print Sources

The most comprehensive sources exist only in print.

- **Hindi Cine Raag Encyclopaedia** (K.L. Pandey, 5 vols) — 20,000+ songs, 174 ragas. THE definitive source.
- **Hindi Film Geet Kosh** (Hamraaz, 6 vols) — ~100,000 songs. Being digitized at hamraaz.org.

## Cross-referencing Strategy

Songs will appear in multiple sources with varying metadata. The ingestion pipeline should:

1. Establish a canonical identifier per song (likely: song title + film + year)
2. Merge metadata from multiple sources, preferring the most authoritative for each field
3. Flag conflicts for manual review (e.g., different raga attributions)
4. Use MusicBrainz MBIDs and Spotify IDs as reconciliation keys where available
