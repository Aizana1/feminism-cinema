import {
  Component,
  ElementRef,
  effect,
  input,
  viewChild,
  afterNextRender,
  OnDestroy,
} from '@angular/core';
import * as echarts from 'echarts';

/**
 * Thin reusable wrapper around an ECharts instance.
 * Pass an ECharts `option` object via [options]; the chart re-renders on change
 * and auto-resizes with its container.
 */
@Component({
  selector: 'app-echart',
  standalone: true,
  template: `<div class="echart-host" #host [style.height]="height()"></div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .echart-host {
        width: 100%;
      }
    `,
  ],
})
export class EchartComponent implements OnDestroy {
  readonly options = input<echarts.EChartsOption | null>(null);
  readonly height = input<string>('360px');

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private chart?: echarts.ECharts;
  private ro?: ResizeObserver;

  constructor() {
    afterNextRender(() => {
      this.chart = echarts.init(this.host().nativeElement, undefined, {
        renderer: 'canvas',
      });
      this.ro = new ResizeObserver(() => this.chart?.resize());
      this.ro.observe(this.host().nativeElement);
      this.render();
    });

    effect(() => {
      this.options();
      this.render();
    });
  }

  private render(): void {
    const opt = this.options();
    if (this.chart && opt) {
      this.chart.setOption(opt, true);
    }
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
    this.chart?.dispose();
  }
}
