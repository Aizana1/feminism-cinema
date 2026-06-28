import csv
import json
import re
import sys
import time
from pathlib import Path

import requests
import gender_guesser.detector as gd


def find_project_root(start: Path) -> Path:
    for p in [start, *start.parents]:
        if (p / ".git").exists() or (p / "README.md").exists():
            return p
    return start.parent


PROJECT_ROOT = find_project_root(Path(__file__).resolve())
DEFAULT_IN = PROJECT_ROOT / "data" / "raw" / "awards.csv"
DEFAULT_OUT = PROJECT_ROOT / "data" / "awards_with_gender.csv"
CACHE_PATH = PROJECT_ROOT / "data" / "raw" / "gender_cache.json"

WD_API = "https://www.wikidata.org/w/api.php"
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "feminism-cinema-research/1.0 "
                  "(https://github.com/Aizana1/feminism-cinema; educational KRE project)",
    "Accept": "application/json",
})


def _wd_get(params: dict, attempts: int = 4) -> dict | None:
    for i in range(attempts):
        try:
            r = SESSION.get(WD_API, params=params, timeout=30)
            if r.status_code == 429: 
                wait = int(r.headers.get("Retry-After", 2 + i * 2))
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        except Exception as e:
            if i == attempts - 1:
                key = params.get("search") or params.get("ids")
                print(f"    [wikidata] request failed for {key!r}: {e}")
                return None
            time.sleep(1 + i)  
    return None

HUMAN_QID = "Q5"
GENDER_QIDS = {
    "Q6581097": "male",
    "Q6581072": "female",
    "Q48270": "non-binary",
    "Q1052281": "trans woman",
    "Q2449503": "trans man",
    "Q1097630": "intersex",
}

_detector = gd.Detector(case_sensitive=False)

_SEP = re.compile(r"\s+and\s+|&|;|,", re.IGNORECASE)

_CREDIT_MARKER = re.compile(
    r"(?:music and lyrics by|words and music by|music by|lyrics? by|words by|"
    r"score by|song by|written by|screenplay by|story by|directed by|"
    r"production design|set decoration)\b\s*:?\s*",
    re.IGNORECASE,
)
_DISCARD = {"producer", "producers", "writer", "writers", "director",
            "directors", "jr", "sr", "ii", "iii", "iv", "v"}

_LABEL_COLON = re.compile(r"^[A-Za-z][\w &/.'-]*:\s*")


def split_people(name: str) -> list[str]:
    if not name:
        return []
    s = name
    if _CREDIT_MARKER.search(s):
        s = " ; ".join(seg for seg in _CREDIT_MARKER.split(s)[1:] if seg.strip())

    people: list[str] = []
    for part in _SEP.split(s):
        p = _LABEL_COLON.sub("", part.strip())       
        p = re.split(r"\s+by\s+", p, flags=re.IGNORECASE)[-1]
        p = re.sub(r'["()\[\]*]', " ", p)           
        p = " ".join(p.split())
        if not p:
            continue
        if p.lower().replace(".", "") in _DISCARD:
            continue
        people.append(p)
    return people


def first_person_name(name: str) -> str:
    people = split_people(name)
    return people[0] if people else ""


def wikidata_gender(name: str) -> tuple[str, str] | None:
    search = _wd_get({
        "action": "wbsearchentities", "search": name, "language": "en",
        "format": "json", "type": "item", "limit": 5,
    })
    if not search:
        return None
    candidates = [hit["id"] for hit in search.get("search", [])]
    if not candidates:
        return None

    ents = _wd_get({
        "action": "wbgetentities", "ids": "|".join(candidates),
        "props": "claims", "format": "json",
    })
    if not ents:
        return None
    entities = ents.get("entities", {})

    human_found = False
    saw_non_human = False
    for qid in candidates: 
        claims = entities.get(qid, {}).get("claims", {})
        instance_of = [
            c.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id")
            for c in claims.get("P31", [])
        ]
        if HUMAN_QID in instance_of:
            human_found = True
            for p21 in claims.get("P21", []):
                gqid = p21.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id")
                if gqid:
                    return (GENDER_QIDS.get(gqid, "other"), "wikidata")
        elif instance_of:
            saw_non_human = True

    if human_found:
        return None  
    return ("", "non-person") if saw_non_human else None


def guess_gender(name: str) -> str:
    first = name.split()[0] if name else ""
    if not first:
        return ""
    g = _detector.get_gender(first)
    return {"male": "male", "mostly_male": "male",
            "female": "female", "mostly_female": "female"}.get(g, "")


def gender_from_category(category: str) -> str | None:
    c = category.lower()
    if c.startswith("actor"):
        return "male"
    if c.startswith("actress"):
        return "female"
    return None


def is_country_slot(category: str) -> bool:
    c = category.lower()
    return "international feature" in c or "foreign language" in c


_ORG_HINT = re.compile(
    r"\b(productions?|company|companies|pictures?|studios?|incorporated|inc|"
    r"ltd|limited|corporation|corp|enterprises|associates|entertainment)\b",
    re.IGNORECASE,
)


def is_org_name(name: str) -> bool:
    """True if the name looks like a studio/company rather than a person."""
    return bool(_ORG_HINT.search(name))


def resolve_person(person: str, cache: dict) -> tuple[str, str]:
    """Return (gender, gender_source) for a single cleaned person name."""
    if person in cache:
        return tuple(cache[person])
    if is_org_name(person): 
        cache[person] = ["", "non-person"]
        return ("", "non-person")
    result = wikidata_gender(person)
    time.sleep(0.1)  
    if result is None:
        guess = guess_gender(person)
        result = (guess, "name-guess") if guess else ("", "")
    cache[person] = list(result)
    return result


def rows_for(category: str, name: str, cache: dict) -> list[tuple[str, str, str]]:
    cat_gender = gender_from_category(category)
    if cat_gender:
        return [(name, cat_gender, "category")]
    if is_country_slot(category):
        return [(name, "", "non-person")]

    people = split_people(name)
    if not people:
        return [(name, "", "")]
    out = []
    for person in people:
        gender, source = resolve_person(person, cache)
        out.append((person, gender, source))
    return out


def main(in_path: Path, out_path: Path) -> None:
    cache = {}
    if CACHE_PATH.exists():
        cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))

    with open(in_path, encoding="utf-8-sig") as fin:
        reader = csv.DictReader(fin)
        in_fields = reader.fieldnames or []
        out_fields = in_fields + ["gender", "gender_source"]

        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", newline="", encoding="utf-8-sig") as fout:
            writer = csv.DictWriter(fout, fieldnames=out_fields)
            writer.writeheader()

            for i, row in enumerate(reader, 1):
                for pname, gender, source in rows_for(
                        row.get("category", ""), row.get("name", ""), cache):
                    out_row = dict(row)
                    out_row["name"] = pname    
                    out_row["gender"] = gender
                    out_row["gender_source"] = source
                    writer.writerow(out_row)
                fout.flush()  

                if i % 50 == 0:
                    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2),
                                          encoding="utf-8")
                    print(f"  processed {i} input rows...")

    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2),
                          encoding="utf-8")
    print(f"\nDone -> {out_path}")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--test":
        raw = sys.argv[2]
        person = first_person_name(raw)
        print(f"raw name:    {raw!r}")
        print(f"cleaned:     {person!r}")
        print(f"wikidata:    {wikidata_gender(person)}")
        print(f"name-guess:  {guess_gender(person)!r}")
        sys.exit()

    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IN
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT
    main(in_path, out_path)