// Body maths. Doctor's answers: 7C (calories never below BMR) and 8B (show a pace of at most 1 kg a week).
// Her later feedback (2026-11-15): add cardio and strength training and lead with a near-term target.
// The movement prescription below is a DRAFT by an AI agent and needs her approval.

import type { Metrics } from './types';

export type Activity = 'sedentary' | 'light' | 'moderate' | 'active';

const ACTIVITY_FACTOR: Record<Activity, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };

const KCAL_PER_KG = 7700;
const TARGET_DEFICIT = 500;
export const MAX_PACE_KG_PER_WEEK = 1;

// Movement plan. Calories are net of resting burn: (MET - 1) x kg x hours.
const WALK_MINUTES = 45;
const WALK_NET_MET = 3.3; // brisk walking, about 5.5 km/h
const STRENGTH_MINUTES = 20;
const STRENGTH_DAYS = 3;
const STRENGTH_NET_MET = 2.5; // body-weight strength work
/** Extra walking days on top of what she already does. */
const WALK_DAYS: Record<Activity, number> = { sedentary: 6, light: 6, moderate: 3, active: 0 };

export type BmiBand = 'under' | 'healthy' | 'over' | 'obese';

export function bmi(m: Pick<Metrics, 'heightCm' | 'weightKg'>): number {
  const h = m.heightCm / 100;
  return Math.round((m.weightKg / (h * h)) * 10) / 10;
}

/** Cut-offs for Indian adults: healthy 18.5 to 22.9, overweight 23 to 24.9, obese 25 and above. */
export function bmiBand(value: number): BmiBand {
  if (value < 18.5) return 'under';
  if (value < 23) return 'healthy';
  if (value < 25) return 'over';
  return 'obese';
}

export const BMI_BAND_LABEL: Record<BmiBand, string> = {
  under: 'Below healthy range',
  healthy: 'In the healthy range',
  over: 'Above healthy range',
  obese: 'Above healthy range',
};

/** Mifflin-St Jeor, women. */
export function bmr(m: Metrics): number {
  return 10 * m.weightKg + 6.25 * m.heightCm - 5 * m.age - 161;
}

export function tdee(m: Metrics, activity: Activity): number {
  return bmr(m) * ACTIVITY_FACTOR[activity];
}

export interface MovementPlan {
  walkMinutes: number;
  walkDays: number;
  strengthMinutes: number;
  strengthDays: number;
  /** Extra calories burned, averaged per day across the week. */
  kcalPerDay: number;
}

export function movementPlan(m: Metrics, activity: Activity): MovementPlan {
  const walkDays = WALK_DAYS[activity];
  const walkKcal = WALK_NET_MET * m.weightKg * (WALK_MINUTES / 60) * walkDays;
  const strengthKcal = STRENGTH_NET_MET * m.weightKg * (STRENGTH_MINUTES / 60) * STRENGTH_DAYS;
  return {
    walkMinutes: walkDays > 0 ? WALK_MINUTES : 0,
    walkDays,
    strengthMinutes: STRENGTH_MINUTES,
    strengthDays: STRENGTH_DAYS,
    kcalPerDay: Math.round((walkKcal + strengthKcal) / 7),
  };
}

export interface EnergyPlan {
  bmr: number;
  tdee: number;
  /** Daily calories for the plan. Never below BMR. */
  targetKcal: number;
  /** Shortfall from food alone. */
  deficit: number;
  movement: MovementPlan;
  /** kg per week from meals alone. */
  mealsOnlyPaceKgPerWeek: number;
  /** kg per week with meals and the movement plan: the target pace. Never above 1. 0 when she is not trying to lose. */
  paceKgPerWeek: number;
  toLoseKg: number;
  /** Target for the first four weeks, never past her goal. */
  fourWeekLossKg: number;
  fourWeekKg: number;
  fourWeekDate: string;
  /** null when there is nothing to lose or the pace is too small to project. */
  weeksToGoal: number | null;
  goalDate: string | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function addDays(now: Date, days: number): string {
  const d = new Date(now.getTime());
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Weight at the end of a given week at the target pace, never past her goal. */
export function weightAtWeek(m: Metrics, pace: number, week: number): number {
  return Math.max(m.goalKg, round1(m.weightKg - pace * week));
}

export function energyPlan(m: Metrics, activity: Activity, now: Date = new Date()): EnergyPlan {
  const b = bmr(m);
  const t = tdee(m, activity);
  const toLose = Math.max(0, round1(m.weightKg - m.goalKg));
  const floor = Math.ceil(b / 10) * 10;
  const movement = movementPlan(m, activity);
  const fourWeekDate = addDays(now, 28);

  if (toLose === 0) {
    const maintain = Math.max(floor, Math.round(t / 10) * 10);
    return {
      bmr: Math.round(b),
      tdee: Math.round(t),
      targetKcal: maintain,
      deficit: 0,
      movement,
      mealsOnlyPaceKgPerWeek: 0,
      paceKgPerWeek: 0,
      toLoseKg: 0,
      fourWeekLossKg: 0,
      fourWeekKg: m.weightKg,
      fourWeekDate,
      weeksToGoal: null,
      goalDate: null,
    };
  }

  const targetKcal = Math.max(floor, Math.round((t - TARGET_DEFICIT) / 10) * 10);
  const deficit = Math.max(0, Math.round(t - targetKcal));
  const mealsOnly = Math.min(MAX_PACE_KG_PER_WEEK, round2((deficit * 7) / KCAL_PER_KG));
  const pace = Math.min(MAX_PACE_KG_PER_WEEK, round2(((deficit + movement.kcalPerDay) * 7) / KCAL_PER_KG));

  const fourWeekKg = weightAtWeek(m, pace, 4);
  let weeks: number | null = null;
  let goalDate: string | null = null;
  if (pace >= 0.05) {
    weeks = Math.ceil(toLose / pace);
    goalDate = addDays(now, weeks * 7);
  }

  return {
    bmr: Math.round(b),
    tdee: Math.round(t),
    targetKcal,
    deficit,
    movement,
    mealsOnlyPaceKgPerWeek: mealsOnly,
    paceKgPerWeek: pace,
    toLoseKg: toLose,
    fourWeekLossKg: round1(m.weightKg - fourWeekKg),
    fourWeekKg,
    fourWeekDate,
    weeksToGoal: weeks,
    goalDate,
  };
}
