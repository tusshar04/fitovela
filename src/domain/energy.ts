// Body maths. See docs/MEDICAL_RULES.md for where each rule comes from.
//
// Doctor's decisions (relayed 2026-11-15, after the first demo):
//   - calorie floor of 1,200 kcal a day (she offered to go as low as 800; that is not
//     built for a self-serve plan, see MEDICAL_RULES.md)
//   - 60 minutes of exercise a day
//   - frame the result as a 12-week target, without dates
// Guards added by an AI agent, pending her approval:
//   - the strict 1,200 kcal rule applies only above the healthy BMI range (23 and over)
//   - no target below the healthy minimum weight (BMI 18.5)
// The number shown is always what her calories and movement add up to.
//
// Intensive track (doctor's approval relayed 2026-11-15: calories may go as low as 800):
// 800 to 1,000 kcal a day. Only women that intensive.ts allows are offered it, and only
// if they choose it. No person reviews an order (founder's decision, 2026-11-15).

import type { Metrics } from './types';

export type Activity = 'sedentary' | 'light' | 'moderate' | 'active';

const ACTIVITY_FACTOR: Record<Activity, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };

const KCAL_PER_KG = 7700;

export const STRICT_FLOOR_KCAL = 1200;
/** Intensive track: the doctor's floor, and the most the track gives a larger woman. */
export const INTENSIVE_FLOOR_KCAL = 800;
export const INTENSIVE_CEILING_KCAL = 1000;

export type Track = 'standard' | 'intensive';
/** Largest shortfall from food alone on the strict rule, so bigger women are not cut further than needed. */
const STRICT_FOOD_DEFICIT = 1000;
/** Women already in the healthy BMI range get the gentler rule: 500 below maintenance, never below BMR. */
const GENTLE_FOOD_DEFICIT = 500;
const STRICT_FROM_BMI = 23;
const HEALTHY_MIN_BMI = 18.5;

/** Upper bound on the pace shown. The doctor asked for 2; in practice the calories set a lower figure. */
export const MAX_PACE_KG_PER_WEEK = 2;
export const TARGET_WEEKS = 12;

// Movement plan. Calories are net of resting burn: (MET - 1) x kg x hours.
const WALK_MINUTES = 60;
const WALK_NET_MET = 3.3; // brisk walking, about 5.5 km/h
const STRENGTH_MINUTES = 20;
const STRENGTH_DAYS = 3;
const STRENGTH_NET_MET = 2.5; // body-weight strength work
/** Extra walking days on top of what she already does. */
const WALK_DAYS: Record<Activity, number> = { sedentary: 7, light: 7, moderate: 4, active: 0 };

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

/** Lowest weight we will set as a target for her height (BMI 18.5), rounded up to 0.1 kg. */
export function healthyMinKg(heightCm: number): number {
  const h = heightCm / 100;
  return Math.ceil(HEALTHY_MIN_BMI * h * h * 10) / 10;
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
  /** True when the 1,200 kcal rule applies (BMI 23 and over). */
  strict: boolean;
  track: Track;
  /** Daily calories for the plan. */
  targetKcal: number;
  /** Shortfall from food alone. */
  deficit: number;
  movement: MovementPlan;
  /** kg per week from meals alone. */
  mealsOnlyPaceKgPerWeek: number;
  /** kg per week with meals and the movement plan. 0 when she is not trying to lose. */
  paceKgPerWeek: number;
  /** The goal the plan works towards: her goal, or the healthy minimum if hers is below it. */
  goalKg: number;
  /** True when her stated goal was below the healthy minimum and was raised. */
  goalAdjusted: boolean;
  toLoseKg: number;
  /** Target at the end of 12 weeks, never past her goal. */
  week12Kg: number;
  week12LossKg: number;
  /** True when the 12-week target is her goal. Otherwise the 12 weeks are stage one. */
  reachesGoal: boolean;
  /** null when there is nothing to lose or the pace is too small to project. */
  weeksToGoal: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Weight at the end of a given week at a given pace, never past the goal. */
export function weightAtWeek(startKg: number, goalKg: number, pace: number, week: number): number {
  return Math.max(goalKg, round1(startKg - pace * week));
}

export function energyPlan(m: Metrics, activity: Activity, track: Track = 'standard'): EnergyPlan {
  const b = bmr(m);
  const t = tdee(m, activity);
  const movement = movementPlan(m, activity);
  const strict = bmi(m) >= STRICT_FROM_BMI;

  const minKg = healthyMinKg(m.heightCm);
  const goalKg = Math.max(m.goalKg, Math.min(minKg, m.weightKg));
  const goalAdjusted = goalKg > m.goalKg;
  const toLose = Math.max(0, round1(m.weightKg - goalKg));

  const bmrFloor = Math.ceil(b / 10) * 10;

  if (toLose === 0) {
    return {
      bmr: Math.round(b),
      tdee: Math.round(t),
      strict: false,
      track: 'standard',
      targetKcal: Math.max(bmrFloor, Math.round(t / 10) * 10),
      deficit: 0,
      movement,
      mealsOnlyPaceKgPerWeek: 0,
      paceKgPerWeek: 0,
      goalKg,
      goalAdjusted,
      toLoseKg: 0,
      week12Kg: m.weightKg,
      week12LossKg: 0,
      reachesGoal: true,
      weeksToGoal: null,
    };
  }

  const targetKcal =
    track === 'intensive'
      ? Math.min(INTENSIVE_CEILING_KCAL, Math.max(INTENSIVE_FLOOR_KCAL, Math.round((t - STRICT_FOOD_DEFICIT) / 10) * 10))
      : strict
        ? Math.max(STRICT_FLOOR_KCAL, Math.round((t - STRICT_FOOD_DEFICIT) / 10) * 10)
        : Math.max(bmrFloor, Math.round((t - GENTLE_FOOD_DEFICIT) / 10) * 10);
  const deficit = Math.max(0, Math.round(t - targetKcal));
  const mealsOnly = Math.min(MAX_PACE_KG_PER_WEEK, round2((deficit * 7) / KCAL_PER_KG));
  const pace = Math.min(MAX_PACE_KG_PER_WEEK, round2(((deficit + movement.kcalPerDay) * 7) / KCAL_PER_KG));

  const week12Kg = weightAtWeek(m.weightKg, goalKg, pace, TARGET_WEEKS);
  const weeksToGoal = pace >= 0.05 ? Math.ceil(toLose / pace) : null;

  return {
    bmr: Math.round(b),
    tdee: Math.round(t),
    strict,
    track,
    targetKcal,
    deficit,
    movement,
    mealsOnlyPaceKgPerWeek: mealsOnly,
    paceKgPerWeek: pace,
    goalKg,
    goalAdjusted,
    toLoseKg: toLose,
    week12Kg,
    week12LossKg: round1(m.weightKg - week12Kg),
    reachesGoal: week12Kg <= goalKg,
    weeksToGoal,
  };
}
