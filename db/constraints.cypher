// Alaap — Neo4j schema constraints and indexes
// Apply via Neo4j Browser or cypher-shell after provisioning Aura instance

// Uniqueness constraints (also create indexes automatically)
CREATE CONSTRAINT song_slug IF NOT EXISTS
FOR (s:Song) REQUIRE s.slug IS UNIQUE;

CREATE CONSTRAINT raga_slug IF NOT EXISTS
FOR (r:Raga) REQUIRE r.slug IS UNIQUE;

CREATE CONSTRAINT artist_slug IF NOT EXISTS
FOR (a:Artist) REQUIRE a.slug IS UNIQUE;

CREATE CONSTRAINT film_slug IF NOT EXISTS
FOR (f:Film) REQUIRE f.slug IS UNIQUE;

CREATE CONSTRAINT thaat_name IF NOT EXISTS
FOR (t:Thaat) REQUIRE t.name IS UNIQUE;

CREATE CONSTRAINT taal_name IF NOT EXISTS
FOR (t:Taal) REQUIRE t.name IS UNIQUE;

CREATE CONSTRAINT alankar_name IF NOT EXISTS
FOR (a:Alankar) REQUIRE a.name IS UNIQUE;

CREATE CONSTRAINT journey_slug IF NOT EXISTS
FOR (j:Journey) REQUIRE j.slug IS UNIQUE;

// Indexes for common lookups
CREATE INDEX song_title IF NOT EXISTS
FOR (s:Song) ON (s.title);

CREATE INDEX song_year IF NOT EXISTS
FOR (s:Song) ON (s.year);

CREATE INDEX raga_name IF NOT EXISTS
FOR (r:Raga) ON (r.name);

CREATE INDEX artist_name IF NOT EXISTS
FOR (a:Artist) ON (a.name);

CREATE INDEX film_title IF NOT EXISTS
FOR (f:Film) ON (f.title);

CREATE INDEX film_year IF NOT EXISTS
FOR (f:Film) ON (f.year);

CREATE INDEX song_geetmala_year IF NOT EXISTS
FOR (s:Song) ON (s.geetmala_year);
