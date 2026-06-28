import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EChartsOption } from 'echarts';
import { DataService } from '../../core/data.service';
import { EchartComponent } from '../../shared/echart';
import { StatCardComponent, ChartCardComponent } from '../../shared/cards';
import { PALETTE } from '../../core/palette';
import { baseGrid, catAxis, chart, legend, tooltip, valAxis } from '../../shared/chart-base';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, EchartComponent, StatCardComponent, ChartCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {
  private readonly data = inject(DataService);
  readonly loaded = this.data.loaded;

  constructor() {
    this.data.load();
  }

  readonly kpis = computed(() => {
    if (!this.loaded()) return [];
    const [lo, hi] = this.data.yearSpan();
    return [
      { value: `${lo}–${hi}`, label: 'Years of Academy Awards', hint: `${hi - lo} editions` },
      {
        value: this.data.awards.length.toLocaleString(),
        label: 'Nomination records',
        hint: 'people · films · categories',
      },
      {
        value: `${this.data.totalWomenShare().toFixed(1)}%`,
        label: 'Women among gendered nominees',
        hint: 'across all categories',
      },
      {
        value: `${this.data.distinctCategories()}`,
        label: 'Distinct award categories',
        hint: 'acting, craft & technical',
      },
    ];
  });

  readonly shareOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const d = this.data.womenShareByDecade();
    return chart({
      tooltip: tooltip({ trigger: 'axis', valueFormatter: (v: any) => `${v}%` }),
      legend: legend({ top: 0, data: ['All categories', 'Excluding acting'] }),
      grid: baseGrid,
      xAxis: catAxis(d.decades),
      yAxis: valAxis('% women', { max: 60 }),
      series: [
        {
          name: 'All categories',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: d.overall,
          lineStyle: { width: 3, color: PALETTE.women },
          itemStyle: { color: PALETTE.women },
          areaStyle: { color: PALETTE.womenSoft },
        },
        {
          name: 'Excluding acting',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: d.nonActing,
          lineStyle: { width: 3, color: PALETTE.gold },
          itemStyle: { color: PALETTE.gold },
        },
      ],
    });
  });

  readonly sections = [
    {
      path: '/awards',
      title: 'Awards over time',
      desc: 'How the gender balance of Oscar nominations shifted across nine decades.',
    },
    {
      path: '/categories',
      title: 'Category by category',
      desc: 'Where women break through — and the technical categories that stay closed.',
    },
    {
      path: '/speeches',
      title: 'Acceptance speeches',
      desc: 'A “fighting words” analysis of how women and men speak at the podium.',
    },
    {
      path: '/ontology',
      title: 'Knowledge graph',
      desc: 'The ontology behind the data: classes, relations and the Protégé model.',
    },
  ];
}
