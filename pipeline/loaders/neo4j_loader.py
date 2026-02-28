"""Neo4j loader: read merged.json and load into Neo4j via MERGE queries.

Load order: Taals → Ragas → Artists → Films → Songs → Relationships
Uses MERGE (idempotent) with SET n += props (null-stripped).
No APOC dependency — explicit Cypher per relationship type.
Reads NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD from env vars.
"""

import json
import logging
import os
from pathlib import Path

from neo4j import GraphDatabase
from slugify import slugify

logger = logging.getLogger(__name__)

MERGED_PATH = Path("staging/merged.json")
BATCH_SIZE = 500


def _get_driver():
    """Create a Neo4j driver from environment variables."""
    uri = os.environ["NEO4J_URI"]
    username = os.environ.get("NEO4J_USERNAME", "neo4j")
    password = os.environ["NEO4J_PASSWORD"]
    return GraphDatabase.driver(uri, auth=(username, password))


def _strip_nulls(d: dict) -> dict:
    """Remove keys with None values — prevents overwriting existing data."""
    return {k: v for k, v in d.items() if v is not None}


def _batch(items: list, size: int = BATCH_SIZE):
    """Yield successive batches from a list."""
    for i in range(0, len(items), size):
        yield items[i : i + size]


def load_taals(tx, taals: list[dict]):
    """Load Taal nodes."""
    for taal in taals:
        props = _strip_nulls({
            "name": taal["name"],
        })
        tx.run(
            "MERGE (t:Taal {name: $name}) SET t += $props",
            name=taal["name"],
            props=props,
        )


def load_ragas(tx, ragas: list[dict]):
    """Load Raga nodes."""
    for raga in ragas:
        slug = raga.get("slug") or slugify(raga["name"])
        props = _strip_nulls({
            "name": raga["name"],
            "slug": slug,
        })
        tx.run(
            "MERGE (r:Raga {slug: $slug}) SET r += $props",
            slug=slug,
            props=props,
        )


def load_artists(tx, artists: list[dict]):
    """Load Artist nodes."""
    for artist in artists:
        slug = slugify(artist["name"])
        props = _strip_nulls({
            "name": artist["name"],
            "slug": slug,
        })
        tx.run(
            "MERGE (a:Artist {slug: $slug}) SET a += $props",
            slug=slug,
            props=props,
        )


def load_films(tx, films: list[dict]):
    """Load Film nodes."""
    for film in films:
        slug = slugify(f"{film['title']} {film.get('year', '')}")
        props = _strip_nulls({
            "title": film["title"],
            "slug": slug,
            "year": film.get("year"),
        })
        tx.run(
            "MERGE (f:Film {slug: $slug}) SET f += $props",
            slug=slug,
            props=props,
        )


def load_songs(tx, songs: list[dict]):
    """Load Song nodes (without relationships)."""
    for song in songs:
        slug = song.get("slug") or slugify(song.get("title", ""))
        props = _strip_nulls({
            "title": song.get("title"),
            "slug": slug,
            "year": song.get("year"),
            "youtube_id": song.get("youtube_id"),
            "lyrics": song.get("lyrics"),
            "notes": song.get("notes"),
            "sources": song.get("sources"),
        })
        tx.run(
            "MERGE (s:Song {slug: $slug}) SET s += $props",
            slug=slug,
            props=props,
        )


def load_sung_by(tx, songs: list[dict]):
    """Create SUNG_BY relationships."""
    for song in songs:
        song_slug = song.get("slug")
        if not song_slug:
            continue
        for singer in song.get("singers", []):
            if not singer:
                continue
            singer_slug = slugify(singer)
            tx.run(
                """
                MATCH (s:Song {slug: $song_slug})
                MATCH (a:Artist {slug: $artist_slug})
                MERGE (s)-[:SUNG_BY]->(a)
                """,
                song_slug=song_slug,
                artist_slug=singer_slug,
            )


def load_composed_by(tx, songs: list[dict]):
    """Create COMPOSED_BY relationships."""
    for song in songs:
        song_slug = song.get("slug")
        composer = song.get("composer")
        if not song_slug or not composer:
            continue
        composer_slug = slugify(composer)
        tx.run(
            """
            MATCH (s:Song {slug: $song_slug})
            MATCH (a:Artist {slug: $artist_slug})
            MERGE (s)-[:COMPOSED_BY]->(a)
            """,
            song_slug=song_slug,
            artist_slug=composer_slug,
        )


