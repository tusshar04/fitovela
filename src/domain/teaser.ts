// What the paywall may say about her report before she pays (founder, 2026-11-18, D-030):
// how many signs she ticked, how many systems stand out, and how strong the match is.
// Never the type, its description, or which system scored what. The "x of y markers" figure
// stays out too: y is different for every type, so it would name the type by itself.

import type { Assessment } from './assessment';
import { AREAS } from './types';
import type { Strength } from './typing';

export interface ReportTeaser {
  age: number;
  /** Every sign she ticked, stress and sleep signs included. */
  signs: number;
  /** How many of the four systems scored Moderate or High. */
  flagged: number;
  /** Absent when no pattern matched (the routine-led type), where there is no match to rate. */
  strength: Strength | null;
}

export function reportTeaser(a: Assessment): ReportTeaser {
  return {
    age: a.metrics.age,
    signs: a.markers.length,
    flagged: AREAS.filter((area) => a.levels[area] !== 'low').length,
    strength: a.result.type === 'routine' ? null : a.result.strength,
  };
}
