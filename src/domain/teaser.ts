// What the paywall may say about her report before she pays: counts only.
// Never the type, its description, or which system scored what (founder, 2026-11-18, D-030).

import type { Assessment } from './assessment';
import { AREAS } from './types';
import type { Strength } from './typing';

export interface ReportTeaser {
  age: number;
  /** Signs she ticked across the four systems. Stress signs are not a system, so they are left out. */
  signs: number;
  /** How many of the four systems scored Moderate or High. */
  flagged: number;
  /** Absent when no pattern matched (the routine-led type), where there is no match to count. */
  match: { matched: number; total: number; strength: Strength } | null;
}

export function reportTeaser(a: Assessment): ReportTeaser {
  const { result } = a;
  return {
    age: a.metrics.age,
    signs: AREAS.reduce((n, area) => n + a.counts[area], 0),
    flagged: AREAS.filter((area) => a.levels[area] !== 'low').length,
    match: result.type === 'routine' ? null : { matched: result.matched, total: result.total, strength: result.strength },
  };
}
