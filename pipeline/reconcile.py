"""Reconciler: merge staging JSONs from all scrapers into a unified dataset.

Source priority per field:
  title/film/year/singers/composer/lyricist: chandrakantha > wikipedia > bollywood_lyrics > carvaan
  ragas: chandrakantha > wikipedia (union, flag conflicts)
  taal: chandrakantha only
  youtube_id: carvaan only
  lyrics: bollywood_lyrics only
  notes: chandrakantha only

Outputs:
  staging/merged.json  — full reconciled dataset with deduplicated nodes
  staging/conflicts.json — raga disagreements for manual review
"""

import json
import logging
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

STAGING_DIR = Path("staging")
SOURCES_PRIORITY = ["chandrakantha", "wikipedia", "bollywood_lyrics", "carvaan"]

# Files to read (in priority order)
STAGING_FILES = {
    "chandrakantha": STAGING_DIR / "chandrakantha.json",
    "wikipedia": STAGING_DIR / "wikipedia.json",
    "bollywood_lyrics": STAGING_DIR / "bollywood_lyrics.json",
    "carvaan": STAGING_DIR / "carvaan.json",
}


def _load_staging(source: str) -> dict | None:
    """Load a staging JSON file if it exists."""
    path = STAGING_FILES[source]
    if not path.exists():
        logger.warning(f"Staging file not found: {path}")
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _pick_best(field: str, candidates: dict[str, str | None]) -> str | None:
    """Pick the best value for a field based on source priority."""
    for source in SOURCES_PRIORITY:
        val = candidates.get(source)
        if val is not None and (isinstance(val, str) and val.strip() or not isinstance(val, str)):
            return val
    return None


def _pick_best_list(field: str, candidates: dict[str, list]) -> list:
    """Pick the best list value based on source priority."""
    for source in SOURCES_PRIORITY:
        val = candidates.get(source)
        if val:
            return val
    return []


def _merge_ragas(candidates: dict[str, list[str]]) -> tuple[list[str], dict | None]:
    """Merge raga lists from multiple sources. Return (merged, conflict_or_none)."""
    non_empty = {s: ragas for s, ragas in candidates.items() if ragas}
    if not non_empty:
        return [], None

    # Union all ragas
    all_ragas = []
    for ragas in non_empty.values():
        for r in ragas:
            if r not in all_ragas:
                all_ragas.append(r)

    # Check for conflicts (sources disagree on ragas)
    sources_list = list(non_empty.keys())
    conflict = None
    if len(sources_list) > 1:
        first_set = set(non_empty[sources_list[0]])
        for s in sources_list[1:]:
            other_set = set(non_empty[s])
            if first_set != other_set:
                conflict = {s: list(ragas) for s, ragas in non_empty.items()}
                break

    return all_ragas, conflict


