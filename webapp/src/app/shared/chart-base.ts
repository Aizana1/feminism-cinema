import type { EChartsOption } from 'echarts';
import { PALETTE } from '../core/palette';

export const tooltip = (extra: Record<string, unknown> = {}) => ({
  backgroundColor: 'rgba(31, 23, 48, 0.96)',
  borderColor: PALETTE.grid,
  borderWidth: 1,
  textStyle: { color: PALETTE.text, fontFamily: 'Inter, sans-serif' },
  ...extra,
});

export const legend = (extra: Record<string, unknown> = {}) => ({
  textStyle: { color: PALETTE.textDim },
  icon: 'roundRect',
  itemWidth: 14,
  itemHeight: 10,
  ...extra,
});

export const catAxis = (data: (string | number)[], rotate = 0) => ({
  type: 'category' as const,
  data,
  axisLine: { lineStyle: { color: PALETTE.axisLine } },
  axisTick: { show: false },
  axisLabel: { color: PALETTE.textDim, rotate, fontSize: 11 },
});

export const valAxis = (name = '', extra: Record<string, unknown> = {}) => ({
  type: 'value' as const,
  name,
  nameTextStyle: { color: PALETTE.textDim },
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: { color: PALETTE.textDim, fontSize: 11 },
  splitLine: { lineStyle: { color: PALETTE.grid } },
  ...extra,
});

export const baseGrid = {
  left: 48,
  right: 24,
  top: 48,
  bottom: 40,
  containLabel: true,
};

export const chart = (opt: EChartsOption): EChartsOption => ({
  textStyle: { fontFamily: 'Inter, sans-serif' },
  ...opt,
});
