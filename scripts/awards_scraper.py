"""
One-shot scraper for the Academy Awards ceremonies on oscars.org.

Plain `requests` gets a 403 (bot blocking), so we drive a real browser
with Selenium. Each ceremony page has the year in its URL, so we just
loop over the years. The HTML is parsed in memory (never written to
disk) and only the final CSV is saved to data/oscars.csv.

CSV columns: year, category, name, film, winner

Note: "year" is the CEREMONY year (the year the show was held); e.g. the
1929 ceremony honored films from 1927-1928, and 2025 honored 2024 films.

Setup (inside your venv):
    .venv/bin/python -m pip install selenium beautifulsoup4
You also need Google Chrome installed. Selenium 4.6+ fetches the matching
driver automatically, so no manual chromedriver is needed.

Usage:
    .venv/bin/python feminism-cinema/scripts/scrapers/awards_db.py            # 1929..2026
    .venv/bin/python feminism-cinema/scripts/scrapers/awards_db.py 2010 2025  # a range
"""

import csv
import sys
import time
from pathlib import Path

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE_URL = "https://www.oscars.org/oscars/ceremonies/{year}"


# Find the project root (walk up to .git / README.md) so data/ lands there.
def find_project_root(start: Path) -> Path:
    for p in [start, *start.parents]:
        if (p / ".git").exists() or (p / "README.md").exists():
            return p
    return start.parent


PROJECT_ROOT = find_project_root(Path(__file__).resolve())
DATA_DIR = PROJECT_ROOT / "data" / "raw"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def make_driver(headless: bool = True) -> webdriver.Chrome:
    """Create a Chrome driver. Set headless=False to watch it work."""
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1280,1000")
    # Make automation a little less obvious to basic bot checks.
    opts.add_argument("--disable-blink-features=AutomationControlled")
    return webdriver.Chrome(options=opts)


def looks_blocked(html: str) -> bool:
    """Heuristic: detect an access-denied / empty page instead of real content."""
    low = html.lower()
    return len(html) < 2000 or "access denied" in low or "request unsuccessful" in low


def parse_ceremony(html: str, year: int) -> list[dict]:
    """Parse a ceremony page (View by Category section) into nomination rows."""
    soup = BeautifulSoup(html, "html.parser")
    rows: list[dict] = []

    # Each award category is one paragraph block. This selector only matches
    # the "View by Category" pane; the "View by Film" pane uses different
    # classes, so there is no double counting.
    for cat in soup.select("div.paragraph--type--award-category"):
        title_el = cat.select_one(".field--name-field-award-category-oscars")
        category = title_el.get_text(strip=True) if title_el else ""

        # Each honoree row is one winner or one nominee.
        for honoree in cat.select("div.paragraph--type--award-honoree"):
            # The honoree-type field carries the "winner" or "nominee" class.
            type_el = honoree.select_one(".field--name-field-honoree-type")
            won = bool(type_el and "winner" in type_el.get("class", []))

            # Film title (may be absent for some categories/nominees).
            film_el = honoree.select_one(".field--name-field-award-film")
            film = film_el.get_text(strip=True) if film_el else ""

            # Name(s): one or more entries inside the award-entities container.
            # The order of film vs. entities varies by category, so we target
            # the containers directly instead of relying on position.
            entities_el = honoree.select_one(".field--name-field-award-entities")
            if entities_el:
                names = [i.get_text(strip=True) for i in entities_el.select(".field__item")]
                name = ", ".join(n for n in names if n)
            else:
                name = ""

            rows.append({
                "year": year,
                "category": category,
                "name": name,
                "film": film,
                "winner": won,
            })
    return rows


FIELDNAMES = ["year", "category", "name", "film", "winner"]


def scrape_to_csv(start_year: int, end_year: int, out_path: Path,
                  headless: bool = True) -> int:
    """Fetch each ceremony, parse in memory, and append rows to the CSV
    after every year. The file is flushed each time so it can be opened
    and inspected while the scrape is still running. Returns total rows.
    """
    driver = make_driver(headless=headless)
    total = 0
    # utf-8-sig so Excel shows non-ASCII names correctly.
    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        f.flush()
        try:
            for year in range(start_year, end_year + 1):
                url = BASE_URL.format(year=year)
                print(f"[{year}] {url}")
                driver.get(url)
                time.sleep(3)  # let the page render

                html = driver.page_source
                if looks_blocked(html):
                    print(f"  [{year}] looks blocked/empty ({len(html)} chars) — skipped")
                    continue

                rows = parse_ceremony(html, year)
                writer.writerows(rows)
                f.flush()  # push to disk so you can check the file mid-run
                total += len(rows)
                print(f"  [{year}] +{len(rows)} rows (total {total}) -> {out_path}")
                time.sleep(2)  # be polite between pages
        finally:
            driver.quit()
    return total


if __name__ == "__main__":
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1929
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 2026
    out = DATA_DIR / "awards.csv"
    # Tip: pass headless=False the first time to watch the browser.
    total = scrape_to_csv(start, end, out, headless=True)
    print(f"\nDone. {total} rows -> {out}")