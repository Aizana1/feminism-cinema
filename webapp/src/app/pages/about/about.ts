import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class AboutPage {
  readonly pipeline = [
    {
      step: '01',
      title: 'Scrape',
      body: 'Academy Award nominations and transcribed acceptance speeches are collected from the official Oscars database and speech archives with Selenium + BeautifulSoup.',
      files: ['scripts/awards_scraper.py', 'data/raw/awards.csv', 'data/raw/speech.csv'],
    },
    {
      step: '02',
      title: 'Enrich gender',
      body: 'Each nominee name is resolved against Wikidata: humans (Q5) get their sex-or-gender (P21). Acting categories are inferred structurally; companies and countries are flagged as non-persons; the few remaining names fall back to a name-based guesser.',
      files: ['scripts/add_gender.py', 'data/awards_with_gender.csv'],
    },
    {
      step: '03',
      title: 'Analyse speech',
      body: 'Speeches are lemmatised (simplemma) and compared with the Monroe et al. “fighting words” method — weighted log-odds with an informative Dirichlet prior — to surface gendered vocabulary.',
      files: ['scripts/analyze_speeches.py', 'data/fighting_words_women_vs_men.csv'],
    },
    {
      step: '04',
      title: 'Represent',
      body: 'The cleaned CSVs are modelled as a small ontology and visualised in this Angular application with interactive ECharts graphics.',
      files: ['data/speeches_with_gender.csv', 'webapp/'],
    },
  ];

  readonly datasets = [
    { file: 'awards_with_gender.csv', rows: '16,489', desc: 'One row per nominee, with gender + source.' },
    { file: 'speeches_with_gender.csv', rows: '1,649', desc: 'Acceptance speeches tagged by gender.' },
    {
      file: 'fighting_words_women_vs_men.csv',
      rows: '100',
      desc: 'Top distinctive terms by z-score.',
    },
  ];
}
