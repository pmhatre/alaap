# Guru Knowledge Sources — Research Assessment

Research into available digitized/structured sources for building the "Guru" co-pilot's knowledge layer — a PhD-level Hindustani music persona grounded in Bhatkhande's systematization.

Last verified: 2026-02-28

---

## Tier 1: Directly Ingestible (structured data, bulk import)

### ragaDB (GitHub) — PRIMARY SEED
- **URL**: https://github.com/shockmonger/ragaDB
- **Coverage**: 163 ragas
- **Format**: JSON (`ragas.json`) — all fields populated for every entry
- **Fields**: aaroha, avaroha, pakad, vadi, samvadi, thaat, jati, time
- **Note system**: Tonic-relative pitch classes (uppercase = shuddha, lowercase = komal, M = tivra)
- **License**: None specified (no LICENSE file)
- **Companion**: `ragasPitchClasses.json` maps notes to integer pitch classes 0-12
- **Assessment**: Best starting point. Clean JSON, every field populated, maps directly to our Neo4j Raga properties. Covers the core Hindustani concert repertoire. Ingest first.

### Wikipedia — List of Ragas in Hindustani Music
- **Coverage**: ~200+ ragas in table format
- **Format**: HTML table (scrapeable)
- **Fields**: Name, thaat, aroha, avaroha, vadi, samvadi, time, equivalent Carnatic raga
- **Assessment**: Good for cross-referencing and filling gaps in ragaDB. Already have a Wikipedia scraper in the pipeline.

### TRF Dataset / Kaggle Indian Ragas
- **Format**: CSV/structured
- **Assessment**: Smaller, less complete than ragaDB. Useful for validation, not primary ingestion.

---

## Tier 2: Scrapeable (HTML pages, require scraper development)

### Chandrakantha.com — Raga Reference
- **URL**: https://chandrakantha.com/music-and-dance/i-class-music/index-of-rags/
- **Coverage**: 44 ragas (indexed pages)
- **Format**: HTML narrative + diagrams per raga page
- **Fields**: Arohana, avarohana, jati, vadi, samvadi, pakad, thaat, time, drone
- **Assessment**: We already scrape Chandrakantha for song data. Extending to raga reference pages is natural. High authority, small corpus. Second priority after ragaDB.

### LearnRagas.com
- **URL**: https://learnragas.com/ragas/
- **Coverage**: 75 ragas
- **Format**: HTML pages per raga
- **Fields**: Thaat, jati, time, vadi, samvadi, aroha, avaroha, pakad, description, audio (flute)
- **Assessment**: Clean and beginner-friendly. Good for accessible descriptions and audio samples. Covers both Hindustani and Carnatic.

### Raag-Hindustani.com
- **URL**: https://raag-hindustani.com/
- **Coverage**: ~500 ragas (self-reported), ~3,000 bandish, 64 taals
- **Fields**: Thaat, vadi, samvadi, aaroh/avroh (diagram-based), audio demos
- **License**: Non-commercial, share with attribution
- **Assessment**: Largest single-author English raga reference. Best for coverage breadth after ragaDB. Pakad not always explicit. Run by Usha Jayaraman ("Sadhana"). Would require diagram parsing for some fields.

### Tanarang.com
- **URL**: https://tanarang.com/raag-index/
- **Coverage**: ~120 ragas, 1,500+ bandish with audio
- **Format**: HTML tables per raga
- **Fields**: Aaroh, avroh, mukhya ang (characteristic phrase), time, jati, swara inclusion/exclusion
- **Assessment**: Primary value is bandish collection, not just raga theory. Vadi/samvadi coverage varies.

### Ocean of Ragas
- **URL**: https://oceanofragas.com/
- **Coverage**: 1,800+ in database; audio for 850+; master list of 2,100+ names
- **Format**: ASP.NET web database + PDF downloads per raga
- **Fields**: Scale, family (raganga), thaat/melakarta, time zone, note count, aroha, avaroha, vadi, samvadi, chalan
- **Assessment**: Most exhaustive by count — covers obscure and lesser-known ragas. Developed by Sudhir Gadre. Stale (last updated May 2021) but still online. Best source for alternate names and rare ragas. No bulk export.

### Sound of India
- **Coverage**: ~100 ragas
- **Format**: HTML
- **Assessment**: Smaller corpus, less structured. Low priority.

---

## Tier 3: Unstructured Authoritative (narrative essays, high musicological value)

### Rajan Parrikar Music Archive
- **URL**: https://www.parrikar.org/
- **Coverage**: ~40 ragas covered in deep analytical essays (47 essays total, 2000-2025)
- **Format**: Narrative HTML + 2,000+ embedded audio clips
- **Assessment**: The single most musicologically rigorous English-language raga resource online. Pure narrative — not structured data, but invaluable for the Guru persona's "voice" and analytical depth. Could be used as RAG context for raga-specific queries. Not scrapeable into field/value pairs.

