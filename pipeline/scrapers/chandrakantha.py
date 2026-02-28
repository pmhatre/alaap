"""Scraper for Chandrakantha.com film songs by raga.

Source: https://chandrakantha.com/music-and-dance/film-and-pop/film-songs-rags/
Each raga subpage has song entries as <p class="noindent"> blocks with newline-separated
key-value fields, followed by a comments <p>.
Fields: Song, Film, Year, Raga, Taal (unique!), Composer, Singer, Lyricist, Notes
"""

import json
import logging
import re
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

from normalizers.names import normalize_artist, split_singers
from normalizers.ragas import normalize_raga, normalize_raga_slug
from normalizers.songs import make_canonical_id, make_song_slug, normalize_year

logger = logging.getLogger(__name__)

INDEX_URL = "https://chandrakantha.com/music-and-dance/film-and-pop/film-songs-rags/"
OUTPUT_PATH = "staging/chandrakantha.json"
REQUEST_DELAY = 2  # seconds between page requests
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}


def _get_soup(url: str) -> BeautifulSoup:
    """Fetch a page and return parsed soup."""
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def _discover_raga_pages(soup: BeautifulSoup) -> list[dict]:
    """Extract raga subpage links from the index page.

    Raga pages follow the pattern: film-songs-in-rag-* or film-songs-rag-*
    """
    pages = []
    seen_urls = set()

    for a_tag in soup.select("a[href]"):
        href = a_tag["href"]
        text = a_tag.get_text(strip=True)
        if not text or not href:
            continue

        # Normalize to absolute URL
        if href.startswith("/"):
            full_url = f"https://chandrakantha.com{href}"
        elif href.startswith("http"):
            full_url = href
        else:
            continue

        # Only raga subpages
        if "film-songs-in-rag-" not in full_url and "film-songs-rag-" not in full_url:
            continue
        # Skip the index page itself
        if full_url.rstrip("/") == INDEX_URL.rstrip("/"):
            continue

        if full_url in seen_urls:
            continue
        seen_urls.add(full_url)

        # Derive raga name from URL (more reliable than link text which
        # can be pagination labels like "A", "B", "M-Z", "Bhairavi Lr")
        slug_part = full_url.rstrip("/").split("/")[-1]
        # e.g., "film-songs-in-rag-ahir-bhairav-m-z" → "Ahir Bhairav"
        name = slug_part.replace("film-songs-in-rag-", "").replace("film-songs-rag-", "")
        # Remove trailing pagination suffixes like -m-z, -a-l, -k-r2, -d, -sz, -ek, -lr, -2, -3
        name = re.sub(r"[-_]([a-z]{1,2}[-_][a-z]{1,2}\d*|[a-z]{1,2}\d*|\d+)$", "", name, flags=re.IGNORECASE)
        name = name.replace("-", " ").strip()
        # Strip trailing digits from names like "kedar2" → "kedar"
        name = re.sub(r"\d+$", "", name).strip()
        name = name.title()
        # If URL-derived name is empty or too short, fall back to link text
        if len(name) < 2:
            name = text

        pages.append({"name": name, "url": full_url})

    logger.info(f"Discovered {len(pages)} raga page URLs")
    return pages


