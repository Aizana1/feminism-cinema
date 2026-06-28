// Shared colour palette used across all charts so the look stays consistent.

export const PALETTE = {
  women: '#ff5a8c',
  womenSoft: 'rgba(255, 90, 140, 0.18)',
  men: '#5b8def',
  menSoft: 'rgba(91, 141, 239, 0.18)',
  other: '#e0b15e',
  gold: '#e0b15e',
  rose: '#ff5a8c',
  blue: '#5b8def',
  text: '#ece7f5',
  textDim: '#a89fc4',
  grid: 'rgba(236, 231, 245, 0.08)',
  axisLine: 'rgba(236, 231, 245, 0.25)',
  bg: '#16101f',
  surface: '#1f1730',
};

/** Categorical ramp for multi-series charts. */
export const RAMP = [
  '#ff5a8c',
  '#e0b15e',
  '#5b8def',
  '#9b6dff',
  '#48c9b0',
  '#ff8f5a',
  '#f25fa6',
];

export const genderColor = (g: string): string => {
  if (g === 'female' || g === 'trans woman') return PALETTE.women;
  if (g === 'male' || g === 'trans man') return PALETTE.men;
  return PALETTE.other;
};
