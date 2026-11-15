// The intensive track: 800 to 1,000 kcal, offered only to women the rules allow,
// built from light plates, and gated by a clinician's review and weekly check-ins.

import { describe, expect, it } from 'vitest';
import { buildAssessment } from '@/domain/assessment';
import { INTENSIVE_CEILING_KCAL, INTENSIVE_FLOOR_KCAL, MAX_PACE_KG_PER_WEEK, energyPlan } from '@/domain/energy';
import { checkinFlag, cleanSigns, hasStopSign, intensiveBlocks, intensiveBreakDue, weeksOpen, type Checkin } from '@/domain/intensive';
import { generatePlan, type PlanInput } from '@/domain/plan/generator';
import { LIGHT_MEALS } from '@/domain/plan/lightMeals';
import { MEALS } from '@/domain/plan/meals';
import type { Answers, Metrics } from '@/domain/types';

const big: Metrics = { age: 35, heightCm: 160, weightKg: 95, goalKg: 70 };
const eligible = { eligible: true, reasons: [], medicationAdvisory: false };

const answers = (metrics: Metrics, extra: Partial<Answers> = {}): Answers => ({
  struggle: 'eat_little',
  cycle: 'late',
  hormone_signs: ['acne'],
  pill: 'no',
  insulin_signs: ['cravings', 'belly'],
  cravings_time: 'within_hour',
  family: 'yes',
  inflam_signs: ['none'],
  thyroid_signs: ['none'],
  thyroid_dx: 'not_tested',
  stress: ['none'],
  metrics,
  activity: 'sedentary',
  safety: ['none'],
  meds: ['none'],
  cuisine: ['north'],
  diet: 'veg',
  avoid: ['none'],
  ...extra,
});

describe('intensive calories', () => {
  it('stays between 800 and 1,000 kcal and below the standard plan', () => {
    for (const m of [big, { age: 29, heightCm: 162, weightKg: 82, goalKg: 64 }, { age: 50, heightCm: 150, weightKg: 70, goalKg: 55 }, { age: 30, heightCm: 172, weightKg: 130, goalKg: 80 }] as Metrics[]) {
      for (const activity of ['sedentary', 'light', 'moderate', 'active'] as const) {
        const standard = energyPlan(m, activity);
        const intensive = energyPlan(m, activity, 'intensive');
        expect(intensive.track).toBe('intensive');
        expect(intensive.targetKcal).toBeGreaterThanOrEqual(INTENSIVE_FLOOR_KCAL);
        expect(intensive.targetKcal).toBeLessThanOrEqual(INTENSIVE_CEILING_KCAL);
        expect(intensive.targetKcal).toBeLessThan(standard.targetKcal);
        expect(intensive.paceKgPerWeek).toBeGreaterThan(standard.paceKgPerWeek);
        expect(intensive.paceKgPerWeek).toBeLessThanOrEqual(MAX_PACE_KG_PER_WEEK);
      }
    }
  });

  it('leaves the standard plan exactly as it was when no track is given', () => {
    const plan = energyPlan({ age: 29, heightCm: 162, weightKg: 72, goalKg: 64 }, 'sedentary');
    expect(plan.track).toBe('standard');
    expect(plan.targetKcal).toBe(1200);
    expect(plan.paceKgPerWeek).toBe(0.7);
  });
});

describe('who can be offered the intensive plan', () => {
  it('only BMI 30 and above, ages 18 to 60, eligible, with weight to lose', () => {
    expect(intensiveBlocks({ metrics: big, bmi: 37.1, eligibility: eligible, toLoseKg: 25 })).toEqual([]);
    expect(intensiveBlocks({ metrics: big, bmi: 29.9, eligibility: eligible, toLoseKg: 10 })).toEqual(['bmi_below_30']);
    expect(intensiveBlocks({ metrics: { ...big, age: 61 }, bmi: 37.1, eligibility: eligible, toLoseKg: 25 })).toEqual(['age']);
    expect(intensiveBlocks({ metrics: big, bmi: 37.1, eligibility: { ...eligible, eligible: false, reasons: ['kidney'] }, toLoseKg: 25 })).toEqual(['not_eligible']);
    expect(intensiveBlocks({ metrics: big, bmi: 37.1, eligibility: eligible, toLoseKg: 0 })).toEqual(['nothing_to_lose']);
  });

  it('is wired into the assessment from her own answers', () => {
    expect(buildAssessment(answers(big))!.intensive.blocks).toEqual([]);
    expect(buildAssessment(answers({ age: 29, heightCm: 162, weightKg: 72, goalKg: 64 }))!.intensive.blocks).toEqual(['bmi_below_30']);
    expect(buildAssessment(answers(big, { safety: ['pregnant'] }))!.intensive.blocks).toContain('not_eligible');
    expect(buildAssessment(answers(big, { safety: ['eating_disorder'] }))!.intensive.blocks).toContain('not_eligible');
  });

  it('needs a break after 12 weeks of it', () => {
    const now = new Date('2027-03-01T00:00:00Z');
    const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
    expect(intensiveBreakDue([], now)).toBe(false);
    expect(intensiveBreakDue([{ days: 28, paidAt: daysAgo(30) }], now)).toBe(false);
    expect(intensiveBreakDue([{ days: 84, paidAt: daysAgo(90) }], now)).toBe(true);
    expect(intensiveBreakDue([{ days: 28, paidAt: daysAgo(80) }, { days: 28, paidAt: daysAgo(50) }, { days: 28, paidAt: daysAgo(20) }], now)).toBe(true);
    // 12 weeks of plan and 4 weeks of break have both passed.
    expect(intensiveBreakDue([{ days: 84, paidAt: daysAgo(113) }], now)).toBe(false);
  });
});

