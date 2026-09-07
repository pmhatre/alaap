// Alaap — manual data corrections.
//
// Every hand edit to the graph lives here so it survives a rebuild. Apply with:
//   pnpm data:cypher db/curation.cypher
// Statements must be idempotent: match on both the old and the new state, use
// MERGE for relationships, and guard deletes so a second run is a no-op.
// Run this LAST in the rebuild sequence (after loader, dedup, enrichment).

// ---------------------------------------------------------------------------
// Lekin (1990). Chandrakantha lists the film as 1999 and Bollywood Lyrics as
// 1994, which produced two phantom Film nodes. Re-point their songs to the real
// film, fix the song years, and drop the phantoms once they are empty.
// ---------------------------------------------------------------------------
MATCH (s:Song)-[r:FROM_FILM]->(bad:Film)
WHERE bad.slug IN ['lekin-1999', 'lekin-1994']
MATCH (good:Film {slug: 'lekin-1990'})
MERGE (s)-[:FROM_FILM]->(good)
SET s.year = 1990
DELETE r;

MATCH (f:Film)
WHERE f.slug IN ['lekin-1999', 'lekin-1994'] AND NOT (f)<-[:FROM_FILM]-()
DETACH DELETE f;

// Jhoothe Naina Bole (favorites): slug carried the wrong year.
MATCH (s:Song)
WHERE s.slug IN [
  'jhoothe-naina-bole-sanchi-bateeyan-a-k-a-juthe-naina-bole-lekin-1999',
  'jhoothe-naina-bole-sanchi-bateeyan-a-k-a-juthe-naina-bole-lekin-1990'
]
SET s.slug = 'jhoothe-naina-bole-sanchi-bateeyan-a-k-a-juthe-naina-bole-lekin-1990',
    s.year = 1990,
    // Asha Bhosle - Topic (official audio)
    s.youtube_id = 'NZQY-WHU8YU';

// ---------------------------------------------------------------------------
// Badi Sooni Sooni Hai (Mili, 1975) — favorites. The merged node kept the
// Bollywood Lyrics transliteration as its title, no year, a dead Carvaan
// YouTube ID (favorites falls back to Spotify when youtube_id is null), a
// duplicate singer link to the unmerged "Kishore" variant, and Majrooh
// Sultanpuri as lyricist. Mili's lyrics are by Yogesh.
// ---------------------------------------------------------------------------
MATCH (s:Song)
WHERE s.slug IN [
  'badii-suunii-suunii-hai-zindagii-ye-zindagii-mili',
  'badi-sooni-sooni-hai-mili-1975'
]
SET s.slug = 'badi-sooni-sooni-hai-mili-1975',
    s.title = 'Badi Sooni Sooni Hai',
    s.year = 1975,
    s.youtube_id = CASE WHEN s.youtube_id = 'q659UcAUI1M' THEN null ELSE s.youtube_id END;

MATCH (s:Song {slug: 'badi-sooni-sooni-hai-mili-1975'})-[r:SUNG_BY]->(:Artist {slug: 'kishore'})
DELETE r;

MATCH (s:Song {slug: 'badi-sooni-sooni-hai-mili-1975'})
MATCH (a:Artist {slug: 'kishore-kumar'})
MERGE (s)-[:SUNG_BY]->(a);

MATCH (s:Song {slug: 'badi-sooni-sooni-hai-mili-1975'})-[r:LYRICS_BY]->(:Artist {slug: 'majrooh-sultanpuri'})
DELETE r;

MATCH (s:Song {slug: 'badi-sooni-sooni-hai-mili-1975'})
MATCH (a:Artist {slug: 'yogesh'})
MERGE (s)-[:LYRICS_BY]->(a);

MATCH (s:Song {slug: 'badi-sooni-sooni-hai-mili-1975'})
MATCH (a:Artist {slug: 's-d-burman'})
MERGE (s)-[:COMPOSED_BY]->(a);

MATCH (s:Song {slug: 'badi-sooni-sooni-hai-mili-1975'})
MATCH (f:Film {slug: 'mili-1975'})
MERGE (s)-[:FROM_FILM]->(f);

// ---------------------------------------------------------------------------
// Favorites YouTube IDs. YouTube uploads of golden era songs come and go; when
// an embed dies, replace the ID here (check with the oEmbed endpoint first).
// O Duniya Ke Rakhwale keeps Carvaan's ID (GygqxgYqwQc), which is still live.
// Saiyan Beimaan and Badi Sooni Sooni have no youtube_id on purpose: the
// favorites page falls back to the Spotify IDs in app/data/favorites.json.
// ---------------------------------------------------------------------------
// OrangeSadabaharFilms, original 1961 film clip
MATCH (s:Song {slug: 'dhoondho-dhoondho-re-saajna-ganga-jamuna-1961'})
SET s.youtube_id = 'OtpN7bzQb4Q';

// Zee Music Classic; Carvaan's dXY4P26cqDM is dead
MATCH (s:Song {slug: 'aa-ab-laut-chalen-jis-desh-mein-gangaa-behti-hai-1960'})
SET s.youtube_id = 'qPGVPpwgBTc';
