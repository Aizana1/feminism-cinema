import { Injectable, signal } from '@angular/core';
import Papa from 'papaparse';
import {
  AwardRow,
  CategoryGender,
  DecadeGender,
  FightingWord,
  Gender,
  SpeechRow,
} from './models';

const VALID_GENDERS = new Set<Gender>([
  'male',
  'female',
  'non-binary',
  'trans woman',
  'trans man',
  '',
]);

const ACTING_PREFIXES = ['actor', 'actress'];

function isWoman(g: Gender): boolean {
  return g === 'female' || g === 'trans woman';
}
function isMan(g: Gender): boolean {
  return g === 'male' || g === 'trans man';
}

function loadCsv<T>(url: string, map: (row: any) => T | null): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const out: T[] = [];
        for (const r of res.data as any[]) {
          const m = map(r);
          if (m) out.push(m);
        }
        resolve(out);
      },
      error: (err) => reject(err),
    });
  });
}

@Injectable({ providedIn: 'root' })
export class DataService {
  awards: AwardRow[] = [];
  speeches: SpeechRow[] = [];
  fightingWords: FightingWord[] = [];

  readonly loaded = signal(false);
  private loadingPromise?: Promise<void>;

  load(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this.doLoad();
    return this.loadingPromise;
  }

  private async doLoad(): Promise<void> {
    const [awards, speeches, fighting] = await Promise.all([
      loadCsv<AwardRow>('data/awards_with_gender.csv', (r) => {
        const year = parseInt(String(r.year).trim(), 10);
        const gender = String(r.gender ?? '').trim() as Gender;
        if (!Number.isFinite(year) || year < 1900 || year > 2100) return null;
        if (!VALID_GENDERS.has(gender)) return null;
        return {
          year,
          category: String(r.category ?? '').trim(),
          name: String(r.name ?? '').trim(),
          film: String(r.film ?? '').trim(),
          winner: String(r.winner ?? '').trim().toLowerCase() === 'true',
          gender,
          genderSource: String(r.gender_source ?? '').trim(),
        };
      }),
      loadCsv<SpeechRow>('data/speeches_with_gender.csv', (r) => {
        const label = String(r.Year ?? '').trim();
        const m = label.match(/\d{4}/);
        const year = m ? parseInt(m[0], 10) : NaN;
        const gender = String(r.gender ?? '').trim() as Gender;
        const speech = String(r.Speech ?? '');
        if (!Number.isFinite(year)) return null;
        return {
          yearLabel: label,
          year,
          category: String(r.Category ?? '').trim(),
          film: String(r['Film Title'] ?? '').trim(),
          winner: String(r.Winner ?? '').trim(),
          presenter: String(r.Presenter ?? '').trim(),
          speech,
          gender,
          isWoman: String(r.is_woman ?? '').trim().toLowerCase() === 'true',
          words: (speech.match(/[A-Za-z][A-Za-z'\-]+/g) || []).length,
        };
      }),
      loadCsv<FightingWord>('data/fighting_words_women_vs_men.csv', (r) => {
        const term = String(r.term ?? '').trim();
        const z = parseFloat(r.z);
        if (!term || !Number.isFinite(z)) return null;
        return {
          term,
          z,
          nWomen: parseInt(r.n_women, 10) || 0,
          pctWomen: parseFloat(r.pct_women) || 0,
          nMen: parseInt(r.n_men, 10) || 0,
          pctMen: parseFloat(r.pct_men) || 0,
          side: z >= 0 ? 'women' : 'men',
        };
      }),
    ]);

    this.awards = awards;
    this.speeches = speeches;
    this.fightingWords = fighting.sort((a, b) => b.z - a.z);
    this.loaded.set(true);
  }

  isActing(category: string): boolean {
    const c = category.toLowerCase();
    return ACTING_PREFIXES.some((p) => c.startsWith(p));
  }

  decade(year: number): string {
    return `${Math.floor(year / 10) * 10}s`;
  }

  nominationsByDecade(
    opts: { excludeActing?: boolean; winnersOnly?: boolean } = {},
  ): DecadeGender[] {
    const map = new Map<string, DecadeGender>();
    for (const a of this.awards) {
      if (opts.excludeActing && this.isActing(a.category)) continue;
      if (opts.winnersOnly && !a.winner) continue;
      const d = this.decade(a.year);
      let row = map.get(d);
      if (!row) {
        row = { decade: d, male: 0, female: 0, other: 0, total: 0, pctWomen: 0 };
        map.set(d, row);
      }
      if (isWoman(a.gender)) row.female++;
      else if (isMan(a.gender)) row.male++;
      else row.other++;
    }
    const rows = [...map.values()].sort((a, b) => a.decade.localeCompare(b.decade));
    for (const r of rows) {
      const gendered = r.male + r.female;
      r.total = r.male + r.female + r.other;
      r.pctWomen = gendered ? (100 * r.female) / gendered : 0;
    }
    return rows;
  }

  womenShareByDecade(): {
    decades: string[];
    overall: number[];
    nonActing: number[];
  } {
    const all = this.nominationsByDecade();
    const non = this.nominationsByDecade({ excludeActing: true });
    const nonMap = new Map(non.map((r) => [r.decade, r]));
    return {
      decades: all.map((r) => r.decade),
      overall: all.map((r) => +r.pctWomen.toFixed(1)),
      nonActing: all.map((r) => {
        const n = nonMap.get(r.decade);
        return n ? +n.pctWomen.toFixed(1) : 0;
      }),
    };
  }

  womenShareNomineesVsWinners(): {
    decades: string[];
    nominees: number[];
    winners: number[];
  } {
    const nom = this.nominationsByDecade();
    const win = this.nominationsByDecade({ winnersOnly: true });
    const winMap = new Map(win.map((r) => [r.decade, r]));
    return {
      decades: nom.map((r) => r.decade),
      nominees: nom.map((r) => +r.pctWomen.toFixed(1)),
      winners: nom.map((r) => {
        const w = winMap.get(r.decade);
        return w ? +w.pctWomen.toFixed(1) : 0;
      }),
    };
  }

  winnerGenderSplit(): { name: string; value: number }[] {
    let f = 0,
      m = 0,
      o = 0;
    for (const a of this.awards) {
      if (!a.winner) continue;
      if (isWoman(a.gender)) f++;
      else if (isMan(a.gender)) m++;
      else o++;
    }
    return [
      { name: 'Women', value: f },
      { name: 'Men', value: m },
      { name: 'Other / non-person', value: o },
    ];
  }

  categoryGender(opts: { top?: number; excludeActing?: boolean } = {}): CategoryGender[] {
    const map = new Map<string, CategoryGender>();
    for (const a of this.awards) {
      if (opts.excludeActing && this.isActing(a.category)) continue;
      let row = map.get(a.category);
      if (!row) {
        row = {
          category: a.category,
          male: 0,
          female: 0,
          other: 0,
          total: 0,
          pctWomen: 0,
        };
        map.set(a.category, row);
      }
      if (isWoman(a.gender)) row.female++;
      else if (isMan(a.gender)) row.male++;
      else row.other++;
    }
    let rows = [...map.values()];
    for (const r of rows) {
      r.total = r.male + r.female + r.other;
      const gendered = r.male + r.female;
      r.pctWomen = gendered ? (100 * r.female) / gendered : 0;
    }
    rows = rows.filter((r) => r.male + r.female >= 20);
    rows.sort((a, b) => b.male + b.female - (a.male + a.female));
    if (opts.top) rows = rows.slice(0, opts.top);
    return rows;
  }

  directingWomen(): {
    decades: string[];
    nominees: number[];
    winners: number[];
  } {
    const map = new Map<string, { nom: number; win: number }>();
    for (const a of this.awards) {
      if (a.category.toLowerCase() !== 'directing') continue;
      if (!isWoman(a.gender)) continue;
      const d = this.decade(a.year);
      let row = map.get(d);
      if (!row) {
        row = { nom: 0, win: 0 };
        map.set(d, row);
      }
      row.nom++;
      if (a.winner) row.win++;
    }
    const decades = this.nominationsByDecade().map((r) => r.decade);
    return {
      decades,
      nominees: decades.map((d) => map.get(d)?.nom ?? 0),
      winners: decades.map((d) => map.get(d)?.win ?? 0),
    };
  }

  speechCountByGender(): { women: number; men: number; unknown: number } {
    let women = 0,
      men = 0,
      unknown = 0;
    for (const s of this.speeches) {
      if (isWoman(s.gender)) women++;
      else if (isMan(s.gender)) men++;
      else unknown++;
    }
    return { women, men, unknown };
  }

  avgSpeechLength(): { women: number; men: number } {
    let wW = 0,
      wN = 0,
      mW = 0,
      mN = 0;
    for (const s of this.speeches) {
      if (s.words === 0) continue;
      if (isWoman(s.gender)) {
        wW += s.words;
        wN++;
      } else if (isMan(s.gender)) {
        mW += s.words;
        mN++;
      }
    }
    return {
      women: wN ? Math.round(wW / wN) : 0,
      men: mN ? Math.round(mW / mN) : 0,
    };
  }

  speechesByDecade(): {
    decades: string[];
    women: number[];
    men: number[];
  } {
    const map = new Map<string, { w: number; m: number }>();
    for (const s of this.speeches) {
      const d = this.decade(s.year);
      let row = map.get(d);
      if (!row) {
        row = { w: 0, m: 0 };
        map.set(d, row);
      }
      if (isWoman(s.gender)) row.w++;
      else if (isMan(s.gender)) row.m++;
    }
    const decades = [...map.keys()].sort();
    return {
      decades,
      women: decades.map((d) => map.get(d)!.w),
      men: decades.map((d) => map.get(d)!.m),
    };
  }

  yearSpan(): [number, number] {
    let lo = Infinity,
      hi = -Infinity;
    for (const a of this.awards) {
      if (a.year < lo) lo = a.year;
      if (a.year > hi) hi = a.year;
    }
    return [lo, hi];
  }

  totalWomenShare(): number {
    let f = 0,
      gendered = 0;
    for (const a of this.awards) {
      if (isWoman(a.gender)) {
        f++;
        gendered++;
      } else if (isMan(a.gender)) gendered++;
    }
    return gendered ? (100 * f) / gendered : 0;
  }

  distinctCategories(): number {
    return new Set(this.awards.map((a) => a.category)).size;
  }
}