describe('weekly check-in', () => {
  const ok = (week: number): Checkin => ({ week, weightKg: 90, signs: ['none'], at: '2027-01-01T00:00:00Z', flagged: false });

  it('accepts only known signs, and "none" only alone', () => {
    expect(cleanSigns(['none'])).toEqual(['none']);
    expect(cleanSigns(['dizzy', 'hair_fall', 'dizzy'])).toEqual(['dizzy', 'hair_fall']);
    expect(cleanSigns(['none', 'dizzy'])).toBeNull();
    expect(cleanSigns([])).toBeNull();
    expect(cleanSigns(['hungry'])).toBeNull();
    expect(cleanSigns('dizzy')).toBeNull();
  });

  it('pauses on a stop sign or a very fast drop, and not otherwise', () => {
    for (const sign of ['dizzy', 'palpitations', 'abdominal_pain', 'vomiting', 'low_mood'] as const) expect(hasStopSign([sign])).toBe(true);
    expect(hasStopSign(['hair_fall', 'constipation', 'cold', 'missed_period'])).toBe(false);
    expect(checkinFlag(95, 93.5, ['none'])).toBe(false);
    expect(checkinFlag(95, 92, ['none'])).toBe(true);
    expect(checkinFlag(95, 94, ['dizzy'])).toBe(true);
  });

  it('opens one more week per clean check-in, and none for a stop sign until it is cleared', () => {
    expect(weeksOpen([], 12)).toBe(1);
    expect(weeksOpen([ok(1), ok(2)], 12)).toBe(3);
    expect(weeksOpen([ok(1), { ...ok(2), flagged: true }], 12)).toBe(2);
    expect(weeksOpen([ok(1), { ...ok(2), flagged: true, cleared: true }], 12)).toBe(3);
    expect(weeksOpen([ok(1), ok(2), ok(3), ok(4)], 4)).toBe(4);
  });
});

describe('intensive meal plan', () => {
  const base: PlanInput = { seed: 'intensive-test', days: 84, targetKcal: 800, typeId: 'pcos_insulin', cuisines: ['north'], diet: 'veg', avoid: [], weekOneLighterOn: null, medicationAdvisory: false, track: 'intensive' };
  const byId = new Map([...LIGHT_MEALS, ...MEALS].map((m) => [m.id, m]));

  it('every light plate is a main meal under 300 kcal with at least 10 g of protein', () => {
    expect(LIGHT_MEALS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(LIGHT_MEALS.map((m) => m.id)).size).toBe(LIGHT_MEALS.length);
    for (const m of LIGHT_MEALS) {
      expect(MEALS.some((x) => x.id === m.id)).toBe(false);
      expect(m.slots).not.toContain('snack');
      expect(m.kcal).toBeLessThan(300);
      expect(m.protein).toBeGreaterThanOrEqual(10);
    }
  });

  it('lands each day near the target with three light meals and a snack', () => {
    for (const diet of ['veg', 'egg', 'nonveg'] as const) {
      for (const targetKcal of [800, 900, 1000]) {
        const plan = generatePlan({ ...base, diet, targetKcal, seed: `t-${diet}-${targetKcal}` });
        expect(plan.track).toBe('intensive');
        expect(plan.notes[0]).toContain('intensive plan');
        for (const day of plan.days) {
          expect(day.meals.map((m) => m.slot)).toEqual(['breakfast', 'lunch', 'snack_pm', 'dinner']);
          expect(day.kcal).toBeGreaterThanOrEqual(targetKcal - 60);
          expect(day.kcal).toBeLessThanOrEqual(targetKcal + 70);
          // Vegetarian days at 800 kcal sit at about 45 g of protein. See MEDICAL_RULES.md.
          expect(day.protein).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  it('still respects her diet and what she avoids', () => {
    const plan = generatePlan({ ...base, cuisines: ['bengali'], avoid: ['dairy', 'onion_garlic'], seed: 'avoid' });
    for (const day of plan.days) {
      for (const meal of day.meals) {
        for (const dish of [meal.dish, ...meal.swaps]) {
          const m = byId.get(dish.id)!;
          expect(m.diet).toBe('veg');
          expect(m.contains).not.toContain('dairy');
          expect(m.contains).not.toContain('onion_garlic');
        }
      }
    }
  });

  it('does not change a standard plan', () => {
    const plan = generatePlan({ ...base, track: undefined, targetKcal: 1200 });
    expect(plan.track).toBe('standard');
    expect(plan.days[0].meals).toHaveLength(5);
    expect(plan.days.flatMap((d) => d.meals.map((m) => m.dish.id)).some((id) => id.startsWith('light-'))).toBe(false);
    expect(plan.notes.join(' ')).not.toContain('intensive');
  });
});
