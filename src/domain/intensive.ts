// The intensive track: 800 to 1,000 kcal a day.
//
// The doctor approved going as low as 800 kcal (relayed by Tushar, 2026-11-15).
// A diet this low is a very-low-calorie diet. It is never handed out
// automatically: the rules here decide who may be OFFERED it, and the plan is
// released only after a clinician has looked at that woman's answers.
//
// Guards below were set by an AI agent from common practice for very-low-calorie
// diets and need the doctor's ruling: BMI 30 and above, age 18 to 60, at most
// 12 weeks, a break before repeating, and weekly check-ins with stop signs.

import type { Eligibility } from './eligibility';
import { TARGET_WEEKS } from './energy';
import type { Metrics } from './types';

export const INTENSIVE_MIN_BMI = 30;
export const INTENSIVE_MIN_AGE = 18;
export const INTENSIVE_MAX_AGE = 60;
export const INTENSIVE_MAX_DAYS = TARGET_WEEKS * 7;
/** Days of rest after 12 weeks of intensive before it can be bought again. */
export const INTENSIVE_BREAK_DAYS = 28;

export type IntensiveBlock = 'not_eligible' | 'bmi_below_30' | 'age' | 'nothing_to_lose';

export const INTENSIVE_BLOCK_LABEL: Record<IntensiveBlock, string> = {
  not_eligible: 'a self-serve plan is not right for you without speaking to us first',
  bmi_below_30: 'it is only for a BMI of 30 and above',
  age: 'it is only for ages 18 to 60',
  nothing_to_lose: 'you are already at your goal',
};

export function intensiveBlocks(input: { metrics: Metrics; bmi: number; eligibility: Eligibility; toLoseKg: number }): IntensiveBlock[] {
  const blocks: IntensiveBlock[] = [];
  if (!input.eligibility.eligible) blocks.push('not_eligible');
  if (input.bmi < INTENSIVE_MIN_BMI) blocks.push('bmi_below_30');
  if (input.metrics.age < INTENSIVE_MIN_AGE || input.metrics.age > INTENSIVE_MAX_AGE) blocks.push('age');
  if (input.toLoseKg <= 0) blocks.push('nothing_to_lose');
  return blocks;
}

/** True when she has used up 12 weeks of intensive without the break that must follow. */
export function intensiveBreakDue(previous: { days: number; paidAt: string }[], now: Date = new Date()): boolean {
  const windowStart = now.getTime() - (INTENSIVE_MAX_DAYS + INTENSIVE_BREAK_DAYS) * 86_400_000;
  const used = previous.filter((p) => new Date(p.paidAt).getTime() >= windowStart).reduce((n, p) => n + p.days, 0);
  return used >= INTENSIVE_MAX_DAYS;
}

// Weekly check-in. A stop sign pauses the plan until the clinician has looked.
export type CheckinSign = 'dizzy' | 'palpitations' | 'abdominal_pain' | 'vomiting' | 'low_mood' | 'missed_period' | 'hair_fall' | 'constipation' | 'cold' | 'none';

export const CHECKIN_SIGNS: { id: CheckinSign; label: string; stop: boolean }[] = [
  { id: 'dizzy', label: 'Dizziness, fainting or blackouts', stop: true },
  { id: 'palpitations', label: 'A racing or irregular heartbeat', stop: true },
  { id: 'abdominal_pain', label: 'Strong pain in the upper right of the belly', stop: true },
  { id: 'vomiting', label: 'Vomiting, or unable to keep food down', stop: true },
  { id: 'low_mood', label: 'Very low mood, or constant thoughts about food', stop: true },
  { id: 'missed_period', label: 'A missed period that is unusual for me', stop: false },
  { id: 'hair_fall', label: 'More hair fall than usual', stop: false },
  { id: 'constipation', label: 'Constipation', stop: false },
  { id: 'cold', label: 'Feeling cold all the time', stop: false },
  { id: 'none', label: 'None of these', stop: false },
];

const SIGN_IDS = new Set<string>(CHECKIN_SIGNS.map((s) => s.id));

export function cleanSigns(value: unknown): CheckinSign[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > CHECKIN_SIGNS.length) return null;
  if (!value.every((v) => typeof v === 'string' && SIGN_IDS.has(v))) return null;
  const signs = [...new Set(value as CheckinSign[])];
  if (signs.includes('none') && signs.length > 1) return null;
  return signs;
}

export function hasStopSign(signs: CheckinSign[]): boolean {
  return CHECKIN_SIGNS.some((s) => s.stop && signs.includes(s.id));
}

/** Losing faster than this in one week is also a reason for the clinician to look. */
export const CHECKIN_MAX_WEEKLY_LOSS_KG = 2.5;

export interface Checkin {
  /** The plan week she has just finished. */
  week: number;
  weightKg: number;
  signs: CheckinSign[];
  at: string;
  /** True when this check-in paused the plan. */
  flagged: boolean;
  /** Set when the clinician has looked at a flagged check-in and reopened the plan. */
  cleared?: boolean;
}

/** Weeks she may open: week 1, plus one for each check-in that did not pause the plan (or was cleared). */
export function weeksOpen(checkins: Checkin[], totalWeeks: number): number {
  return Math.min(totalWeeks, checkins.filter((c) => !c.flagged || c.cleared).length + 1);
}

export function checkinFlag(previousKg: number, weightKg: number, signs: CheckinSign[]): boolean {
  return hasStopSign(signs) || previousKg - weightKg > CHECKIN_MAX_WEEKLY_LOSS_KG;
}

export const INTENSIVE_NOTES = [
  'This is an intensive plan of 800 to 1,000 kcal a day, released after a clinician reviewed your answers. Follow it for 12 weeks at most.',
  'Drink 2.5 to 3 litres of water a day. Do not skip a meal or cut portions further.',
  'Stop the plan and contact us if you feel dizzy or faint, your heart races, you have strong belly pain, or you cannot keep food down.',
];