def _parse_song_entry(text: str, raga_name: str) -> dict | None:
    """Parse a song entry from a <p class='noindent'> block.

    Format (newline-separated, value sometimes on next line):
        Song Title
        Film - Film Name
        Year - 1962
        Rag - Adana
        Tal -
        Rupaktal
        Music Director(s) - Madan Mohan
        Singer(s) -
        Lata Mangeshkar
        ...
    """
    lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
    if not lines:
        return None

    # First line is the song title
    title_raw = lines[0]

    # Parse remaining lines as key-value pairs.
    # Values may appear on the same line or on the next line.
    fields = {}
    i = 1
    while i < len(lines):
        line = lines[i]
        match = re.match(r"^(.+?)\s*[-–—]\s*(.*)$", line)
        if match:
            key = match.group(1).strip().lower()
            val = match.group(2).strip()
            # If value is empty, it's on the next line
            if not val and i + 1 < len(lines):
                next_line = lines[i + 1]
                # Only grab next line if it's NOT itself a key-value pair
                if not re.match(r"^.+?\s*[-–—]\s*", next_line):
                    val = next_line.strip()
                    i += 1
            fields[key] = val
        i += 1

    film_raw = fields.get("film", "")
    year_raw = fields.get("year", "")
    taal_raw = fields.get("tal", "") or fields.get("taal", "")
    composer_raw = fields.get("music director(s)", "") or fields.get("music director", "") or fields.get("composer", "")
    singer_raw = fields.get("singer(s)", "") or fields.get("singer", "") or fields.get("singers", "")
    lyricist_raw = fields.get("lyricist", "") or fields.get("lyicist", "")  # handle typo in source

    # Skip boilerplate values
    if lyricist_raw.lower().startswith("go to"):
        lyricist_raw = ""
    if singer_raw.lower().startswith("go to"):
        singer_raw = ""

    title = title_raw.strip()
    if not title:
        return None

    film = film_raw.strip() if film_raw.strip() else None
    year = normalize_year(year_raw)
    singers = split_singers(singer_raw) if singer_raw.strip() else []
    composer = normalize_artist(composer_raw) if composer_raw.strip() else None
    lyricist = normalize_artist(lyricist_raw) if lyricist_raw.strip() else None
    taal = taal_raw.strip() if taal_raw.strip() else None

    raga_canonical = normalize_raga(raga_name)
    canonical_id = make_canonical_id(title, film, year, singers[0] if singers else None)
    slug = make_song_slug(title, film, year)

    return {
        "canonical_id": canonical_id,
        "title": title,
        "title_raw": title_raw,
        "slug": slug,
        "film": film,
        "film_raw": film_raw if film_raw.strip() else None,
        "year": year,
        "singers": singers,
        "singers_raw": singer_raw if singer_raw.strip() else None,
        "composer": composer,
        "composer_raw": composer_raw if composer_raw.strip() else None,
        "lyricist": lyricist,
        "lyricist_raw": lyricist_raw if lyricist_raw.strip() else None,
        "ragas": [raga_canonical],
        "ragas_raw": raga_name,
        "taal": taal,
        "taal_raw": taal_raw if taal_raw.strip() else None,
        "youtube_id": None,
        "lyrics": None,
        "notes": None,
        "language": "Hindi",
        "sources": ["chandrakantha"],
    }


def _parse_page(soup: BeautifulSoup, raga_name: str) -> list[dict]:
    """Parse all song entries from a raga subpage.

    Song entries are <p class="noindent"> elements.
    Comments follow as the next <p> sibling (starting with "Comments").
    """
    content = soup.find("div", class_="entry-content")
    if not content:
        return []

    songs = []
    noindent_ps = content.find_all("p", class_="noindent")

    for p in noindent_ps:
        text = p.get_text("\n")
        song = _parse_song_entry(text, raga_name)
        if not song:
            continue

        # Look for comments in the next sibling <p>
        next_sib = p.find_next_sibling("p")
        if next_sib and "noindent" not in (next_sib.get("class") or []):
            comment_text = next_sib.get_text(strip=True)
            if comment_text.lower().startswith("comment"):
                # Strip "Comments –" prefix
                notes = re.sub(r"^comments?\s*[-–—]\s*", "", comment_text, flags=re.IGNORECASE).strip()
                if notes:
                    song["notes"] = notes

        songs.append(song)

    return songs


def scrape() -> dict:
    """Scrape the Chandrakantha raga index and all raga subpages."""
    logger.info("Fetching Chandrakantha raga index...")
    index_soup = _get_soup(INDEX_URL)
    raga_pages = _discover_raga_pages(index_soup)
    logger.info(f"Found {len(raga_pages)} raga page links")

    all_songs = []
    ragas_seen = {}
    taals_seen = {}

    for i, page in enumerate(raga_pages):
        raga_name = page["name"]
        url = page["url"]
        logger.info(f"  [{i + 1}/{len(raga_pages)}] Scraping {raga_name}: {url}")

        time.sleep(REQUEST_DELAY)
        try:
            soup = _get_soup(url)
        except requests.RequestException as e:
            logger.warning(f"    Failed to fetch {url}: {e}")
            continue

        page_songs = _parse_page(soup, raga_name)

        if page_songs:
            logger.info(f"    Parsed {len(page_songs)} songs")
            all_songs.extend(page_songs)

            # Track raga
            canonical = normalize_raga(raga_name)
            if canonical not in ragas_seen:
                ragas_seen[canonical] = {
                    "name": canonical,
                    "name_raw": raga_name,
                    "slug": normalize_raga_slug(raga_name),
                    "sources": ["chandrakantha"],
                }

            # Track taals
            for song in page_songs:
                if song["taal"] and song["taal"] not in taals_seen:
                    taals_seen[song["taal"]] = {
                        "name": song["taal"],
                        "name_raw": song["taal_raw"],
                        "sources": ["chandrakantha"],
                    }
        else:
            logger.info("    No songs found")

    logger.info(f"Total: {len(all_songs)} songs, {len(ragas_seen)} ragas, {len(taals_seen)} taals")

    result = {
        "source": "chandrakantha",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "songs": all_songs,
        "ragas": list(ragas_seen.values()),
        "taals": list(taals_seen.values()),
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
