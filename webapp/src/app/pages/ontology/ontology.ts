import { Component, computed, inject } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { EchartComponent } from '../../shared/echart';
import { ChartCardComponent } from '../../shared/cards';
import { PALETTE, RAMP } from '../../core/palette';
import { chart, tooltip } from '../../shared/chart-base';
import { OntologyService } from '../../core/ontology.service';

// Colour grouping for the class nodes (purely visual).
const GROUP: Record<string, number> = {
  Nomination: 0,
  Person: 1,
  Gender: 1,
  Film: 2,
  AwardCategory: 2,
  ActingCategory: 2,
  CraftCategory: 2,
  Edition: 2,
  AcceptanceSpeech: 3,
  Term: 3,
};
const SIZE: Record<string, number> = { Nomination: 64 };

@Component({
  selector: 'app-ontology',
  standalone: true,
  imports: [EchartComponent, ChartCardComponent],
  templateUrl: './ontology.html',
  styleUrl: './ontology.scss',
})
export class OntologyPage {
  readonly onto = inject(OntologyService);
  readonly loaded = this.onto.loaded;
  readonly ontologyUrl = 'ontology/feminism-cinema.ttl';

  constructor() {
    this.onto.load();
  }

  readonly graphOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const categories = [
      { name: 'Core event' },
      { name: 'Agents' },
      { name: 'Context' },
      { name: 'Discourse' },
    ];

    const nodes = this.onto.classes.map((c) => ({
      name: c.label,
      category: GROUP[c.id.split(/[#/]/).pop() ?? ''] ?? 2,
      symbolSize: SIZE[c.id.split(/[#/]/).pop() ?? ''] ?? 44,
      value: c.comment,
    }));
    const present = new Set(nodes.map((n) => n.name));
    const labelOf = (localId: string) =>
      this.onto.classes.find((c) => c.id.endsWith('#' + localId) || c.id.endsWith('/' + localId))
        ?.label ?? localId;

    const edge = (s: string, t: string, label: string, dashed = false) => ({
      source: s,
      target: t,
      label: { show: true, formatter: label, fontSize: 10, color: PALETTE.textDim },
      lineStyle: {
        color: PALETTE.axisLine,
        curveness: 0.12,
        type: dashed ? 'dashed' : 'solid',
      },
    });

    const links: any[] = [];
    for (const p of this.onto.objectProperties) {
      const s = labelOf(p.domain);
      const t = labelOf(p.range);
      if (present.has(s) && present.has(t)) links.push(edge(s, t, p.label));
    }
    for (const sc of this.onto.subClassOf) {
      const s = labelOf(sc.sub);
      const t = labelOf(sc.sup);
      if (present.has(s) && present.has(t)) links.push(edge(s, t, 'is-a', true));
    }

    return chart({
      tooltip: tooltip({
        formatter: (p: any) =>
          p.dataType === 'node'
            ? `<b>${p.name}</b>${p.value ? '<br/>' + p.value : ''}`
            : p.data.label.formatter,
      }),
      legend: [
        {
          data: categories.map((c) => c.name),
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
          categories,
          color: RAMP,
          force: { repulsion: 540, edgeLength: 150, gravity: 0.1 },
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
  });
}
