"""Artist name normalization for golden era Indian film music."""

import re

from slugify import slugify

# Curated dictionary: lowercased variant → canonical form.
# Covers the ~50 most common artists in the golden era corpus.
ARTIST_CANONICAL: dict[str, str] = {
    # Singers
    "lata mangeshkar": "Lata Mangeshkar",
    "lata": "Lata Mangeshkar",
    "mohammed rafi": "Mohammed Rafi",
    "mohammad rafi": "Mohammed Rafi",
    "mohd rafi": "Mohammed Rafi",
    "mohd. rafi": "Mohammed Rafi",
    "md. rafi": "Mohammed Rafi",
    "rafi": "Mohammed Rafi",
    "kishore kumar": "Kishore Kumar",
    "kishore da": "Kishore Kumar",
    "asha bhosle": "Asha Bhosle",
    "asha bhosley": "Asha Bhosle",
    "asha": "Asha Bhosle",
    "mukesh": "Mukesh",
    "mukesh chand mathur": "Mukesh",
    "geeta dutt": "Geeta Dutt",
    "geeta roy": "Geeta Dutt",
    "geeta roy dutt": "Geeta Dutt",
    "talat mahmood": "Talat Mahmood",
    "talat mehmood": "Talat Mahmood",
    "manna dey": "Manna Dey",
    "manna de": "Manna Dey",
    "hemant kumar": "Hemant Kumar",
    "hemant kumar mukherjee": "Hemant Kumar",
    "suraiya": "Suraiya",
    "shamshad begum": "Shamshad Begum",
    "mahendra kapoor": "Mahendra Kapoor",
    "suman kalyanpur": "Suman Kalyanpur",
    "kamal barot": "Kamal Barot",
    "usha mangeshkar": "Usha Mangeshkar",
    "chorus": "Chorus",
    # Composers
    "naushad": "Naushad",
    "naushad ali": "Naushad",
    "s.d. burman": "S.D. Burman",
    "sd burman": "S.D. Burman",
    "s d burman": "S.D. Burman",
    "sachin dev burman": "S.D. Burman",
    "sachindeb burman": "S.D. Burman",
    "r.d. burman": "R.D. Burman",
    "rd burman": "R.D. Burman",
    "r d burman": "R.D. Burman",
    "rahul dev burman": "R.D. Burman",
    "pancham": "R.D. Burman",
    "madan mohan": "Madan Mohan",
    "madan mohan kohli": "Madan Mohan",
    "shankar jaikishan": "Shankar-Jaikishan",
    "shankar-jaikishan": "Shankar-Jaikishan",
    "shankar jaikishen": "Shankar-Jaikishan",
    "shankarjaikishan": "Shankar-Jaikishan",
    "o.p. nayyar": "O.P. Nayyar",
    "op nayyar": "O.P. Nayyar",
    "o p nayyar": "O.P. Nayyar",
    "roshan": "Roshan",
    "roshan lal nagrath": "Roshan",
    "salil chowdhury": "Salil Chowdhury",
    "salil choudhury": "Salil Chowdhury",
    "salil da": "Salil Chowdhury",
    "khayyam": "Khayyam",
    "mohammed zahur khayyam": "Khayyam",
    "c. ramchandra": "C. Ramchandra",
    "c ramchandra": "C. Ramchandra",
    "chitragupta": "Chitragupta",
    "vasant desai": "Vasant Desai",
    "anil biswas": "Anil Biswas",
    "hemant kumar (composer)": "Hemant Kumar",
    "jaidev": "Jaidev",
    "ravi": "Ravi",
    "ravi shankar sharma": "Ravi",
    "ravi shankar": "Ravi Shankar",
    "kalyanji anandji": "Kalyanji-Anandji",
    "kalyanji-anandji": "Kalyanji-Anandji",
    "kalyanjianandji": "Kalyanji-Anandji",
    "laxmikant pyarelal": "Laxmikant-Pyarelal",
    "laxmikant-pyarelal": "Laxmikant-Pyarelal",
    "laxmikantpyarelal": "Laxmikant-Pyarelal",
    # Lyricists
    "sahir ludhianvi": "Sahir Ludhianvi",
    "sahir": "Sahir Ludhianvi",
    "shailendra": "Shailendra",
    "hasrat jaipuri": "Hasrat Jaipuri",
    "majrooh sultanpuri": "Majrooh Sultanpuri",
    "majrooh": "Majrooh Sultanpuri",
    "shakeel badayuni": "Shakeel Badayuni",
    "shakeel": "Shakeel Badayuni",
    "kaifi azmi": "Kaifi Azmi",
    "rajendra krishan": "Rajendra Krishan",
    "raja mehdi ali khan": "Raja Mehdi Ali Khan",
    "anand bakshi": "Anand Bakshi",
    "gulzar": "Gulzar",
    "sampooran singh kalra": "Gulzar",
    "neeraj": "Neeraj",
    "gopaldas saxena neeraj": "Neeraj",
    "bharat vyas": "Bharat Vyas",
    "pradeep": "Pradeep",
    "indeevar": "Indeevar",
}


def _pre_normalize(raw: str) -> str:
    """Strip parentheticals, collapse whitespace, lowercase."""
    text = re.sub(r"\(.*?\)", "", raw)  # remove (playback), (composer), etc.
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def normalize_artist(raw: str) -> str:
    """Normalize an artist name to its canonical form.

    Looks up in curated dictionary first, falls back to .title() casing.
    """
    if not raw or not raw.strip():
        return ""
    key = _pre_normalize(raw)
    if not key:
        return ""
    return ARTIST_CANONICAL.get(key, raw.strip().title())


def split_singers(raw: str) -> list[str]:
    """Split a multi-singer string and normalize each name.

    Handles delimiters: comma, ampersand, 'and', semicolon.
    """
    if not raw or not raw.strip():
        return []
    # Split on common delimiters
    parts = re.split(r"\s*[,;&]\s*|\s+and\s+", raw, flags=re.IGNORECASE)
    result = []
    for part in parts:
        name = normalize_artist(part)
        if name and name not in result:
            result.append(name)
    return result


def normalize_artist_slug(name: str) -> str:
    """Generate a URL-safe slug from a canonical artist name."""
    canonical = normalize_artist(name)
    return slugify(canonical)
