import { Component, computed, inject } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { DataService } from '../../core/data.service';
import { EchartComponent } from '../../shared/echart';
import { ChartCardComponent } from '../../shared/cards';
import { PALETTE } from '../../core/palette';
import { baseGrid, catAxis, chart, legend, tooltip, valAxis } from '../../shared/chart-base';
import { CategoryGender } from '../../core/models';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [EchartComponent, ChartCardComponent],
  templateUrl: './categories.html',
})
export class CategoriesPage {
  private readonly data = inject(DataService);
  readonly loaded = this.data.loaded;

  constructor() {
    this.data.load();
  }

  private ranked(): CategoryGender[] {
    return this.data
      .categoryGender({ excludeActing: true })
      .slice()
      .sort((a, b) => b.pctWomen - a.pctWomen);
  }

  /** 100% stacked composition for the busiest craft/technical categories. */
  readonly compositionOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const rows = this.data
      .categoryGender({ top: 16, excludeActing: true })
      .slice()
      .sort((a, b) => a.pctWomen - b.pctWomen);
    const cats = rows.map((r) => r.category);
    const pct = (n: number, t: number) => (t ? +((100 * n) / t).toFixed(1) : 0);
    return chart({
      tooltip: tooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: any) => `${v}%`,
      }),
      legend: legend({ top: 0, data: ['Women', 'Men'] }),
      grid: { ...baseGrid, left: 8 },
      xAxis: valAxis('% of gendered nominees', { max: 100 }),
      yAxis: catAxis(cats),
      series: [
        {
          name: 'Women',
          type: 'bar',
          stack: 't',
          data: rows.map((r) => pct(r.female, r.female + r.male)),
          itemStyle: { color: PALETTE.women },
        },
        {
          name: 'Men',
          type: 'bar',
          stack: 't',
          data: rows.map((r) => pct(r.male, r.female + r.male)),
          itemStyle: { color: PALETTE.men },
        },
      ],
    });
  });

  private rankingChart(rows: CategoryGender[], color: string): EChartsOption {
    return chart({
      tooltip: tooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (p: any) => {
          const r = p[0];
          return `${r.name}<br/><b>${r.value}%</b> women`;
        },
      }),
      grid: { ...baseGrid, left: 8 },
      xAxis: valAxis('% women', { max: 100 }),
      yAxis: catAxis(rows.map((r) => r.category)),
      series: [
        {
          type: 'bar',
          data: rows.map((r) => +r.pctWomen.toFixed(1)),
          itemStyle: { color, borderRadius: [0, 6, 6, 0] },
          label: {
            show: true,
            position: 'right',
            color: PALETTE.textDim,
            formatter: '{c}%',
          },
        },
      ],
    });
  }

  readonly mostFemaleOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const rows = this.ranked().slice(0, 10).reverse();
    return this.rankingChart(rows, PALETTE.women);
  });

  readonly mostMaleOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const rows = this.ranked().slice(-10);
    return this.rankingChart(rows, PALETTE.men);
  });
}
