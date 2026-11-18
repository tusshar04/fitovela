// One test group per rule in the doctor's answers.

import { describe, expect, it } from 'vitest';
import { buildAssessment } from '@/domain/assessment';
import { checkEligibility } from '@/domain/eligibility';
import { bmi, bmiBand, bmr, energyPlan } from '@/domain/energy';
import { adaptation, buildSteps, isComplete, questionSteps, stepBefore } from '@/domain/flow';
import { isLaunchPriceLive, priceFor, TIER_ORDER, TIERS } from '@/domain/offer';
import { QUESTIONS } from '@/domain/questions';
import { areaCounts, levelFor, markersFrom } from '@/domain/scoring';
import { determineType } from '@/domain/typing';
import type { Answers, Metrics } from '@/domain/types';
import { cleanEmail, cleanPhone, sanitizeAnswers } from '@/server/validate';

const metrics: Metrics = { age: 29, heightCm: 162, weightKg: 72, goalKg: 64 };

/** A woman with PCOS and insulin signs who completes every question. */
const pcosInsulin: Answers = {
  struggle: 'eat_little',
  cycle: 'skip',
  hormone_signs: ['acne', 'hair_thin'],
  insulin_signs: ['cravings', 'belly', 'crash'],
  cravings_time: 'within_hour',
  family: 'yes',
  inflam_signs: ['none'],
  thyroid_signs: ['none'],
  thyroid_dx: 'no',
  stress: ['none'],
  metrics,
  activity: 'sedentary',
  safety: ['none'],
  meds: ['none'],
  cuisine: ['south', 'north'],
  diet: 'veg',
  avoid: ['none'],
};

const typeOf = (a: Answers) => {
  const m = markersFrom(a);
  return determineType(a, m, areaCounts(m)).type;
};

describe('4A: simple count scoring', () => {
  it('maps counts to Low, Moderate, High', () => {
    expect([0, 1, 2, 3, 4, 6].map(levelFor)).toEqual(['low', 'low', 'moderate', 'moderate', 'high', 'high']);
  });

  it('counts each sign once, in the right area', () => {
    const counts = areaCounts(markersFrom(pcosInsulin));
    expect(counts).toEqual({ pcos: 3, insulin: 5, inflammation: 0, thyroid: 0 });
  });

  it('ignores answers to a follow-up that no longer applies', () => {
    const a: Answers = { ...pcosInsulin, insulin_signs: ['belly'], cravings_time: 'within_hour' };
    expect(markersFrom(a)).not.toContain('i_spike');
  });
});

describe('3A: the PCOS types (post-pill removed by the founder), and the non-PCOS types', () => {
  it('insulin-resistant PCOS', () => expect(typeOf(pcosInsulin)).toBe('pcos_insulin'));

  it('founder: no pill question and no post-pill type; an old stored pill answer is ignored', () => {
    expect(QUESTIONS.map((q) => q.id)).not.toContain('pill');
    expect(QUESTIONS.find((q) => q.id === 'meds')!.options!.map((o) => o.id)).toEqual(['metformin', 'thyroid_tablets', 'other', 'none']);
    expect(typeOf({ ...pcosInsulin, pill: 'yes_worse' })).toBe('pcos_insulin');
  });

  it('inflammatory PCOS when inflammation leads', () => {
    expect(typeOf({ ...pcosInsulin, insulin_signs: ['none'], cravings_time: 'night', family: 'no', inflam_signs: ['bloat', 'joint', 'skin'] })).toBe('pcos_inflammatory');
  });

  it('adrenal PCOS when stress leads and insulin and inflammation are low', () => {
    expect(typeOf({ ...pcosInsulin, insulin_signs: ['none'], family: 'no', stress: ['short_sleep', 'stress', 'wired'] })).toBe('pcos_adrenal');
  });

  it('slow-thyroid type without PCOS signs', () => {
    expect(typeOf({ ...pcosInsulin, cycle: 'regular', hormone_signs: ['none'], insulin_signs: ['none'], family: 'no', thyroid_signs: ['cold', 'constipation', 'hairfall'], thyroid_dx: 'yes_tablets' })).toBe('thyroid');
  });

  it('routine-led type when nothing reaches Moderate', () => {
    expect(typeOf({ ...pcosInsulin, cycle: 'regular', hormone_signs: ['none'], insulin_signs: ['belly'], family: 'no' })).toBe('routine');
  });

  it('reports markers matched out of the markers behind the type', () => {
    const a = buildAssessment(pcosInsulin)!;
    expect(a.result.matched).toBe(8);
    expect(a.result.total).toBe(12);
  });
});

