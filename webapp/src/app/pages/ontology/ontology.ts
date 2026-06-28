import { Component } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { EchartComponent } from '../../shared/echart';
import { ChartCardComponent } from '../../shared/cards';
import { PALETTE, RAMP } from '../../core/palette';
import { chart, tooltip } from '../../shared/chart-base';

interface ClassDef {
  name: string;
  desc: string;
  props: string[];
}
interface PropDef {
  name: string;
  domain: string;
  range: string;
}
interface Mapping {
  column: string;
  source: string;
  target: string;
}

@Component({
  selector: 'app-ontology',
  standalone: true,
  imports: [EchartComponent, ChartCardComponent],
  templateUrl: './ontology.html',
  styleUrl: './ontology.scss',
})
export class OntologyPage {
  readonly classes: ClassDef[] = [
    { name: 'Person', desc: 'A human nominee or presenter.', props: ['name', 'genderSource'] },
    { name: 'Gender', desc: 'Controlled value resolved from Wikidata (P21).', props: ['label'] },
    { name: 'Film', desc: 'A motion picture put forward for an award.', props: ['title'] },
    {
      name: 'Nomination',
      desc: 'The central event: a candidacy at one ceremony.',
      props: ['isWinner'],
    },
    { name: 'AwardCategory', desc: 'e.g. Directing, Costume Design, Best Picture.', props: ['name'] },
    { name: 'Edition', desc: 'A yearly Academy Awards ceremony.', props: ['year'] },
    {
      name: 'AcceptanceSpeech',
      desc: 'The transcribed speech a winner delivered.',
      props: ['text', 'wordCount'],
    },
    {
      name: 'Term',
      desc: 'A distinctive word from the fighting-words analysis.',
      props: ['z', 'pctWomen', 'pctMen'],
    },
  ];

  readonly properties: PropDef[] = [
    { name: 'hasNominee', domain: 'Nomination', range: 'Person' },
    { name: 'forFilm', domain: 'Nomination', range: 'Film' },
    { name: 'inCategory', domain: 'Nomination', range: 'AwardCategory' },
    { name: 'atEdition', domain: 'Nomination', range: 'Edition' },
    { name: 'hasGender', domain: 'Person', range: 'Gender' },
    { name: 'resultsInSpeech', domain: 'Nomination', range: 'AcceptanceSpeech' },
    { name: 'mentionsTerm', domain: 'AcceptanceSpeech', range: 'Term' },
  ];

  readonly mappings: Mapping[] = [
    { column: 'name', source: 'awards_with_gender.csv', target: 'Person' },
    { column: 'film', source: 'awards_with_gender.csv', target: 'Film' },
    { column: 'category', source: 'awards_with_gender.csv', target: 'AwardCategory' },
    { column: 'year', source: 'awards_with_gender.csv', target: 'Edition.year' },
    { column: 'winner', source: 'awards_with_gender.csv', target: 'Nomination.isWinner' },
    { column: 'gender', source: 'awards_with_gender.csv', target: 'Gender' },
    { column: 'Speech', source: 'speeches_with_gender.csv', target: 'AcceptanceSpeech.text' },
    { column: 'term / z', source: 'fighting_words_women_vs_men.csv', target: 'Term' },
  ];

  readonly triplesText = [
    [':nom_directing', 'rdf:type', ':Nomination'],
    [':nom_directing', ':hasNominee', ':Jane_Campion'],
    [':nom_directing', ':inCategory', ':Directing'],
    [':nom_directing', ':atEdition', ':Edition_2022'],
    [':nom_directing', ':isWinner', 'true'],
    [':Jane_Campion', ':hasGender', ':female'],
    [':nom_directing', ':resultsInSpeech', ':speech_1'],
    [':speech_1', ':mentionsTerm', ':term_woman'],
  ]
    .map((t) => `${t[0]}  ${t[1]}  ${t[2]} .`)
    .join('\n');

  readonly graphOptions: EChartsOption = (() => {
    const cat = [
      { name: 'Core event' },
      { name: 'Agents' },
      { name: 'Context' },
      { name: 'Discourse' },
    ];
    const nodes = [
      { name: 'Nomination', category: 0, symbolSize: 64, value: 'central event' },
      { name: 'Person', category: 1, symbolSize: 48 },
      { name: 'Gender', category: 1, symbolSize: 36 },
      { name: 'Film', category: 2, symbolSize: 40 },
      { name: 'AwardCategory', category: 2, symbolSize: 44 },
      { name: 'Edition', category: 2, symbolSize: 40 },
      { name: 'AcceptanceSpeech', category: 3, symbolSize: 46 },
      { name: 'Term', category: 3, symbolSize: 38 },
    ];
    const edge = (s: string, t: string, label: string) => ({
      source: s,
      target: t,
      label: { show: true, formatter: label, fontSize: 10, color: PALETTE.textDim },
      lineStyle: { color: PALETTE.axisLine, curveness: 0.12 },
    });
    const links = [
      edge('Nomination', 'Person', 'hasNominee'),
      edge('Nomination', 'Film', 'forFilm'),
      edge('Nomination', 'AwardCategory', 'inCategory'),
      edge('Nomination', 'Edition', 'atEdition'),
      edge('Person', 'Gender', 'hasGender'),
      edge('Nomination', 'AcceptanceSpeech', 'resultsInSpeech'),
      edge('AcceptanceSpeech', 'Term', 'mentionsTerm'),
    ];
    return chart({
      tooltip: tooltip({
        formatter: (p: any) => (p.dataType === 'node' ? `<b>${p.name}</b>` : p.data.label.formatter),
      }),
      legend: [
        {
          data: cat.map((c) => c.name),
          textStyle: { color: PALETTE.textDim },
          top: 0,
          icon: 'circle',
        },
      ],
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          categories: cat,
          color: RAMP,
          force: { repulsion: 520, edgeLength: 150, gravity: 0.12 },
          label: {
            show: true,
            position: 'right',
            color: PALETTE.text,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'bold',
          },
          emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
          lineStyle: { width: 1.4, opacity: 0.9 },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 8,
          data: nodes,
          links,
        },
      ],
    });
  })();
}
