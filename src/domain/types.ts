export type Area = 'pcos' | 'insulin' | 'inflammation' | 'thyroid';
export type Level = 'low' | 'moderate' | 'high';
export type AgeBand = '18-29' | '30-39' | '40-49' | '50+';
export type Hook = 'a' | 'b' | 'c';
export type Category = 'pcos' | 'thyroid' | 'menopause' | 'diabetes' | 'weightloss';

export interface Metrics {
  age: number;
  heightCm: number;
  weightKg: number;
  goalKg: number;
}

export type AnswerValue = string | string[] | Metrics;
export type Answers = Record<string, AnswerValue>;

export const AREAS: Area[] = ['pcos', 'insulin', 'inflammation', 'thyroid'];

export const AREA_LABEL: Record<Area, string> = {
  pcos: 'PCOS / PCOD signs',
  insulin: 'Insulin resistance',
  inflammation: 'Inflammation',
  thyroid: 'Thyroid',
};

export const LEVEL_LABEL: Record<Level, string> = { low: 'Low', moderate: 'Moderate', high: 'High' };

export function isMetrics(v: AnswerValue | undefined): v is Metrics {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && 'heightCm' in v;
}

export function asList(v: AnswerValue | undefined): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return [v];
  return [];
}
