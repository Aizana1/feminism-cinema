import json
import re
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
import simplemma
from sklearn.feature_extraction.text import CountVectorizer, ENGLISH_STOP_WORDS


sys.path.insert(0, str(Path(__file__).resolve().parent))
import add_gender as ag  

WOMEN = {"female", "trans woman"}
MEN = {"male", "trans man"}

NGRAM = (1, 1)

CONTRACTIONS = {"ve", "ll", "re", "don", "didn", "doesn", "isn", "wasn",
                "aren", "wouldn", "couldn", "shouldn", "won", "ain", "hasn",
                "haven", "gonna", "wanna", "gotta", "oh", "ok", "yeah"}

FILLERS = {"just", "like", "say", "lot",
           # "know", "well", "thing", "really", "actually", "going",
           }


def find_project_root(start: Path) -> Path:
    for p in [start, *start.parents]:
        if (p / ".git").exists() or (p / "README.md").exists():
            return p
    return start.parent


PROJECT_ROOT = find_project_root(Path(__file__).resolve())
DATA_DIR = PROJECT_ROOT / "data"
DEFAULT_IN = DATA_DIR / "raw" / "speech.csv"
OUT_PATH = DATA_DIR / "fighting_words_women_vs_men.csv"

_TOKEN = re.compile(r"[A-Za-z][A-Za-z'\-]+")

LEMMA_OVERRIDES = {"crew": "crew"}


def _lemma(tok: str) -> str:
    tok = tok.lower()
    return LEMMA_OVERRIDES.get(tok, simplemma.lemmatize(tok, lang="en"))


def lemmatize(texts) -> list:
    return [" ".join(_lemma(tok) for tok in _TOKEN.findall(t)) for t in texts]


def lemmatize_words(words) -> set:
    return {_lemma(w) for w in words}


def gender_of(category: str, winner: str, cache: dict) -> str:
    g = ag.gender_from_category(category)
    if g:
        return g
    if ag.is_country_slot(category):
        return ""
    people = ag.split_people(winner)
    if not people:
        return ""
    gender, _ = ag.resolve_person(people[0], cache)
    return gender


_SPEAKER_PREFIX = re.compile(r"^\s*[A-Z][A-Z .,'\-]+:\s*")


def clean_speech(text: str) -> str:
    if not isinstance(text, str):
        return ""
    t = _SPEAKER_PREFIX.sub("", text.strip())
    t = t.replace("--", " ")
    return re.sub(r"\s+", " ", t).strip()


_SENT_SPLIT = re.compile(r"[.!?]+")
_WORD = re.compile(r"[A-Za-z][A-Za-z'\-]+")


def name_tokens(series: pd.Series) -> set:
    toks = set()
    for val in series.dropna():
        for w in _WORD.findall(str(val)):
            toks.add(w.lower())
    return toks


def detect_proper_nouns(texts) -> set:
    cap_mid, lower = Counter(), Counter()
    for t in texts:
        for sent in _SENT_SPLIT.split(t):
            words = _WORD.findall(sent)
            for i, w in enumerate(words):
                lw = w.lower()
                if w[0].isupper():
                    if i > 0:
                        cap_mid[lw] += 1
                else:
                    lower[lw] += 1
    return {w for w, c in cap_mid.items() if c >= 2 and c > lower.get(w, 0)}


def fighting_words(women, men, stop, a0=100.0, ngram=NGRAM,
                   min_df=3, top=50) -> pd.DataFrame:
    vec = CountVectorizer(stop_words=list(stop), ngram_range=ngram, min_df=min_df)
    X = vec.fit_transform(list(women) + list(men))
    counts = np.asarray(X.sum(axis=0)).ravel()
    nw, nm = len(women), len(men)
    Xw, Xm = X[:nw], X[nw:]
    yw = np.asarray(Xw.sum(axis=0)).ravel().astype(float)
    ym = np.asarray(Xm.sum(axis=0)).ravel().astype(float)

    prior = a0 * counts / counts.sum()
    a0sum = prior.sum()
    lo_w = np.log((yw + prior) / (yw.sum() + a0sum - yw - prior))
    lo_m = np.log((ym + prior) / (ym.sum() + a0sum - ym - prior))
    z = (lo_w - lo_m) / np.sqrt(1.0 / (yw + prior) + 1.0 / (ym + prior))

    dfw = np.asarray((Xw > 0).sum(axis=0)).ravel()
    dfm = np.asarray((Xm > 0).sum(axis=0)).ravel()

    out = pd.DataFrame({
        "term": vec.get_feature_names_out(),
        "z": np.round(z, 3),
        "n_women": dfw, "pct_women": np.round(100 * dfw / nw, 1),
        "n_men": dfm, "pct_men": np.round(100 * dfm / nm, 1),
    }).sort_values("z", ascending=False)
    return (pd.concat([out.head(top), out.tail(top)])
            .drop_duplicates("term").reset_index(drop=True))


def main(in_path: Path) -> None:
    df = pd.read_csv(in_path)
    df.columns = [c.strip() for c in df.columns]
    print(f"Loaded {len(df)} speeches from {in_path}")

    cache = {}
    if ag.CACHE_PATH.exists():
        cache = json.loads(ag.CACHE_PATH.read_text(encoding="utf-8"))
    df["gender"] = [gender_of(c, w, cache)
                    for c, w in zip(df["Category"].fillna(""), df["Winner"].fillna(""))]
    ag.CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2),
                             encoding="utf-8")

    df["speech_clean"] = df["Speech"].apply(clean_speech)
    df = df[df["speech_clean"].str.len() > 0]

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df["is_woman"] = df["gender"].isin(WOMEN)
    df.drop(columns=["speech_clean"]).to_csv(
        DATA_DIR / "speeches_with_gender.csv", index=False, encoding="utf-8-sig")

    w_raw = df[df["gender"].isin(WOMEN)]["speech_clean"].tolist()
    m_raw = df[df["gender"].isin(MEN)]["speech_clean"].tolist()
    print(f"  women: {len(w_raw)} speeches | men: {len(m_raw)} speeches")
    if not w_raw or not m_raw:
        sys.exit("Not enough speeches in one of the groups.")

    presenter = df["Presenter"] if "Presenter" in df.columns else pd.Series(dtype=str)
    proper = name_tokens(df["Winner"]) | name_tokens(presenter) | detect_proper_nouns(w_raw + m_raw)

    print("Lemmatising speeches with simplemma...")
    women = lemmatize(w_raw)
    men = lemmatize(m_raw)
    stop = (set(ENGLISH_STOP_WORDS) | CONTRACTIONS | FILLERS | proper
            | lemmatize_words(proper | CONTRACTIONS))

    fw = fighting_words(women, men, stop)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    fw.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")

    print("\nMost distinctive of WOMEN (term, z, %women, %men):")
    print(fw.head(20)[["term", "z", "pct_women", "pct_men"]].to_string(index=False))
    print("\nMost distinctive of MEN:")
    print(fw.tail(20)[["term", "z", "pct_women", "pct_men"]].to_string(index=False))
    print(f"\nDone -> {OUT_PATH}")


if __name__ == "__main__":
    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IN
    main(in_path)