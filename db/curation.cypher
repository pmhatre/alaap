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

// ---------------------------------------------------------------------------
// Thaat canonicalisation. Enrichment sources spell thaats differently
// (Khammaj, Khamāj, Asawari) and one Wikipedia infobox leaked a whole sentence
// in as a thaat name (Gara). Fold everything onto the ten Bhatkhande thaats.
// (Thaat lives only on the BELONGS_TO_THAAT relationship; ragas have no thaat property.)
// ---------------------------------------------------------------------------
MATCH (r:Raga)-[rel:BELONGS_TO_THAAT]->(bad:Thaat)
WHERE bad.name IN ['Khammaj', 'Khamāj'] OR bad.name STARTS WITH 'This raga is in the Khamaj'
MATCH (good:Thaat {name: 'Khamaj'})
MERGE (r)-[:BELONGS_TO_THAAT]->(good)
DELETE rel;

MATCH (r:Raga)-[rel:BELONGS_TO_THAAT]->(bad:Thaat {name: 'Asawari'})
MATCH (good:Thaat {name: 'Asavari'})
MERGE (r)-[:BELONGS_TO_THAAT]->(good)
DELETE rel;

MATCH (t:Thaat)
WHERE NOT (t)<-[:BELONGS_TO_THAAT]-()
  AND NOT t.name IN ['Bilawal', 'Kalyan', 'Khamaj', 'Bhairav', 'Purvi', 'Marwa', 'Kafi', 'Asavari', 'Bhairavi', 'Todi']
DETACH DELETE t;

// ---------------------------------------------------------------------------
// Artist hygiene pass (2026-09-07). Bollywood Lyrics credits several golden
// era singers by first name only, Chandrakantha spells a few duos differently,
// and both leak the odd placeholder in as an artist. Merge each variant into
// its canonical node across every relationship type, then drop empty variants.
// "Shaili Shailendra" is the lyricist's son and is deliberately NOT merged.
// ---------------------------------------------------------------------------
UNWIND [
  ['kishore', 'kishore-kumar'],
  ['talat', 'talat-mahmood'],
  ['hemant', 'hemant-kumar'],
  ['geeta', 'geeta-dutt'],
  ['shamshad', 'shamshad-begum'],
  ['laksmikant-pyarelal', 'laxmikant-pyarelal'],
  ['kalyanji-anandj', 'kalyanji-anandji'],
  ['sonikomi', 'sonik-omi'],
  ['master-sonik-om-prakash-sharma', 'sonik-omi']
] AS pair
MATCH (v:Artist {slug: pair[0]})<-[r]-(s:Song)
MATCH (c:Artist {slug: pair[1]})
MERGE (s)-[:$(type(r))]->(c)
DELETE r;

MATCH (v:Artist)
WHERE v.slug IN ['kishore', 'talat', 'hemant', 'geeta', 'shamshad', 'laksmikant-pyarelal',
                 'kalyanji-anandj', 'sonikomi', 'master-sonik-om-prakash-sharma']
  AND NOT (v)<--()
DETACH DELETE v;

// Shailendra Singh (singer, 1970s-80s) is a different person from Shailendra
// (lyricist, 1949-1966). Chandrakantha credits the lyricist as "Shailendra
// Singh", so every LYRICS_BY on the singer's node belongs to the lyricist.
MATCH (v:Artist {slug: 'shailendra-singh'})<-[r:LYRICS_BY]-(s:Song)
MATCH (c:Artist {slug: 'shailendra'})
MERGE (s)-[:LYRICS_BY]->(c)
DELETE r;

MATCH (a:Artist {slug: 'shailendra-singh'})
SET a.name = 'Shailendra Singh';

