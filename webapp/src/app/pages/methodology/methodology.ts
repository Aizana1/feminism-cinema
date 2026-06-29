import { Component } from '@angular/core';

interface Section {
  id: string;
  num: string;
  title: string;
}

@Component({
  selector: 'app-methodology',
  standalone: true,
  templateUrl: './methodology.html',
  styleUrl: './methodology.scss',
})
export class MethodologyPage {
  /** Used to render the in-page table of contents. */
  readonly toc: Section[] = [
    { id: 'sources', num: '01', title: 'Data sources' },
    { id: 'scraping', num: '02', title: 'Scraping' },
    { id: 'gender', num: '03', title: 'Gender attribution' },
    { id: 'speech', num: '04', title: 'Speech analysis' },
  ];

  readonly genderSources = [
    {
      key: 'category',
      rule: 'Acting categories are gendered by definition (Actor → male, Actress → female).',
      reliability: 'Most reliable',
    },
    {
      key: 'wikidata',
      rule: 'The name is looked up on Wikidata and property P21 ("sex or gender") is read. Wikidata also flags whether the entity is a human (instance of Q5), so studios and organisations are recognised as non-persons.',
      reliability: 'Reliable',
    },
    {
      key: 'name-guess',
      rule: 'Fallback when Wikidata has no match: an offline first-name guesser (gender-guesser).',
      reliability: 'Least reliable',
    },
    {
      key: '(empty)',
      rule: 'Non-persons (studios, countries) or undetermined.',
      reliability: '—',
    },
  ];
}