describe('5A and 6A: who can buy', () => {
  it('lets an ordinary user buy', () => expect(checkEligibility(pcosInsulin)).toEqual({ eligible: true, reasons: [], medicationAdvisory: false }));

  it.each([
    ['pregnant', { safety: ['pregnant'] }],
    ['t1d_insulin', { safety: ['t1d_insulin'] }],
    ['kidney', { safety: ['kidney'] }],
    ['eating_disorder', { safety: ['eating_disorder'] }],
    ['under18', { metrics: { ...metrics, age: 17 } }],
    ['underweight', { metrics: { ...metrics, weightKg: 45, goalKg: 44 } }],
  ])('blocks %s', (reason, patch) => {
    const e = checkEligibility({ ...pcosInsulin, ...(patch as Answers) });
    expect(e.eligible).toBe(false);
    expect(e.reasons).toContain(reason);
  });

  it('lets women on metformin or thyroid tablets buy, with the advisory', () => {
    expect(checkEligibility({ ...pcosInsulin, meds: ['metformin'] })).toMatchObject({ eligible: true, medicationAdvisory: true });
    expect(checkEligibility({ ...pcosInsulin, thyroid_dx: 'yes_tablets', thyroid_stable: 'yes' })).toMatchObject({ eligible: true, medicationAdvisory: true });
  });
});

describe('calories, movement and the 12-week target', () => {
  it('uses Indian BMI cut-offs', () => {
    expect(bmi(metrics)).toBe(27.4);
    expect([18.4, 18.5, 22.9, 23, 24.9, 25].map(bmiBand)).toEqual(['under', 'healthy', 'healthy', 'over', 'over', 'obese']);
  });

  const women: Metrics[] = [metrics, { age: 52, heightCm: 150, weightKg: 58, goalKg: 50 }, { age: 22, heightCm: 175, weightKg: 110, goalKg: 70 }, { age: 30, heightCm: 160, weightKg: 56, goalKg: 52 }];
  const activities = ['sedentary', 'light', 'moderate', 'active'] as const;

  it('never sets calories below 1,200 for women above the healthy BMI range', () => {
    for (const activity of activities) {
      for (const m of women.filter((w) => bmi(w) >= 23)) {
        const e = energyPlan(m, activity);
        expect(e.strict).toBe(true);
        expect(e.targetKcal).toBeGreaterThanOrEqual(1200);
      }
    }
  });

  it('keeps the gentler rule for women already in the healthy range: never below BMR', () => {
    const m: Metrics = { age: 30, heightCm: 160, weightKg: 56, goalKg: 52 };
    for (const activity of activities) {
      const e = energyPlan(m, activity);
      expect(e.strict).toBe(false);
      expect(e.targetKcal).toBeGreaterThanOrEqual(bmr(m));
    }
  });

  it('builds the 12-week target from the real shortfall: meals plus the movement plan', () => {
    const e = energyPlan(metrics, 'sedentary');
    expect(e.targetKcal).toBe(1200);
    expect(e.deficit).toBe(512);
    // 60-minute brisk walk every day and 20 minutes of strength three days, for a 72 kg woman.
    expect(e.movement).toEqual({ walkMinutes: 60, walkDays: 7, strengthMinutes: 20, strengthDays: 3, kcalPerDay: 263 });
    expect(e.mealsOnlyPaceKgPerWeek).toBeCloseTo(0.47, 2);
    expect(e.paceKgPerWeek).toBeCloseTo(0.7, 2);
    expect(e.week12Kg).toBe(64);
    expect(e.week12LossKg).toBe(8);
    expect(e.reachesGoal).toBe(true);
    expect(e.weeksToGoal).toBe(12);
  });

  it('makes the 12 weeks stage one when her goal is further than the plan can reach', () => {
    const e = energyPlan({ age: 35, heightCm: 160, weightKg: 95, goalKg: 65 }, 'light');
    expect(e.targetKcal).toBe(1220);
    expect(e.paceKgPerWeek).toBeCloseTo(1.22, 2);
    expect(e.week12Kg).toBe(80.4);
    expect(e.reachesGoal).toBe(false);
  });

  it('never shows a pace faster than the calories and movement deliver, or a target past her goal', () => {
    for (const activity of activities) {
      for (const m of women) {
        const e = energyPlan(m, activity);
        const deliverable = ((e.deficit + e.movement.kcalPerDay) * 7) / 7700;
        expect(e.paceKgPerWeek).toBeLessThanOrEqual(Math.min(2, deliverable) + 0.005);
        expect(e.paceKgPerWeek).toBeGreaterThanOrEqual(e.mealsOnlyPaceKgPerWeek);
        expect(e.week12Kg).toBeGreaterThanOrEqual(e.goalKg);
      }
    }
  });

  it('will not work towards a weight below the healthy minimum for her height', () => {
    const e = energyPlan({ age: 28, heightCm: 160, weightKg: 62, goalKg: 42 }, 'light');
    expect(e.goalKg).toBe(47.4);
    expect(e.goalAdjusted).toBe(true);
    expect(e.week12Kg).toBeGreaterThanOrEqual(47.4);
  });

  it('asks already-active women for strength work only', () => {
    expect(energyPlan(metrics, 'active').movement.walkDays).toBe(0);
    expect(energyPlan(metrics, 'moderate').movement.walkDays).toBe(4);
  });

  it('holds weight steady when the goal is not lower', () => {
    const e = energyPlan({ ...metrics, goalKg: 72 }, 'light');
    expect(e.paceKgPerWeek).toBe(0);
    expect(e.week12LossKg).toBe(0);
  });
});

