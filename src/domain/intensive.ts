// The intensive track: 800 to 1,000 kcal a day.
//
// The doctor approved going as low as 800 kcal, and the founder decided that no
// person reviews an order: every case is automatic (2026-11-15). So the rules in
// this file are the only gate. They decide who may be OFFERED the track, and the
// weekly check-in moves a woman to the standard plan by itself on a stop sign.
//
// All of these guards were set by an AI agent from common practice for
// very-low-calorie diets and need the doctor's ruling: BMI 30 and above, age 18
// to 60, no unnamed prescription medicine, no recent change of thyroid dose, none
// of heart disease, gallstones, gout or blood-pressure medicine, at most 12
// weeks, a break before repeating, and the stop signs.
//
// The doctor said on 2026-11-15 (relayed by Tushar) to go ahead with these
// recommendations for now; she may change them later.

import type { Eligibility } from './eligibility';
import { TARGET_WEEKS } from './energy';
import type { Metrics } from './types';

export const INTENSIVE_MIN_BMI = 30;
export const INTENSIVE_MIN_AGE = 18;
export const INTENSIVE_MAX_AGE = 60;
export const INTENSIVE_MAX_DAYS = TARGET_WEEKS * 7;
/** Days of rest after 12 weeks of intensive before it can be bought again. */
export const INTENSIVE_BREAK_DAYS = 28;

export type IntensiveBlock = 'not_eligible' | 'bmi_below_30' | 'age' | 'nothing_to_lose' | 'other_medicine' | 'thyroid_dose' | 'condition';

export const INTENSIVE_BLOCK_LABEL: Record<IntensiveBlock, string> = {
  not_eligible: 'a self-serve plan is not right for you without speaking to us first',
  bmi_below_30: 'it is only for a BMI of 30 and above',
  age: 'it is only for ages 18 to 60',
  nothing_to_lose: 'you are already at your goal',
  other_medicine: 'you take a prescription medicine we cannot check automatically',
  thyroid_dose: 'your thyroid dose changed recently',
  condition: 'you told us about a condition or medicine that needs a doctor to set a diet this strict',
};

export function intensiveBlocks(input: {
  metrics: Metrics;
  bmi: number;
  eligibility: Eligibility;
  toLoseKg: number;
  /** She ticked "another prescription medicine". With nobody reviewing, an unknown medicine rules the track out. */
  otherMedicine: boolean;
  /** She said her thyroid dose changed recently. */
  thyroidDoseChanged: boolean;
  /** She ticked heart disease, gallstones, gout or blood-pressure medicine on the extra safety check.
   * Type 1 diabetes or insulin, kidney disease, an eating disorder and a BMI under 18.5 count too; they arrive in `eligibility.cautions`. */
  condition: boolean;
}): IntensiveBlock[] {
  const blocks: IntensiveBlock[] = [];
  if (!input.eligibility.eligible) blocks.push('not_eligible');
  if (input.bmi < INTENSIVE_MIN_BMI) blocks.push('bmi_below_30');
  if (input.metrics.age < INTENSIVE_MIN_AGE || input.metrics.age > INTENSIVE_MAX_AGE) blocks.push('age');
  if (input.toLoseKg <= 0) blocks.push('nothing_to_lose');
  if (input.otherMedicine) blocks.push('other_medicine');
  if (input.thyroidDoseChanged) blocks.push('thyroid_dose');
  // Sold the standard plan since 2026-11-18 (D-029), but a diet this strict stays closed to them.
  if (input.condition || input.eligibility.cautions.length > 0) blocks.push('condition');
  return blocks;
}

/** True when she has used up 12 weeks of intensive without the break that must follow. */
export function intensiveBreakDue(previous: { days: number; paidAt: string }[], now: Date = new Date()): boolean {
  const windowStart = now.getTime() - (INTENSIVE_MAX_DAYS + INTENSIVE_BREAK_DAYS) * 86_400_000;
  const used = previous.filter((p) => new Date(p.paidAt).getTime() >= windowStart).reduce((n, p) => n + p.days, 0);
  return used >= INTENSIVE_MAX_DAYS;
}

// Weekly check-in. A stop sign moves her to the standard plan automatically.
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

/** Losing faster than this in a week also moves her to the standard plan. Week 1 allows more, because the first loss is mostly water. */
export const CHECKIN_MAX_WEEKLY_LOSS_KG = 2.5;
export const CHECKIN_MAX_FIRST_WEEK_LOSS_KG = 4;

export interface Checkin {
  /** The plan week she has just finished. */
  week: number;
  weightKg: number;
  signs: CheckinSign[];
  at: string;
  /** True when this check-in moved her to the standard plan. */
  flagged: boolean;
}

/** Weeks she may open on the intensive plan: week 1, plus one for each clean check-in. */
export function weeksOpen(checkins: Checkin[], totalWeeks: number): number {
  return Math.min(totalWeeks, checkins.filter((c) => !c.flagged).length + 1);
}

export function checkinFlag(previousKg: number, weightKg: number, signs: CheckinSign[], week: number): boolean {
  const limit = week <= 1 ? CHECKIN_MAX_FIRST_WEEK_LOSS_KG : CHECKIN_MAX_WEEKLY_LOSS_KG;
  return hasStopSign(signs) || previousKg - weightKg > limit;
}

export const INTENSIVE_NOTES = [
  'This is an intensive plan of 800 to 1,000 kcal a day. Follow it for 12 weeks at most, then move to the standard plan.',
  'Drink 2.5 to 3 litres of water a day. Do not skip a meal or cut portions further.',
  'Take one multivitamin and mineral tablet every day for as long as you are on this plan.',
  'On a day that shows under 50 g of protein, add one scoop of plain whey or plant protein in water or chaas.',
  'Stop the plan and see a doctor if you feel dizzy or faint, your heart races, you have strong belly pain, or you cannot keep food down.',
];