def load_lyrics_by(tx, songs: list[dict]):
    """Create LYRICS_BY relationships."""
    for song in songs:
        song_slug = song.get("slug")
        lyricist = song.get("lyricist")
        if not song_slug or not lyricist:
            continue
        lyricist_slug = slugify(lyricist)
        tx.run(
            """
            MATCH (s:Song {slug: $song_slug})
            MATCH (a:Artist {slug: $artist_slug})
            MERGE (s)-[:LYRICS_BY]->(a)
            """,
            song_slug=song_slug,
            artist_slug=lyricist_slug,
        )


def load_from_film(tx, songs: list[dict]):
    """Create FROM_FILM relationships."""
    for song in songs:
        song_slug = song.get("slug")
        film = song.get("film")
        if not song_slug or not film:
            continue
        film_slug = slugify(f"{film} {song.get('year', '')}")
        tx.run(
            """
            MATCH (s:Song {slug: $song_slug})
            MATCH (f:Film {slug: $film_slug})
            MERGE (s)-[:FROM_FILM]->(f)
            """,
            song_slug=song_slug,
            film_slug=film_slug,
        )


def load_based_on_raga(tx, songs: list[dict]):
    """Create BASED_ON_RAGA relationships."""
    for song in songs:
        song_slug = song.get("slug")
        if not song_slug:
            continue
        ragas = song.get("ragas", [])
        for i, raga in enumerate(ragas):
            if not raga:
                continue
            raga_slug = slugify(raga)
            primary = i == 0  # First raga is primary
            tx.run(
                """
                MATCH (s:Song {slug: $song_slug})
                MATCH (r:Raga {slug: $raga_slug})
                MERGE (s)-[rel:BASED_ON_RAGA]->(r)
                SET rel.primary = $primary
                """,
                song_slug=song_slug,
                raga_slug=raga_slug,
                primary=primary,
            )


def load_set_to_taal(tx, songs: list[dict]):
    """Create SET_TO_TAAL relationships."""
    for song in songs:
        song_slug = song.get("slug")
        taal = song.get("taal")
        if not song_slug or not taal:
            continue
        tx.run(
            """
            MATCH (s:Song {slug: $song_slug})
            MATCH (t:Taal {name: $taal_name})
            MERGE (s)-[:SET_TO_TAAL]->(t)
            """,
            song_slug=song_slug,
            taal_name=taal,
        )


def load(merged_path: Path = MERGED_PATH):
    """Load the full merged dataset into Neo4j."""
    if not merged_path.exists():
        logger.error(f"Merged file not found: {merged_path}")
        return

    with open(merged_path, encoding="utf-8") as f:
        data = json.load(f)

    songs = data.get("songs", [])
    artists = data.get("artists", [])
    films = data.get("films", [])
    ragas = data.get("ragas", [])
    taals = data.get("taals", [])

    logger.info(
        f"Loading: {len(songs)} songs, {len(artists)} artists, "
        f"{len(films)} films, {len(ragas)} ragas, {len(taals)} taals"
    )

    driver = _get_driver()

    try:
        with driver.session() as session:
            # 1. Taals
            logger.info("Loading taals...")
            for batch in _batch(taals):
                session.execute_write(load_taals, batch)

            # 2. Ragas
            logger.info("Loading ragas...")
            for batch in _batch(ragas):
                session.execute_write(load_ragas, batch)

            # 3. Artists
            logger.info("Loading artists...")
            for batch in _batch(artists):
                session.execute_write(load_artists, batch)

            # 4. Films
            logger.info("Loading films...")
            for batch in _batch(films):
                session.execute_write(load_films, batch)

            # 5. Songs
            logger.info("Loading songs...")
            for batch in _batch(songs):
                session.execute_write(load_songs, batch)

            # 6. Relationships
            logger.info("Loading SUNG_BY relationships...")
            for batch in _batch(songs):
                session.execute_write(load_sung_by, batch)

            logger.info("Loading COMPOSED_BY relationships...")
            for batch in _batch(songs):
                session.execute_write(load_composed_by, batch)

            logger.info("Loading LYRICS_BY relationships...")
            for batch in _batch(songs):
                session.execute_write(load_lyrics_by, batch)

            logger.info("Loading FROM_FILM relationships...")
            for batch in _batch(songs):
                session.execute_write(load_from_film, batch)

            logger.info("Loading BASED_ON_RAGA relationships...")
            for batch in _batch(songs):
                session.execute_write(load_based_on_raga, batch)

            logger.info("Loading SET_TO_TAAL relationships...")
            for batch in _batch(songs):
                session.execute_write(load_set_to_taal, batch)

        logger.info("Load complete!")

    finally:
        driver.close()


def run():
    """Entry point for the loader."""
    load()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