### Raga Junglism
- **URL**: https://ragajunglism.org/ragas/
- **Coverage**: 320+ ragas in "Ragatable"
- **Format**: HTML table + individual pages
- **Assessment**: Good cross-reference. Ragatable has structured columns but needs verification against authoritative sources.

---

## Tier 4: Academic / Computational (primarily audio, not raga theory)

### compIAM (Computational analysis of Indian Art Music)
- Python library for computational musicology
- Raga recognition models, melodic analysis
- Assessment: Useful for Phase 3+ audio analysis integration, not for the knowledge layer itself

### Saraga Dataset
- Research dataset with annotated Hindustani and Carnatic recordings
- Assessment: Audio + annotations, not raga theory. Academic use.

### AUTRIM (Auto-Rickshaw of Indian Music)
- ITC Sangeet Research Academy project
- Assessment: Audio demonstrations of ragas, some theoretical content. Access unclear.

### CompMusic / Dunya
- Academic music information retrieval project
- Assessment: Research tools, not a raga knowledge base.

---

## Tier 5: Limited Access / Offline

### ITC Sangeet Research Academy (ITC SRA)
- Historically authoritative, but website broken/offline as of 2026
- Assessment: Cannot be relied upon as a source

### SwarGanga
- Database errors reported
- Assessment: Unreliable

---

## Key Reference Texts (digitized)

### The Raga Guide (Joep Bor, Nimbus, 1999)
- **URL**: https://archive.org/details/ragaguideasurveyof74hindustaniragassvarnalataraoetalled.joepbar
- **Coverage**: 74 ragas
- **Format**: Scanned PDF / EPUB / full text (borrowable on Internet Archive)
- **Assessment**: The gold standard scholarly reference. Each raga has a detailed essay, aroha/avaroha, notation in Indian and Western staff. Originally accompanied by 4 CDs. Not machine-readable without OCR. Best for validating musicological claims and enriching raga descriptions.

### Bhatkhande's Kramik Pustak Malika
- Available as PDF on Internet Archive
- **Assessment**: The foundational text for the 10-thaat system. In Hindi/Sanskrit. Historical reference, not for direct data extraction. Important for understanding the theoretical framework the Guru persona should embody.

---

## Recommended Ingestion Strategy

### Phase 2A: Raga Enrichment (immediate)
1. **ragaDB** — Ingest 163 ragas from JSON. Map fields to Neo4j Raga properties (aroha, avaroha, pakad, vadi, samvadi, thaat, time). This fills the sparse raga detail pages.
2. **Chandrakantha raga pages** — Extend existing scraper to pull raga reference data for 44 ragas. Cross-reference with ragaDB, fill gaps.
3. **Wikipedia raga table** — Scrape for alternate names, Carnatic equivalents, and any ragas missing from ragaDB.

### Phase 2B: Broader Coverage
4. **LearnRagas** — 75 ragas with accessible descriptions. Good for the "educational explanation" field on raga pages.
5. **Ocean of Ragas** — Alternate names and rare ragas. Best for expanding coverage beyond the 163-raga core.
6. **Raag-Hindustani** — ~500 ragas, but harder to extract. Consider for filling specific gaps.

### Phase 3: Guru Knowledge Layer (RAG-backed)
7. **Rajan Parrikar essays** — Index as RAG documents for deep raga analysis queries.
8. **The Raga Guide** — OCR and index as authoritative reference material.
9. **Tanarang bandish collection** — Valuable for composition-level knowledge.

### Data Quality Notes
- ragaDB uses a specific note notation (uppercase/lowercase for shuddha/komal). Need a mapping layer to our display format.
- Cross-reference at least 2 sources per raga before trusting field values, especially for contested ragas.
- Time-of-day classifications vary between sources (Bhatkhande vs. modern practice). Document which system we follow.
- Some ragas have multiple accepted aroha/avaroha (vakra ragas). Store canonical + variants.

---

## Summary Table

| Source | Ragas | Format | Priority | Effort |
|--------|-------|--------|----------|--------|
| ragaDB (GitHub) | 163 | JSON | **1st** | Low — direct import |
| Chandrakantha ragas | 44 | HTML | **2nd** | Medium — extend existing scraper |
| Wikipedia raga table | 200+ | HTML | **3rd** | Low — have scraper infra |
| LearnRagas | 75 | HTML | 4th | Medium — new scraper |
| Ocean of Ragas | 1,800+ | Web DB | 5th | High — ASP.NET, no API |
| Raag-Hindustani | ~500 | HTML | 5th | High — diagram parsing |
| Rajan Parrikar | ~40 | Essays | Phase 3 | Medium — RAG indexing |
| Raga Guide | 74 | PDF | Phase 3 | High — OCR needed |
| Tanarang | 120 | HTML | Phase 3 | Medium — new scraper |
