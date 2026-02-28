"""Scraper for hbdeshmukh/bollywood-lyrics GitHub CSV.

Source: https://raw.githubusercontent.com/hbdeshmukh/bollywood-lyrics/master/lyrics.csv
Fields: Title, Film, Year, Singer, Composer, Lyricist, Lyrics
Note: All text is lowercased in the source → .title() then artist normalizer.
No raga data. Key value: lyrics + lyricist.
"""

import csv
import io
import json
import logging
from datetime import datetime, timezone

import requests

from normalizers.names import normalize_artist, split_singers
from normalizers.songs import make_canonical_id, make_song_slug, normalize_year

logger = logging.getLogger(__name__)

CSV_URL = "https://raw.githubusercontent.com/hbdeshmukh/bollywood-lyrics/master/lyrics.csv"
OUTPUT_PATH = "staging/bollywood_lyrics.json"


def scrape() -> dict:
    """Download and parse the Bollywood Lyrics CSV."""
    logger.info("Downloading Bollywood Lyrics CSV...")
    resp = requests.get(CSV_URL, timeout=60)
    resp.raise_for_status()

    # The CSV uses UTF-8 encoding
    text = resp.text
    reader = csv.DictReader(io.StringIO(text))

    songs = []
    for row in reader:
        title_raw = row.get("Title", "").strip()
        film_raw = row.get("Film", "").strip()
        year_raw = row.get("Year", "").strip()
        singer_raw = row.get("Singer", "").strip()
        composer_raw = row.get("Composer", "").strip()
        lyricist_raw = row.get("Lyricist", "").strip()
        lyrics = row.get("Lyrics", "").strip() or None

        if not title_raw:
            continue

        # Source is all-lowercase → title-case first
        title = title_raw.title()
        film = film_raw.title() if film_raw else None
        year = normalize_year(year_raw)
        singers = split_singers(singer_raw)
        composer = normalize_artist(composer_raw) if composer_raw else None
        lyricist = normalize_artist(lyricist_raw) if lyricist_raw else None

        canonical_id = make_canonical_id(title, film, year, singers[0] if singers else None)
        slug = make_song_slug(title, film, year)

        songs.append({
            "canonical_id": canonical_id,
            "title": title,
            "title_raw": title_raw,
            "slug": slug,
            "film": film,
            "film_raw": film_raw if film_raw else None,
            "year": year,
            "singers": singers,
            "singers_raw": singer_raw if singer_raw else None,
            "composer": composer,
            "composer_raw": composer_raw if composer_raw else None,
            "lyricist": lyricist,
            "lyricist_raw": lyricist_raw if lyricist_raw else None,
            "ragas": [],
            "ragas_raw": None,
            "taal": None,
            "taal_raw": None,
            "youtube_id": None,
            "lyrics": lyrics,
            "notes": None,
            "sources": ["bollywood_lyrics"],
        })

    logger.info(f"Parsed {len(songs)} songs from Bollywood Lyrics CSV")

    result = {
        "source": "bollywood_lyrics",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "songs": songs,
        "ragas": [],
        "taals": [],
    }
    return result


def run():
    """Scrape and write to staging."""
    result = scrape()
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote {len(result['songs'])} songs to {OUTPUT_PATH}")
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
