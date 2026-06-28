import { Component, input } from '@angular/core';

/** Big-number KPI tile. */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  template: `
    <div class="stat">
      <div class="value">{{ value() }}</div>
      <div class="label">{{ label() }}</div>
      @if (hint()) {
        <div class="hint">{{ hint() }}</div>
      }
    </div>
  `,
  styles: [
    `
      .stat {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 1.4rem 1.5rem;
        height: 100%;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }
      .stat:hover {
        transform: translateY(-3px);
        border-color: var(--rose);
      }
      .value {
        font-family: var(--font-display);
        font-size: 2.4rem;
        font-weight: 700;
        line-height: 1.1;
        background: linear-gradient(135deg, var(--rose), var(--gold));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .label {
        margin-top: 0.4rem;
        font-size: 0.95rem;
        color: var(--text);
      }
      .hint {
        margin-top: 0.35rem;
        font-size: 0.8rem;
        color: var(--text-dim);
      }
    `,
  ],
})
export class StatCardComponent {
  readonly value = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>('');
}

/** Titled container for a chart with an optional caption/insight line. */
@Component({
  selector: 'app-chart-card',
  standalone: true,
  template: `
    <section class="card">
      <header>
        <h3>{{ title() }}</h3>
        @if (subtitle()) {
          <p class="sub">{{ subtitle() }}</p>
        }
      </header>
      <div class="body">
        <ng-content />
      </div>
      @if (insight()) {
        <p class="insight">{{ insight() }}</p>
      }
    </section>
  `,
  styles: [
    `
      .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 1.5rem 1.6rem 1.3rem;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      header h3 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text);
      }
      .sub {
        margin: 0.3rem 0 0;
        font-size: 0.9rem;
        color: var(--text-dim);
      }
      .body {
        margin-top: 1rem;
        flex: 1;
      }
      .insight {
        margin: 1rem 0 0;
        padding-top: 0.9rem;
        border-top: 1px solid var(--border);
        font-size: 0.9rem;
        color: var(--text-dim);
        line-height: 1.5;
      }
      .insight::before {
        content: '✦ ';
        color: var(--gold);
      }
    `,
  ],
})
export class ChartCardComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly insight = input<string>('');
}