def reconcile() -> tuple[dict, list[dict]]:
    """Reconcile all staging files into a unified dataset."""
    # Load all available staging files
    staging_data = {}
    for source in SOURCES_PRIORITY:
        data = _load_staging(source)
        if data:
            staging_data[source] = data
            logger.info(f"Loaded {source}: {len(data['songs'])} songs")

    if not staging_data:
        logger.error("No staging files found!")
        return {"songs": [], "artists": [], "films": [], "ragas": [], "taals": [], "stats": {}}, []

    # Group songs by canonical_id
    songs_by_id: dict[str, dict[str, dict]] = defaultdict(dict)
    for source, data in staging_data.items():
        for song in data["songs"]:
            cid = song["canonical_id"]
            songs_by_id[cid][source] = song

    # Merge songs
    merged_songs = []
    conflicts = []

    for canonical_id, source_songs in songs_by_id.items():
        # Gather candidates per field
        title_candidates = {s: song["title"] for s, song in source_songs.items()}
        film_candidates = {s: song["film"] for s, song in source_songs.items()}
        year_candidates = {s: song["year"] for s, song in source_songs.items()}
        singer_candidates = {s: song["singers"] for s, song in source_songs.items()}
        composer_candidates = {s: song["composer"] for s, song in source_songs.items()}
        lyricist_candidates = {s: song["lyricist"] for s, song in source_songs.items()}
        raga_candidates = {s: song["ragas"] for s, song in source_songs.items()}
        language_candidates = {s: song.get("language") for s, song in source_songs.items()}

        # Merge per field
        title = _pick_best("title", title_candidates)
        film = _pick_best("film", film_candidates)
        year = _pick_best("year", year_candidates)
        singers = _pick_best_list("singers", singer_candidates)
        composer = _pick_best("composer", composer_candidates)
        lyricist = _pick_best("lyricist", lyricist_candidates)
        ragas, raga_conflict = _merge_ragas(raga_candidates)
        language = _pick_best("language", language_candidates)

        # Source-specific fields
        taal = None
        taal_raw = None
        youtube_id = None
        lyrics = None
        notes = None
        slug = None

        for source, song in source_songs.items():
            if source == "chandrakantha":
                taal = taal or song.get("taal")
                taal_raw = taal_raw or song.get("taal_raw")
                notes = notes or song.get("notes")
            if source == "carvaan":
                youtube_id = youtube_id or song.get("youtube_id")
            if source == "bollywood_lyrics":
                lyrics = lyrics or song.get("lyrics")
            slug = slug or song.get("slug")

        # Collect all sources
        all_sources = list(source_songs.keys())

        merged_songs.append({
            "canonical_id": canonical_id,
            "title": title,
            "slug": slug,
            "film": film,
            "year": year,
            "singers": singers,
            "composer": composer,
            "lyricist": lyricist,
            "ragas": ragas,
            "taal": taal,
            "taal_raw": taal_raw,
            "youtube_id": youtube_id,
            "lyrics": lyrics,
            "notes": notes,
            "language": language,
            "sources": all_sources,
        })

        if raga_conflict:
            conflicts.append({
                "canonical_id": canonical_id,
                "title": title,
                "film": film,
                "year": year,
                "raga_by_source": raga_conflict,
            })

    # Extract and deduplicate nodes
    artists_seen = {}
    films_seen = {}
    ragas_seen = {}
    taals_seen = {}

    for song in merged_songs:
        # Artists (singers, composer, lyricist)
        for singer in song.get("singers", []):
            if singer and singer not in artists_seen:
                artists_seen[singer] = {"name": singer, "roles": ["singer"]}
            elif singer and "singer" not in artists_seen[singer]["roles"]:
                artists_seen[singer]["roles"].append("singer")

        comp = song.get("composer")
        if comp:
            if comp not in artists_seen:
                artists_seen[comp] = {"name": comp, "roles": ["composer"]}
            elif "composer" not in artists_seen[comp]["roles"]:
                artists_seen[comp]["roles"].append("composer")

        lyr = song.get("lyricist")
        if lyr:
            if lyr not in artists_seen:
                artists_seen[lyr] = {"name": lyr, "roles": ["lyricist"]}
            elif "lyricist" not in artists_seen[lyr]["roles"]:
                artists_seen[lyr]["roles"].append("lyricist")

        # Films
        film = song.get("film")
        year = song.get("year")
        if film:
            film_key = f"{film}|{year or 'unknown'}"
            if film_key not in films_seen:
                films_seen[film_key] = {"title": film, "year": year, "language": song.get("language")}

        # Ragas
        for raga in song.get("ragas", []):
            if raga and raga not in ragas_seen:
                ragas_seen[raga] = {"name": raga}

        # Taals
        taal = song.get("taal")
        if taal and taal not in taals_seen:
            taals_seen[taal] = {"name": taal}

    # Also pull in ragas/taals from staging source-level records
    for source, data in staging_data.items():
        for raga in data.get("ragas", []):
            name = raga["name"]
            if name not in ragas_seen:
                ragas_seen[name] = {"name": name, "slug": raga.get("slug")}

        for taal in data.get("taals", []):
            name = taal["name"]
            if name not in taals_seen:
                taals_seen[name] = {"name": name}

    stats = {
        "total_songs": len(merged_songs),
        "total_artists": len(artists_seen),
        "total_films": len(films_seen),
        "total_ragas": len(ragas_seen),
        "total_taals": len(taals_seen),
        "total_conflicts": len(conflicts),
        "songs_per_source": {s: len(d["songs"]) for s, d in staging_data.items()},
        "multi_source_songs": sum(1 for s in merged_songs if len(s["sources"]) > 1),
    }

    merged = {
        "reconciled_at": datetime.now(timezone.utc).isoformat(),
        "stats": stats,
        "songs": merged_songs,
        "artists": list(artists_seen.values()),
        "films": list(films_seen.values()),
        "ragas": list(ragas_seen.values()),
        "taals": list(taals_seen.values()),
    }

    return merged, conflicts


def run():
    """Reconcile staging files and write outputs."""
    merged, conflicts = reconcile()

    merged_path = STAGING_DIR / "merged.json"
    with open(merged_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote merged dataset to {merged_path}")
    logger.info(f"Stats: {json.dumps(merged['stats'], indent=2)}")

    conflicts_path = STAGING_DIR / "conflicts.json"
    with open(conflicts_path, "w", encoding="utf-8") as f:
        json.dump(conflicts, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote {len(conflicts)} conflicts to {conflicts_path}")

    return merged, conflicts


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