// Comma-joined credits: split into the individual artists (created if absent).
UNWIND [
  ['shailendra-singh-prem-dhawan',        'shailendra',              'Shailendra'],
  ['shailendra-singh-prem-dhawan',        'prem-dhawan',             'Prem Dhawan'],
  ['prem-dhawan-sardar-jafri',            'prem-dhawan',             'Prem Dhawan'],
  ['prem-dhawan-sardar-jafri',            'sardar-jafri',            'Sardar Jafri'],
  ['sameer-rani-malik',                   'sameer',                  'Sameer'],
  ['sameer-rani-malik',                   'rani-malik',              'Rani Malik'],
  ['sayeed-qadri-hasan-kamaal',           'sayeed-quadri',           'Sayeed Quadri'],
  ['sayeed-qadri-hasan-kamaal',           'hasan-kamaal',            'Hasan Kamaal'],
  ['gauri-prasanna-majumdar-anand-bakshi','gauri-prasanna-majumdar', 'Gauri Prasanna Majumdar'],
  ['gauri-prasanna-majumdar-anand-bakshi','anand-bakshi',            'Anand Bakshi'],
  ['shrinivas-khale-anil-mohile',         'shrinivas-khale',         'Shrinivas Khale'],
  ['shrinivas-khale-anil-mohile',         'anil-mohile',             'Anil Mohile'],
  ['zakir-hussain-bhupen-raj',            'zakir-hussain',           'Zakir Hussain'],
  ['zakir-hussain-bhupen-raj',            'bhupen-raj',              'Bhupen Raj']
] AS row
MATCH (v:Artist {slug: row[0]})<-[r]-(s:Song)
MERGE (c:Artist {slug: row[1]}) ON CREATE SET c.name = row[2]
MERGE (s)-[:$(type(r))]->(c);

MATCH (v:Artist)
WHERE v.slug IN ['shailendra-singh-prem-dhawan', 'prem-dhawan-sardar-jafri', 'sameer-rani-malik',
                 'sayeed-qadri-hasan-kamaal', 'gauri-prasanna-majumdar-anand-bakshi',
                 'shrinivas-khale-anil-mohile', 'zakir-hussain-bhupen-raj']
DETACH DELETE v;

// Placeholders and editorial notes that were loaded as artists.
MATCH (a:Artist)
WHERE a.slug IN ['songs', 'hindi',
                 'it-is-claimed-that-this-is-from-amir-khusru-but-this-is-disputed',
                 'reputed-to-be-by-ramesh-gupta-but-there-is-some-doubt',
                 'unknown-some-suggest-that-it-was-tulsidas-some-suggest-that-it-was-17th-century-ramdas-however-it-was-modified-by-gandhi']
DETACH DELETE a;

// Wrong-role credits (verified song by song; Mukesh composing Anuraag 1956 and
// R.D. Burman's singing credits are genuine and untouched).
MATCH (s:Song {slug: 'khoya-khoya-chand-kala-bazar'})-[r:COMPOSED_BY]->(:Artist {slug: 'mohammed-rafi'})
DELETE r;

MATCH (s:Song {slug: 'khoya-khoya-chand-kala-bazar'})
MATCH (c:Artist {slug: 's-d-burman'})
MERGE (s)-[:COMPOSED_BY]->(c);

MATCH (s:Song {slug: 'chale-aa-rahe-hain-wo-zulfen-bikhere-nonfilm'})-[r:COMPOSED_BY]->(:Artist {slug: 'mohammed-rafi'})
DELETE r;

MATCH (s:Song {slug: 'im-falling-in-love-with-a-stranger-deewaar-1975'})-[r:LYRICS_BY]->(:Artist {slug: 'r-d-burman'})
DELETE r;

MATCH (s:Song {slug: 'im-falling-in-love-with-a-stranger-deewaar-1975'})
MATCH (l:Artist {slug: 'sahir-ludhianvi'})
MERGE (s)-[:LYRICS_BY]->(l);

// Label leaks from Chandrakantha's singer column, surfaced by the compound split.
MATCH (a:Artist {slug: 'singer-s'})
DETACH DELETE a;

MATCH (a:Artist {slug: 'chorus'})
WHERE a.name <> 'Chorus'
SET a.name = 'Chorus';

// Composer name variants (the split script only touches singers).
UNWIND ['Chitragupt (Composer)', 'Chitragupta'] AS variantName
MATCH (v:Artist {name: variantName})<-[r]-(s:Song)
MATCH (c:Artist {slug: 'chitragupt'})
MERGE (s)-[:$(type(r))]->(c)
DELETE r;

MATCH (v:Artist)
WHERE v.name IN ['Chitragupt (Composer)', 'Chitragupta'] AND NOT (v)<--()
DETACH DELETE v;
