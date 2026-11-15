// Body maths. Doctor's answers: 7C (calories never below BMR) and 8B (show a pace of at most 1 kg a week).

import type { Metrics } from './types';

export type Activity = 'sedentary' | 'light' | 'moderate' | 'active';

const ACTIVITY_FACTOR: Record<Activity, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };

const KCAL_PER_KG = 7700;
const TARGET_DEFICIT = 500;
export const MAX_PACE_KG_PER_WEEK = 1;

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

export interface EnergyPlan {
  bmr: number;
  tdee: number;
  /** Daily calories for the plan. Never below BMR. */
  targetKcal: number;
  deficit: number;
  /** kg per week, 0 when she is not trying to lose. */
  paceKgPerWeek: number;
  toLoseKg: number;
  /** null when there is nothing to lose or the pace is too small to project. */
  weeksToGoal: number | null;
  goalDate: string | null;
}

export function energyPlan(m: Metrics, activity: Activity, now: Date = new Date()): EnergyPlan {
  const b = bmr(m);
  const t = tdee(m, activity);
  const toLose = Math.max(0, Math.round((m.weightKg - m.goalKg) * 10) / 10);
  const floor = Math.ceil(b / 10) * 10;

  if (toLose === 0) {
    const maintain = Math.max(floor, Math.round(t / 10) * 10);
    return { bmr: Math.round(b), tdee: Math.round(t), targetKcal: maintain, deficit: 0, paceKgPerWeek: 0, toLoseKg: 0, weeksToGoal: null, goalDate: null };
  }

  const targetKcal = Math.max(floor, Math.round((t - TARGET_DEFICIT) / 10) * 10);
  const deficit = Math.max(0, Math.round(t - targetKcal));
  const rawPace = (deficit * 7) / KCAL_PER_KG;
  const pace = Math.min(MAX_PACE_KG_PER_WEEK, Math.round(rawPace * 100) / 100);

  let weeks: number | null = null;
  let goalDate: string | null = null;
  if (pace >= 0.05) {
    weeks = Math.ceil(toLose / pace);
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + weeks * 7);
    goalDate = d.toISOString().slice(0, 10);
  }

  return { bmr: Math.round(b), tdee: Math.round(t), targetKcal, deficit, paceKgPerWeek: pace, toLoseKg: toLose, weeksToGoal: weeks, goalDate };
}
