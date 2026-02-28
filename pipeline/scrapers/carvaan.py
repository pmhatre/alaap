"""Scraper for Saregama Carvaan song list (GitHub markdown files).

Source: GitHub API → labnol/saregama-carvaan/contents/artistes → per-artist .md files
Fields: Song title (linked to YouTube), Film, Singer (from filename)
No year/composer/lyricist/raga. Key value: YouTube IDs.
"""

import json
import logging
import re
import time
from datetime import datetime, timezone

import requests

from normalizers.names import normalize_artist
from normalizers.songs import make_canonical_id, make_song_slug

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com/repos/labnol/saregama-carvaan/contents/artistes"
OUTPUT_PATH = "staging/carvaan.json"
REQUEST_DELAY = 0.5  # seconds between GitHub API requests


def _extract_youtube_id(url: str) -> str | None:
    """Extract YouTube video ID from a URL."""
    match = re.search(r"(?:youtu\.be/|youtube\.com/watch\?v=|youtube\.com/embed/)([a-zA-Z0-9_-]{11})", url)
    return match.group(1) if match else None


def _parse_markdown(content: str, artist_name: str) -> list[dict]:
    """Parse a Carvaan artist markdown file into song records.

    Actual format is a pipe-delimited markdown table:
      Cover Art | Title | Movie | Artiste
      ---|---|---|---
      [![Film](thumb)](youtu.be/ID)|[ Song Title](youtu.be/ID)|Film|Artist
    """
    songs = []
    for line in content.split("\n"):
        line = line.strip()
        if not line or line.startswith("---") or line.startswith("Cover"):
            continue

        # Split on pipe delimiter
        cols = line.split("|")
        if len(cols) < 3:
            continue

        # Column 0: cover art (has YouTube link), Column 1: title (has YouTube link),
        # Column 2: film, Column 3: artist (we use filename instead)
        title_col = cols[1].strip()
        film_raw = cols[2].strip() if len(cols) > 2 else None

        # Extract title text from markdown link: [ Song Title](url)
        title_match = re.search(r"\[(.+?)\]\((.+?)\)", title_col)
        if not title_match:
            continue

        title_raw = title_match.group(1).strip()
        url = title_match.group(2).strip()

        # Also try to get YouTube ID from cover art column (same ID)
        youtube_id = _extract_youtube_id(url)
        if not youtube_id:
            # Try from cover art column
            cover_col = cols[0].strip()
            cover_match = re.search(r"\((.+?)\)", cover_col)
            if cover_match:
                youtube_id = _extract_youtube_id(cover_match.group(1))

        title = title_raw.strip()
        film = film_raw.strip() if film_raw and film_raw.strip() else None
        singer = normalize_artist(artist_name)

        canonical_id = make_canonical_id(title, film, None, singer)
        slug = make_song_slug(title, film, None)

        songs.append({
            "canonical_id": canonical_id,
            "title": title,
            "title_raw": title_raw,
            "slug": slug,
            "film": film,
            "film_raw": film_raw,
            "year": None,
            "singers": [singer] if singer else [],
            "singers_raw": artist_name,
            "composer": None,
            "composer_raw": None,
            "lyricist": None,
            "lyricist_raw": None,
            "ragas": [],
            "ragas_raw": None,
            "taal": None,
            "taal_raw": None,
            "youtube_id": youtube_id,
            "lyrics": None,
            "notes": None,
            "sources": ["carvaan"],
        })

    return songs


def _artist_name_from_filename(filename: str) -> str:
    """Derive artist name from markdown filename.

    e.g., 'lata-mangeshkar.md' → 'Lata Mangeshkar'
    """
    name = filename.replace(".md", "").replace("-", " ")
    return name


def scrape() -> dict:
    """Fetch artist file list from GitHub API, then parse each markdown file."""
    logger.info("Fetching Carvaan artist list from GitHub API...")
    resp = requests.get(GITHUB_API_BASE, timeout=30)
    resp.raise_for_status()
    file_list = resp.json()

    all_songs = []
    md_files = [f for f in file_list if f["name"].endswith(".md")]
    logger.info(f"Found {len(md_files)} artist files")

    for i, file_info in enumerate(md_files):
        filename = file_info["name"]
        download_url = file_info.get("download_url")
        if not download_url:
            continue

        artist_name = _artist_name_from_filename(filename)
        logger.info(f"  [{i + 1}/{len(md_files)}] Parsing {filename} ({artist_name})")

        time.sleep(REQUEST_DELAY)
        content_resp = requests.get(download_url, timeout=30)
        content_resp.raise_for_status()

        songs = _parse_markdown(content_resp.text, artist_name)
        all_songs.extend(songs)

    logger.info(f"Parsed {len(all_songs)} songs from Carvaan")

    result = {
        "source": "carvaan",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "songs": all_songs,
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
