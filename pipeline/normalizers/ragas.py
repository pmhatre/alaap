"""Raga name normalization for Hindustani classical music."""

import re

from slugify import slugify

# Curated dictionary: lowercased variant → canonical name.
# Covers 80+ ragas commonly found in golden era film music.
RAGA_CANONICAL: dict[str, str] = {
    # Bhairav family
    "bhairav": "Bhairav",
    "bhairava": "Bhairav",
    "bhairavi": "Bhairavi",
    "ahir bhairav": "Ahir Bhairav",
    "nat bhairav": "Nat Bhairav",
    "ramkali": "Ramkali",
    # Kalyan family
    "yaman": "Yaman",
    "iman": "Yaman",
    "emaan": "Yaman",
    "yaman kalyan": "Yaman Kalyan",
    "yaman kalyaan": "Yaman Kalyan",
    "shuddh kalyan": "Shuddh Kalyan",
    "shudh kalyan": "Shuddh Kalyan",
    "hameer": "Hameer",
    "hamir": "Hameer",
    "kedar": "Kedar",
    "kamod": "Kamod",
    "gaund sarang": "Gaund Sarang",
    # Bilawal family
    "bilawal": "Bilawal",
    "alhaiya bilawal": "Alhaiya Bilawal",
    "des": "Des",
    "desh": "Des",
    "durga": "Durga",
    "hansdhwani": "Hansdhwani",
    "hans dhwani": "Hansdhwani",
    # Khamaj family
    "khamaj": "Khamaj",
    "des (khamaj)": "Des",
    "tilak kamod": "Tilak Kamod",
    "jhinjhoti": "Jhinjhoti",
    "jinjhoti": "Jhinjhoti",
    "rageshri": "Rageshri",
    "rageshree": "Rageshri",
    # Kafi family
    "kafi": "Kafi",
    "sindhi bhairavi": "Sindhi Bhairavi",
    "pilu": "Pilu",
    "piloo": "Pilu",
    "pahadi": "Pahadi",
    "pahari": "Pahadi",
    # Asavari family
    "asavari": "Asavari",
    "darbari kanada": "Darbari Kanada",
    "darbari": "Darbari Kanada",
    "darbari kannada": "Darbari Kanada",
    "jaunpuri": "Jaunpuri",
    "adana": "Adana",
    # Todi family
    "todi": "Todi",
    "miyan ki todi": "Todi",
    "multani": "Multani",
    "gujri todi": "Gujri Todi",
    "gujari todi": "Gujri Todi",
    # Marwa family
    "marwa": "Marwa",
    "puriya": "Puriya",
    "sohni": "Sohni",
    "puriya dhanashree": "Puriya Dhanashree",
    "puriya dhanashri": "Puriya Dhanashree",
    # Poorvi family
    "poorvi": "Poorvi",
    "purvi": "Poorvi",
    "shree": "Shree",
    "paraj": "Paraj",
    "basant": "Basant",
    # Miscellaneous common ragas
    "malkauns": "Malkauns",
    "malkosh": "Malkauns",
    "hindol": "Hindol",
    "hindola": "Hindol",
    "bageshri": "Bageshri",
    "bageshree": "Bageshri",
    "bihag": "Bihag",
    "bihaag": "Bihag",
    "maru bihag": "Maru Bihag",
    "chandrakauns": "Chandrakauns",
    "chandra kauns": "Chandrakauns",
    "shivranjani": "Shivranjani",
    "shiv ranjani": "Shivranjani",
    "charukeshi": "Charukeshi",
    "jaijaiwanti": "Jaijaiwanti",
    "jai jaiwanti": "Jaijaiwanti",
    "jayjaywanti": "Jaijaiwanti",
    "jayjaivanti": "Jaijaiwanti",
    "bhoopali": "Bhoopali",
    "bhupali": "Bhoopali",
    "bhoop": "Bhoopali",
    "bhopali": "Bhoopali",
    "sarang": "Sarang",
    "megh": "Megh",
    "megh malhar": "Megh Malhar",
    "malhar": "Malhar",
    "mian ki malhar": "Mian Ki Malhar",
    "miyan ki malhar": "Mian Ki Malhar",
    "gaud malhar": "Gaud Malhar",
    "sur malhar": "Sur Malhar",
    "tilang": "Tilang",
    "mishra tilang": "Mishra Tilang",
    "mishra pilu": "Mishra Pilu",
    "mishra khamaj": "Mishra Khamaj",
    "mishra kafi": "Mishra Kafi",
    "mishra bhairavi": "Mishra Bhairavi",
    "kirwani": "Kirwani",
    "kirvani": "Kirwani",
    "lalit": "Lalit",
    "lalita": "Lalit",
    "madhuvanti": "Madhuvanti",
    "madhukauns": "Madhukauns",
    "patdeep": "Patdeep",
    "pat deep": "Patdeep",
    "jayant malhar": "Jayant Malhar",
    "brindavani sarang": "Brindavani Sarang",
    "vrindavani sarang": "Brindavani Sarang",
    "nat": "Nat",
    "nand": "Nand",
    "gauri": "Gauri",
    "vibhas": "Vibhas",
    "gunkali": "Gunkali",
    "gunakri": "Gunkali",
    "todi (carnatic)": "Todi",
    "hamsadhwani": "Hansdhwani",
    "jan sammohini": "Jan Sammohini",
    "zilaf": "Zilaf",
    "bhatiyar": "Bhatiyar",
    "champakali": "Champakali",
}


def _strip_raga_prefix(text: str) -> str:
    """Remove Raag/Raga/Rag prefix."""
    return re.sub(r"^(raag|raga|rag)\s+", "", text, flags=re.IGNORECASE).strip()


def normalize_raga(raw: str) -> str:
    """Normalize a raga name to its canonical form.

    Strips Raag/Raga/Rag prefix, then looks up in curated dictionary.
    Falls back to .title() casing.
    """
    if not raw or not raw.strip():
        return ""
    text = _strip_raga_prefix(raw.strip())
    key = text.lower().strip()
    if not key:
        return ""
    return RAGA_CANONICAL.get(key, text.title())


def normalize_raga_slug(name: str) -> str:
    """Generate a URL-safe slug from a canonical raga name."""
    canonical = normalize_raga(name)
    return slugify(canonical)


def split_ragas(raw: str) -> list[str]:
    """Split a multi-raga string and normalize each.

    Handles delimiters: comma, slash, semicolon.
    """
    if not raw or not raw.strip():
        return []
    parts = re.split(r"\s*[,/;]\s*", raw)
    result = []
    for part in parts:
        name = normalize_raga(part)
        if name and name not in result:
            result.append(name)
    return result
