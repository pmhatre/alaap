"""Scraper for Wikipedia's 'List of film songs based on ragas'.

Source: https://en.wikipedia.org/wiki/List_of_film_songs_based_on_ragas
Structure: single large wikitable with columns: Rāg, Song, Film, Music composer, Singer(s), Lang.
Column detection is header-text-based (not positional).
Captures language from the Lang column (defaults to Hindi if blank).
"""

import json
import logging
import re
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

from normalizers.names import normalize_artist, split_singers
from normalizers.ragas import normalize_raga, normalize_raga_slug, split_ragas
from normalizers.songs import make_canonical_id, make_song_slug, normalize_year

logger = logging.getLogger(__name__)

WIKI_URL = "https://en.wikipedia.org/wiki/List_of_film_songs_based_on_ragas"
OUTPUT_PATH = "staging/wikipedia.json"
HEADERS = {"User-Agent": "AlaapBot/0.1 (https://github.com/praneetmhatre/alaap; personal research project)"}

# Map header text (lowercased, cleaned) to our field names
HEADER_MAP = {
    "rāg": "raga",
    "rag": "raga",
    "raag": "raga",
    "raga": "raga",
    "song": "title",
    "song name": "title",
    "song title": "title",
    "film": "film",
    "movie": "film",
    "film name": "film",
    "year": "year",
    "singer": "singers",
    "singers": "singers",
    "singer(s)": "singers",
    "playback singer": "singers",
    "playback singer(s)": "singers",
    "sung by": "singers",
    "composer": "composer",
    "music": "composer",
    "music director": "composer",
    "music composer": "composer",
    "lyricist": "lyricist",
    "lyrics": "lyricist",
    "lyrics by": "lyricist",
    "lyricist(s)": "lyricist",
    "lang": "lang",
    "language": "lang",
    "notes": "notes",
    "remarks": "notes",
}


def _detect_columns(header_row) -> dict[int, str]:
    """Map column index → field name from header cells."""
    col_map = {}
    cells = header_row.find_all(["th", "td"])
    for i, cell in enumerate(cells):
        text = cell.get_text(strip=True).lower()
        # Remove footnote references like [1]
        text = re.sub(r"\[.*?\]", "", text).strip()
        field = HEADER_MAP.get(text)
        if not field:
            for key, val in HEADER_MAP.items():
                if text.startswith(key) or key.startswith(text):
                    field = val
                    break
        if field:
            col_map[i] = field
    return col_map


def _clean_wiki_text(text: str) -> str:
    """Clean Wikipedia cell text: remove refs, citation markers, quotes."""
    text = re.sub(r"\[.*?\]", "", text)  # [1], [citation needed], etc.
    # Strip surrounding quotes
    text = text.strip().strip('"').strip('"').strip('"').strip("'")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_year_from_film(film_text: str) -> tuple[str, int | None]:
    """Extract year from film text like 'Sharmeelee' or 'Ram Rajya (1943 film)'.

    Returns (clean_film_name, year_or_none).
    """
    # Match patterns like "(1943 film)" or "(1965)"
    match = re.search(r"\((\d{4})(?:\s*film)?\)", film_text)
    year = int(match.group(1)) if match else None
    # Remove the parenthetical from the film name
    clean = re.sub(r"\s*\(\d{4}(?:\s*film)?\)", "", film_text).strip()
    return clean, year


def scrape() -> dict:
    """Scrape the Wikipedia list of film songs based on ragas."""
    logger.info("Fetching Wikipedia raga song list...")
    resp = requests.get(WIKI_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    container = soup.find("div", {"class": "mw-parser-output"})
    table = container.find("table", class_="wikitable")
    if not table:
        logger.error("No wikitable found on page")
        return {"source": "wikipedia", "scraped_at": datetime.now(timezone.utc).isoformat(),
                "songs": [], "ragas": [], "taals": []}

    rows = table.find_all("tr")
    if len(rows) < 2:
        logger.error("Table has no data rows")
        return {"source": "wikipedia", "scraped_at": datetime.now(timezone.utc).isoformat(),
                "songs": [], "ragas": [], "taals": []}

    col_map = _detect_columns(rows[0])
    logger.info(f"Column mapping: {col_map}")

    if "title" not in col_map.values():
        logger.error(f"No title column found in headers: {col_map}")
        return {"source": "wikipedia", "scraped_at": datetime.now(timezone.utc).isoformat(),
                "songs": [], "ragas": [], "taals": []}

    all_songs = []
    ragas_seen = {}

    for row in rows[1:]:
        cells = row.find_all(["td", "th"])
        if len(cells) < 2:
            continue

        record = {}
        for i, cell in enumerate(cells):
            field = col_map.get(i)
            if field:
                record[field] = _clean_wiki_text(cell.get_text(strip=True))

        # Capture language (blank lang = Hindi)
        lang_raw = record.get("lang", "").strip()
        language = lang_raw.title() if lang_raw else "Hindi"

        title_raw = record.get("title", "").strip()
        if not title_raw:
            continue

        raga_raw = record.get("raga", "").strip()
        film_raw = record.get("film", "").strip()
        singer_raw = record.get("singers", "").strip()
        composer_raw = record.get("composer", "").strip()
        lyricist_raw = record.get("lyricist", "").strip()
        notes = record.get("notes", "").strip() or None

        title = title_raw
        # Extract year from film name if present (e.g., "Ram Rajya (1943 film)")
        film, year = _extract_year_from_film(film_raw) if film_raw else (None, None)
        if not film:
            film = None

        singers = split_singers(singer_raw) if singer_raw else []
        composer = normalize_artist(composer_raw) if composer_raw else None
        lyricist = normalize_artist(lyricist_raw) if lyricist_raw else None

        # Handle raga — may contain multiple ragas separated by /
        ragas = split_ragas(raga_raw) if raga_raw else []

        canonical_id = make_canonical_id(title, film, year, singers[0] if singers else None)
        slug = make_song_slug(title, film, year)

        all_songs.append({
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
            "ragas": ragas,
            "ragas_raw": raga_raw if raga_raw else None,
            "taal": None,
            "taal_raw": None,
            "youtube_id": None,
            "lyrics": None,
            "notes": notes,
            "language": language,
            "sources": ["wikipedia"],
        })

        # Track ragas
        for raga in ragas:
            if raga not in ragas_seen:
                ragas_seen[raga] = {
                    "name": raga,
                    "name_raw": raga_raw,
                    "slug": normalize_raga_slug(raga_raw),
                    "sources": ["wikipedia"],
                }

    # Count by language
    lang_counts = {}
    for s in all_songs:
        lang_counts[s["language"]] = lang_counts.get(s["language"], 0) + 1
    logger.info(f"Parsed {len(all_songs)} songs ({lang_counts})")
    logger.info(f"Found {len(ragas_seen)} unique ragas")

    result = {
        "source": "wikipedia",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "songs": all_songs,
        "ragas": list(ragas_seen.values()),
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
