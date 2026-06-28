import { Component, computed, inject } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { DataService } from '../../core/data.service';
import { EchartComponent } from '../../shared/echart';
import { ChartCardComponent } from '../../shared/cards';
import { PALETTE } from '../../core/palette';
import { baseGrid, catAxis, chart, legend, tooltip, valAxis } from '../../shared/chart-base';

@Component({
  selector: 'app-awards',
  standalone: true,
  imports: [EchartComponent, ChartCardComponent],
  templateUrl: './awards.html',
})
export class AwardsPage {
  private readonly data = inject(DataService);
  readonly loaded = this.data.loaded;

  constructor() {
    this.data.load();
  }

  readonly volumeOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const d = this.data.nominationsByDecade();
    return chart({
      tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
      legend: legend({ top: 0, data: ['Women', 'Men', 'Other / non-person'] }),
      grid: baseGrid,
      xAxis: catAxis(d.map((r) => r.decade)),
      yAxis: valAxis('nominations'),
      series: [
        {
          name: 'Women',
          type: 'bar',
          stack: 'g',
          data: d.map((r) => r.female),
          itemStyle: { color: PALETTE.women },
        },
        {
          name: 'Men',
          type: 'bar',
          stack: 'g',
          data: d.map((r) => r.male),
          itemStyle: { color: PALETTE.men },
        },
        {
          name: 'Other / non-person',
          type: 'bar',
          stack: 'g',
          data: d.map((r) => r.other),
          itemStyle: { color: PALETTE.other },
        },
      ],
    });
  });

  readonly winnerSplitOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const d = this.data.winnerGenderSplit();
    return chart({
      tooltip: tooltip({ trigger: 'item', formatter: '{b}: {c} ({d}%)' }),
      legend: legend({ bottom: 0, left: 'center' }),
      series: [
        {
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['50%', '46%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: PALETTE.surface, borderWidth: 3 },
          label: { color: PALETTE.text, formatter: '{d}%' },
          data: [
            { name: 'Women', value: d[0].value, itemStyle: { color: PALETTE.women } },
            { name: 'Men', value: d[1].value, itemStyle: { color: PALETTE.men } },
            {
              name: 'Other / non-person',
              value: d[2].value,
              itemStyle: { color: PALETTE.other },
            },
          ],
        },
      ],
    });
  });

  readonly nomVsWinOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const d = this.data.womenShareNomineesVsWinners();
    return chart({
      tooltip: tooltip({ trigger: 'axis', valueFormatter: (v: any) => `${v}%` }),
      legend: legend({ top: 0, data: ['Among nominees', 'Among winners'] }),
      grid: baseGrid,
      xAxis: catAxis(d.decades),
      yAxis: valAxis('% women', { max: 60 }),
      series: [
        {
          name: 'Among nominees',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: d.nominees,
          lineStyle: { width: 3, color: PALETTE.gold },
          itemStyle: { color: PALETTE.gold },
        },
        {
          name: 'Among winners',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: d.winners,
          lineStyle: { width: 3, color: PALETTE.women },
          itemStyle: { color: PALETTE.women },
          areaStyle: { color: PALETTE.womenSoft },
        },
      ],
    });
  });

  readonly directingOptions = computed<EChartsOption | null>(() => {
    if (!this.loaded()) return null;
    const d = this.data.directingWomen();
    return chart({
      tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
      legend: legend({ top: 0, data: ['Nominated', 'Won'] }),
      grid: baseGrid,
      xAxis: catAxis(d.decades),
      yAxis: valAxis('women in Directing'),
      series: [
        {
          name: 'Nominated',
          type: 'bar',
          data: d.nominees,
          itemStyle: { color: PALETTE.menSoft, borderColor: PALETTE.women, borderWidth: 1 },
          barWidth: '55%',
        },
        {
          name: 'Won',
          type: 'bar',
          data: d.winners,
          itemStyle: { color: PALETTE.women },
          barWidth: '28%',
          barGap: '-100%',
        },
      ],
    });
  });
}