describe('adaptive questionnaire', () => {
  it('adds the cravings follow-up only when her answers call for it', () => {
    const ids = (a: Answers) => questionSteps(a).map((q) => q.id);
    expect(ids(pcosInsulin)).toContain('cravings_time');
    const none: Answers = { ...pcosInsulin, cycle: 'regular', hormone_signs: ['none'], insulin_signs: ['none'] };
    expect(ids(none)).not.toContain('cravings_time');
  });

  it('asks the menopause follow-up only when periods have stopped', () => {
    const ids = (a: Answers) => questionSteps(a).map((q) => q.id);
    expect(ids({ ...pcosInsulin, cycle: 'stopped' })).toContain('meno');
    expect(ids(pcosInsulin)).not.toContain('meno');
  });

  it('reports true skip and add counts once the answers are in', () => {
    expect(adaptation({ struggle: 'cravings', cycle: 'regular', hormone_signs: ['none'] })).toEqual({ skipped: 1, added: 0 });
    expect(adaptation({ struggle: 'cravings', cycle: 'stopped', hormone_signs: ['acne'] })).toEqual({ skipped: 0, added: 1 });
  });

  it('places the two interstitial screens', () => {
    const keys = buildSteps(pcosInsulin).map((s) => s.key);
    expect(keys.indexOf('scan')).toBe(keys.indexOf('hormone_signs') + 1);
    expect(keys.indexOf('finding')).toBe(keys.indexOf('family') + 1);
  });

  it('back steps over the scan screen, which moves on by itself, but not over the findings screen', () => {
    const steps = buildSteps(pcosInsulin);
    const keys = steps.map((s) => s.key);
    const afterScan = keys[keys.indexOf('scan') + 1];
    expect(stepBefore(steps, afterScan)).toBe('hormone_signs');
    expect(stepBefore(steps, 'scan')).toBe('hormone_signs');
    expect(stepBefore(steps, keys[keys.indexOf('finding') + 1])).toBe('finding');
    expect(stepBefore(steps, keys[1])).toBe(keys[0]);
    expect(stepBefore(steps, keys[0])).toBeNull();
    expect(stepBefore(steps, 'not-a-step')).toBeNull();
  });

  it('knows when the assessment is complete', () => {
    expect(isComplete(pcosInsulin)).toBe(true);
    const { avoid: _avoid, ...missing } = pcosInsulin;
    expect(isComplete(missing)).toBe(false);
  });
});

describe('launch price window', () => {
  const start = '2026-11-15T10:00:00.000Z';
  it('charges the launch price inside 15 minutes and the regular price after', () => {
    expect(priceFor('w4', start, new Date('2026-11-15T10:14:59Z'))).toBe(299);
    expect(priceFor('w4', start, new Date('2026-11-15T10:15:00Z'))).toBe(599);
    expect(TIER_ORDER.map((id) => TIERS[id].launch)).toEqual([199, 299, 399]);
    expect(TIER_ORDER.map((id) => TIERS[id].regular)).toEqual([399, 599, 799]);
    expect(isLaunchPriceLive(undefined)).toBe(false);
  });
});

describe('input checks', () => {
  it('keeps only known questions and options', () => {
    const clean = sanitizeAnswers({ cycle: 'skip', hormone_signs: ['acne', 'bogus', 'none'], cuisine: ['south', 'north', 'kerala'], hacked: 'x', metrics: { age: 29, heightCm: 162, weightKg: 72, goalKg: 64 } });
    expect(clean.cycle).toBe('skip');
    expect(clean.hormone_signs).toEqual(['none']);
    expect(clean.cuisine).toEqual(['south', 'north']);
    expect(clean).not.toHaveProperty('hacked');
    expect(clean.metrics).toEqual(metrics);
  });

  it('rejects impossible body numbers', () => {
    expect(sanitizeAnswers({ metrics: { age: 29, heightCm: 20, weightKg: 72, goalKg: 64 } })).toEqual({});
  });

  it('accepts Indian mobile numbers and normal emails only', () => {
    expect(cleanPhone('+91 98765 43210')).toBe('9876543210');
    expect(cleanPhone('12345')).toBeNull();
    expect(cleanEmail(' Priya@Example.com ')).toBe('priya@example.com');
    expect(cleanEmail('not-an-email')).toBeNull();
  });
});
