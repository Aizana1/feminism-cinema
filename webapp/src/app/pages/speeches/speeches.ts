import { Component, computed, inject } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { DataService } from '../../core/data.service';
import { EchartComponent } from '../../shared/echart';
import { ChartCardComponent, StatCardComponent } from '../../shared/cards';
import { PALETTE } from '../../core/palette';
import { baseGrid, catAxis, chart, legend, tooltip, valAxis } from '../../shared/chart-base';

@Component({
  selector: 'app-speeches',
  standalone: true,
  imports: [EchartComponent, ChartCardComponent, StatCardComponent],
  templateUrl: './speeches.html',
})
export class SpeechesPage {
  private readonly data = inject(DataService);
  readonly loaded = this.data.loaded;

  constructor() {
    this.data.load();
  }

  readonly kpis = computed(() => {
    if (!this.loaded()) return [];
    const c = this.data.speechCountByGender();
    const len = this.data.avgSpeechLength();
    return [
      { value: this.data.speeches.length.toLocaleString(), label: 'Speeches analysed' },
      { value: c.women.toLocaleString(), label: 'By women' },
      { value: c.men.toLocaleString(), label: 'By men' },
      {
        value: `${len.women} / ${len.men}`,
        label: 'Avg. words — women / men',
        hint: 'per speech',
      },
    ];
  });

  /** Diverging "fighting words" bar: women lean right, men lean left. */
  readonly fightingOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const fw = this.data.fightingWords;
    const women = fw.filter((w) => w.side === 'women').slice(0, 14);
    const men = fw
      .filter((w) => w.side === 'men')
      .slice(-14); // most male = most negative z (sorted desc)
    const picked = [...men, ...women].sort((a, b) => a.z - b.z);
    return chart({
      tooltip: tooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: any) => {
          const r = p[0];
          const w = picked[r.dataIndex];
          return `<b>${w.term}</b><br/>z = ${w.z}<br/>women ${w.pctWomen}% · men ${w.pctMen}%`;
        },
      }),
      grid: { ...baseGrid, left: 8 },
      xAxis: valAxis('← men   ·   z-score   ·   women →'),
      yAxis: catAxis(picked.map((w) => w.term)),
      series: [
        {
          type: 'bar',
          data: picked.map((w) => ({
            value: w.z,
            itemStyle: {
              color: w.side === 'women' ? PALETTE.women : PALETTE.men,
              borderRadius:
                w.z >= 0 ? [0, 6, 6, 0] : ([6, 0, 0, 6] as any),
            },
          })),
          label: {
            show: true,
            color: PALETTE.textDim,
            position: 'right',
            formatter: (p: any) => (picked[p.dataIndex].z >= 0 ? picked[p.dataIndex].term : ''),
          },
        },
      ],
    });
  });

  /** Scatter of every distinctive term: % of women vs % of men who used it. */
  readonly scatterOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const fw = this.data.fightingWords;
    const pts = (side: 'women' | 'men') =>
      fw
        .filter((w) => w.side === side)
        .map((w) => ({
          value: [w.pctMen, w.pctWomen, w.nWomen + w.nMen, w.term],
        }));
    const maxPct = Math.max(...fw.map((w) => Math.max(w.pctWomen, w.pctMen)));
    return chart({
      tooltip: tooltip({
        trigger: 'item',
        formatter: (p: any) =>
          `<b>${p.value[3]}</b><br/>women ${p.value[1]}% · men ${p.value[0]}%`,
      }),
      legend: legend({ top: 0, data: ['Women lean', 'Men lean'] }),
      grid: baseGrid,
      xAxis: valAxis('% of men who used it', { max: Math.ceil(maxPct) }),
      yAxis: valAxis('% of women who used it', { max: Math.ceil(maxPct) }),
      series: [
        {
          name: 'Women lean',
          type: 'scatter',
          data: pts('women'),
          symbolSize: (v: any) => 6 + Math.sqrt(v[2]) * 1.6,
          itemStyle: { color: PALETTE.women, opacity: 0.8 },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: PALETTE.textDim, type: 'dashed', width: 1 },
            data: [[{ coord: [0, 0] }, { coord: [maxPct, maxPct] }]] as any,
          },
        },
        {
          name: 'Men lean',
          type: 'scatter',
          data: pts('men'),
          symbolSize: (v: any) => 6 + Math.sqrt(v[2]) * 1.6,
          itemStyle: { color: PALETTE.men, opacity: 0.8 },
        },
      ],
    });
  });

  readonly speechTrendOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const d = this.data.speechesByDecade();
    return chart({
      tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
      legend: legend({ top: 0, data: ['Women', 'Men'] }),
      grid: baseGrid,
      xAxis: catAxis(d.decades),
      yAxis: valAxis('speeches'),
      series: [
        {
          name: 'Women',
          type: 'bar',
          stack: 's',
          data: d.women,
          itemStyle: { color: PALETTE.women },
        },
        {
          name: 'Men',
          type: 'bar',
          stack: 's',
          data: d.men,
          itemStyle: { color: PALETTE.men },
        },
      ],
    });
  });
}
