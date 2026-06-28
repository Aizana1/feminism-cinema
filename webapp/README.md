# Feminism & Cinema — Representation layer

Angular single-page app that visualises the project's CSV datasets (the *Representation*
half of the Knowledge Representation & Extraction project). All charts are built with
[ECharts](https://echarts.apache.org/); the CSVs are loaded and aggregated in the browser
with [PapaParse](https://www.papaparse.com/).

## Pages

| Route         | What it shows |
|---------------|---------------|
| `/`           | Overview, key figures, headline trend |
| `/awards`     | Nomination volume, winners, women's share over nine decades |
| `/categories` | Per-category gender breakdown; most female- vs male-coded crafts |
| `/speeches`   | "Fighting words" analysis of acceptance speeches |
| `/ontology`   | Interactive ontology graph + class / property / triple reference |
| `/about`      | Data pipeline, datasets and caveats |

## Data

The three source CSVs live in [`public/data/`](public/data) and are copies of the files in
the repository's top-level `data/` folder:

- `awards_with_gender.csv` — every Oscar nominee, enriched with gender (Wikidata).
- `speeches_with_gender.csv` — acceptance speeches tagged by gender.
- `fighting_words_women_vs_men.csv` — distinctive terms by z-score.

If the upstream data changes, recopy them:

```bash
cp ../data/*.csv public/data/
```

## Develop

```bash
npm install
npm start        # dev server at http://localhost:4200
npm run build    # production build into dist/webapp
```

## Structure

```
src/app/
  core/        models, palette, DataService (CSV loading + aggregations)
  shared/      reusable ECharts wrapper, cards, chart-style helpers
  pages/       one folder per route
```
