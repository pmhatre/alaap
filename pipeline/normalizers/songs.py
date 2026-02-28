"""Song normalization: canonical IDs, slugs, and year extraction."""

import re
import unicodedata

from slugify import slugify


def _normalize_text(text: str) -> str:
    """Lowercase, strip accents/diacritics, collapse whitespace, remove punctuation."""
    if not text:
        return ""
    # Normalize unicode, strip combining characters (accents)
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Lowercase, strip punctuation, collapse whitespace
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def make_canonical_id(
    title: str,
    film: str | None = None,
    year: str | int | None = None,
    singer: str | None = None,
) -> str:
    """Create a canonical song ID for cross-source matching.

    Format for filmi songs:  normalize(title)|normalize(film)|year
    Format for non-filmi:    normalize(title)|normalize(singer)|year
    If year is unknown:      ....|unknown
    """
    norm_title = _normalize_text(title) if title else ""
    year_str = str(normalize_year(year)) if normalize_year(year) else "unknown"

    if film and film.strip():
        norm_film = _normalize_text(film)
        return f"{norm_title}|{norm_film}|{year_str}"
    elif singer and singer.strip():
        norm_singer = _normalize_text(singer)
        return f"{norm_title}|{norm_singer}|{year_str}"
    else:
        return f"{norm_title}||{year_str}"


def make_song_slug(
    title: str,
    film: str | None = None,
    year: str | int | None = None,
) -> str:
    """Generate a URL-safe slug for a song.

    Format: title-film-year or title-year if no film.
    """
    parts = [title]
    if film and film.strip():
        parts.append(film)
    yr = normalize_year(year)
    if yr:
        parts.append(str(yr))
    return slugify(" ".join(parts))


def normalize_year(raw: str | int | None) -> int | None:
    """Extract a 4-digit year from various formats.

    Handles: "1965", "(1965)", "1965-66", "c. 1965", "1965?", etc.
    Returns None if no valid year found.
    """
    if raw is None:
        return None
    if isinstance(raw, int):
        return raw if 1900 <= raw <= 2100 else None
    text = str(raw).strip()
    if not text:
        return None
    match = re.search(r"(19\d{2}|20\d{2})", text)
    if match:
        return int(match.group(1))
    return None
