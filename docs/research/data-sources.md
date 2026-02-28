# Data Source Assessment

Deep research conducted February 2026 across 6 parallel research threads: MusicBrainz, HindiGeetMala, Spotify/Last.fm/streaming APIs, Wikipedia/Wikidata, academic datasets, and niche sites/blogs/communities.

## Summary

No single source provides the composite mapping that Alaap needs: {raga → properties} → {film songs → metadata} → {contextual narrative}. But the pieces exist across ~15+ sources. Combining them is the project's unique contribution.

**The richest data lives not in mainstream APIs (Spotify, MusicBrainz) but in niche sites built by passionate music lovers.**

---

## Tier 1: Primary Sources

### HindiGeetMala (hindigeetmala.net)

**RICHEST FILM-SPECIFIC SOURCE**

- Est. 40,000-60,000+ songs, cross-linked singer/composer/lyricist/actor/film/year on every song
- ~908 songs tagged with specific ragas (curated, not algorithmic — reliable but sparse ~2% of catalog)
- Binaca Geetmala charts 1953-1983 (31 years of India's first music chart — unique historical dataset)
- Category tags: romantic (7,261), sad (3,933), ghazals (1,963), raag-based (908), qawwalis (567), classical (229)
- User ratings with substantial vote counts (popular golden era songs have 10,000+ votes)
- Full lyrics on song pages, some English translations
- Golden era coverage is deep (1950s alone: ~1,500+ films)
- **NO API** — requires scraping. `robots.txt` fully permissive. Server-rendered HTML, clean URL patterns.
- Scraping strategy: movie index pages by year → movie detail pages → song pages selectively

### Wikipedia "List of Film Songs Based on Ragas"

- Structured HTML tables: raga, song title, film, composer, singer(s)
- Organized by raga, covers Hindustani + Carnatic + hybrid ragas
- Spans 1943 to modern era
- Available via DBpedia in RDF/XML, Turtle, JSON, JSON-LD, CSV
- Parseable but self-described as "incomplete"

### Chandrakantha.com

- ~80+ ragas indexed with film songs
- Per-song fields: title, film, year, raga, **TAAL** (unique — almost no other source has this), music director, singer, lyricist, comments
- **Already scraped** by others on GitHub (inovizz/scraping repo)
- Small but high-quality — verified raga identifications

### Indiapicks.com (S.N. Tata Raga Index)

- 200+ ragas indexed with Hindi film songs
- Song-to-raga mappings with composer/singer/film metadata

### Hindi Cine Raag Encyclopaedia (K.L. Pandey)

- 20,000+ songs from 6,200+ films (1931-2020) with raga analysis
- 5 volumes. Vols 1-2: song-indexed; Vols 3-5: 174 ragas with grammar intros
- **Most comprehensive source but PRINT ONLY**
- A master digital list derived from it exists at wholisticwellnessspace.wordpress.com

---

## Tier 2: Supplementary Sources

### MusicBrainz

**Supplementary, not primary.**

- All major artists exist with correct bio data
- Composer coverage: 15-30% of golden era (R.D. Burman best at 1,430 works; Roshan worst at 39 recordings)
- Singer coverage: Lata 4,807 recordings (~15-20% of career); Rafi 2,509 (~35-60%)
- Work/Recording distinction useful (composition vs performance)
- **NO raga or taal metadata whatsoever**
- Useful for: MBIDs, ISWCs, composer-lyricist relationships, reconciliation
- API: 1 req/sec, Lucene query syntax, `python-musicbrainzngs` library

### Wikidata

**Well-designed model, sparsely populated.**

- Property P8536 specifically for raga — exists but barely used
- Properties P86 (composer), P175 (performer), P676 (lyricist), P361 (part of film)
- Raga entities exist but LACK music-theory properties
- SPARQL queryable for film-composer relationships
- 2022 Filmi Music Datathon made a push but time-limited

### Last.fm API

**Useful for relationship data only.**

- Tags are useless (just "bollywood", "hindi", "indian")
- **Similar Artist data is genuinely useful**: Rafi → surfaces Geeta Dutt, Talat Mahmood, Manna Dey
- `track.getSimilar` reveals listening pattern clusters
- Free for non-commercial use, 5 req/sec

### Spotify

**Limited but catalog exists.**

- Saregama catalog on Spotify (100K+ tracks, May 2020 deal)
- Audio Features API **DEPRECATED for new apps** (Nov 2024)
- Genre tags useless ("bollywood" catch-all)
- Useful for: Spotify IDs for linking, basic track metadata

### JioSaavn (unofficial API)

**Best streaming metadata.**

- Has `music` field (composer) distinct from `singers` — critical for Hindi film music
- Open source unofficial APIs exist (sumitkolhe/jiosaavn-api)
- Risk: unofficial, could break

---

## Tier 3: Specialized Sources

### MySwar.co

**"IMDB of Indian Music" — deepest metadata per song.**

- Covers Hindi film songs 1931-present
- Fields: music director, lyricist, singers, PLUS assistants, arrangers, producers, recording engineers, studio, instrumentalists
- No known API — scraping needed

### Hindi Film Geet Kosh / hamraaz.org

**THE canonical reference work.**

- 6 volumes covering 1931 onward by Har Mandir Singh "Hamraaz"
- ~100,000 Hindi film songs cataloged
- Being digitized at hamraaz.org
- Per song: opening line, singers, lyricists, music directors, disc/CD numbers

### Keep Alive Bollywood (keepalivebollywood.com)

**Binaca Geetmala chart data.**

- Endorsed by Ameen Sayani. 1953-1993 annual rankings.
- Filterable by rank/year/artist/film/actor
- HIGH extraction potential

### Saregama Carvaan Spreadsheet (GitHub: labnol/saregama-carvaan)

- 5,000+ golden era songs in Google Spreadsheet with YouTube links
- Markdown files organized by artist

### Giitaayan.com

- 10,000-11,000 Hindi songs in iTrans Roman + Devanagari
- GitHub-hosted source files, parsed CSV available

### Raga Property Sources

| Source | Ragas | Key Properties |
|--------|-------|----------------|
| **Raga Junglism** (ragajunglism.org) | 1,000+ (365+ detailed) | Swara string, symmetry, time-of-day, raganga family — **richest found** |
| **Ocean of Ragas** (oceanofragas.com) | 1,200+ (750+ with audio) | Audio samples, alternate names, Carnatic equivalents |
| **Raag Hindustani** (raag-hindustani.com) | ~500 | Audio, notation (Indian + Western), structural analysis |
| Multitask Carnatic Dataset (Zenodo) | 40 | Aaroh, avroh, melakarta, janak/janya — structured annotations |

---

## Tier 4: Contextual/Narrative Sources

### Blogs & Analysis Sites

- **Songs of Yore** (songsofyore.com) — 14+ part raga series pairing classical recordings with film versions
- **Down Melody Lane** (downmelodylane.com) — composer bios, filmographies, non-film songs
- **PanchamMagic** (panchammagic.org) — comprehensive R.D. Burman fan resource
- **Dustedoff** (madhulikaliddle.com) — detailed classic Hindi cinema/music reviews
- **MrAndMrs55** (mrandmrs55.com) — scholarly song translations, cultural context
- **saidvk.blogspot.com** — raga-by-raga analysis of film songs
- **cinemamagicdays.wordpress.com** — raaga-based classical song analysis
- **My Views on Bollywood** (myviewsonbollywood.wordpress.com) — raga-by-raga Hindi film song analysis
- **Mehfil Mein Meri** (mehfilmeinmeri.wordpress.com) — themed golden era song lists
- **Carnival of Blogs on Golden Era of Hindi Film Music** — monthly aggregation of the entire blogosphere

### Composer-Specific Sites

- **madanmohan.in** — official family-run site, 100+ films, 600+ songs
- **geetadutt.com** — complete song databases in Hindi, Bengali, Gujarati
- **mohdrafi.com** — discography of 5,052 songs (1942-1980)

### Academic Datasets

- **Saraga** (MTG/UPF) — largest annotated open dataset for Indian art music (96.3 hrs)
- **TRF Dataset** — includes film songs alongside classical, organized by thaat/raga
- **compIAM** — Python toolkit for computational Indian music analysis (v0.4.1, Nov 2024)
- **PIM v1** — 191 hours, 144 ragas, 169 artists (audio pending release)

---

## Key Gaps Across All Sources

1. **Taal data** — almost nonexistent except Chandrakantha.com
2. **Raga-to-song mappings** — fragmented across multiple sources, no single comprehensive structured dataset
3. **Raga music theory** (thaat, aroha/avaroha, vadi/samvadi) — documented in prose but not structured as machine-readable data
4. **Audio features** — not available via APIs for new apps; would need computation from audio
5. **No single source combines** song metadata + raga identification + contextual narrative + musical analysis — this is the gap Alaap fills
