// Picks the result type from the area counts. DRAFT rules by an AI agent, built on
// the doctor's answers 2A (four areas), 3A (four PCOS types) and 4A (simple count).
// The exact rules below need her approval. See docs/MEDICAL_RULES.md.

import { MARKERS, type MarkerId } from './questions';
import { MARKER_TOTALS, stressCount } from './scoring';
import type { Answers, Area } from './types';

export type TypeId =
  | 'pcos_insulin'
  | 'pcos_inflammatory'
  | 'pcos_postpill'
  | 'pcos_adrenal'
  | 'insulin'
  | 'thyroid'
  | 'inflammation'
  | 'routine';

export type Strength = 'strong' | 'clear' | 'early';

export interface TypeResult {
  type: TypeId;
  /** Areas whose markers make up the "x of y markers matched" figure. */
  drivingAreas: Area[];
  matched: number;
  total: number;
  strength: Strength;
}

const STRESS_TOTAL = Object.values(MARKERS).filter((m) => m.area === 'stress').length;

/** An area needs at least this many signs (Moderate) before it can name a type. */
const MIN_SIGNS = 2;

export function determineType(answers: Answers, markers: MarkerId[], counts: Record<Area, number>): TypeResult {
  const stress = stressCount(markers);
  let type: TypeId;
  let driving: Area[];
  let includeStress = false;

  if (counts.pcos >= MIN_SIGNS) {
    if (answers.pill === 'yes_worse') {
      type = 'pcos_postpill';
      driving = ['pcos'];
    } else if (counts.insulin >= MIN_SIGNS && counts.insulin >= counts.inflammation) {
      type = 'pcos_insulin';
      driving = ['pcos', 'insulin'];
    } else if (counts.inflammation >= MIN_SIGNS) {
      type = 'pcos_inflammatory';
      driving = ['pcos', 'inflammation'];
    } else if (stress >= MIN_SIGNS) {
      type = 'pcos_adrenal';
      driving = ['pcos'];
      includeStress = true;
    } else {
      // PCOS signs without a clear second driver: default to the insulin-resistant type.
      type = 'pcos_insulin';
      driving = ['pcos', 'insulin'];
    }
  } else {
    const diagnosedThyroid = markers.includes('t_diagnosed');
    const order: Area[] = diagnosedThyroid ? ['thyroid', 'insulin', 'inflammation'] : ['insulin', 'thyroid', 'inflammation'];
    const best = order.reduce((top, a) => (counts[a] > counts[top] ? a : top), order[0]);
    if (counts[best] >= MIN_SIGNS) {
      type = best as TypeId;
      driving = [best];
    } else {
      type = 'routine';
      driving = ['pcos', 'insulin', 'inflammation', 'thyroid'];
    }
  }

  let matched = driving.reduce((n, a) => n + counts[a], 0);
  let total = driving.reduce((n, a) => n + MARKER_TOTALS[a], 0);
  if (includeStress) {
    matched += stress;
    total += STRESS_TOTAL;
  }

  const ratio = total === 0 ? 0 : matched / total;
  const strength: Strength = type === 'routine' ? 'early' : ratio >= 0.6 ? 'strong' : ratio >= 0.4 ? 'clear' : 'early';

  return { type, drivingAreas: driving, matched, total, strength };
}

export const STRENGTH_LABEL: Record<Strength, string> = {
  strong: 'Strong match',
  clear: 'Clear match',
  early: 'Early signs',
};
