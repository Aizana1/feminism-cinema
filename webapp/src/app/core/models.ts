// Domain models for the Feminism & Cinema dataset.

export type Gender =
  | 'male'
  | 'female'
  | 'non-binary'
  | 'trans woman'
  | 'trans man'
  | '';

/** A single Oscar nomination row (awards_with_gender.csv). */
export interface AwardRow {
  year: number;
  category: string;
  name: string;
  film: string;
  winner: boolean;
  gender: Gender;
  genderSource: string;
}

/** A single acceptance speech row (speeches_with_gender.csv). */
export interface SpeechRow {
  yearLabel: string;
  year: number;
  category: string;
  film: string;
  winner: string;
  presenter: string;
  speech: string;
  gender: Gender;
  isWoman: boolean;
  words: number;
}

/** A distinctive term from the fighting-words analysis. */
export interface FightingWord {
  term: string;
  z: number;
  nWomen: number;
  pctWomen: number;
  nMen: number;
  pctMen: number;
  /** 'women' if women lean towards this term, otherwise 'men'. */
  side: 'women' | 'men';
}

export interface Kpi {
  label: string;
  value: string;
  hint?: string;
}

export interface DecadeGender {
  decade: string;
  male: number;
  female: number;
  other: number;
  total: number;
  pctWomen: number;
}

export interface CategoryGender {
  category: string;
  male: number;
  female: number;
  other: number;
  total: number;
  pctWomen: number;
}
