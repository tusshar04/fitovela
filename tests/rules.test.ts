// One test group per rule in the doctor's answers.

import { describe, expect, it } from 'vitest';
import { buildAssessment } from '@/domain/assessment';
import { checkEligibility } from '@/domain/eligibility';
import { bmi, bmiBand, bmr, energyPlan } from '@/domain/energy';
import { adaptation, buildSteps, isComplete, questionSteps } from '@/domain/flow';
import { isLaunchPriceLive, priceFor } from '@/domain/offer';
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
  pill: 'no',
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

describe('3A: the four PCOS types, and the non-PCOS types', () => {
  it('insulin-resistant PCOS', () => expect(typeOf(pcosInsulin)).toBe('pcos_insulin'));

  it('post-pill PCOS when signs followed stopping the pill', () => {
    expect(typeOf({ ...pcosInsulin, pill: 'yes_worse' })).toBe('pcos_postpill');
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

describe('7C and 8B: calories and pace', () => {
  it('uses Indian BMI cut-offs', () => {
    expect(bmi(metrics)).toBe(27.4);
    expect([18.4, 18.5, 22.9, 23, 24.9, 25].map(bmiBand)).toEqual(['under', 'healthy', 'healthy', 'over', 'over', 'obese']);
  });

  it('never sets calories below BMR', () => {
    for (const activity of ['sedentary', 'light', 'moderate', 'active'] as const) {
      for (const m of [metrics, { age: 52, heightCm: 150, weightKg: 58, goalKg: 50 }, { age: 22, heightCm: 175, weightKg: 110, goalKg: 70 }]) {
        expect(energyPlan(m, activity).targetKcal).toBeGreaterThanOrEqual(bmr(m));
      }
    }
  });

  it('caps the shown pace at 1 kg a week', () => {
    const heavy = energyPlan({ age: 25, heightCm: 180, weightKg: 160, goalKg: 80 }, 'active');
    expect(heavy.paceKgPerWeek).toBeLessThanOrEqual(1);
  });

  it('projects an honest date from the real deficit', () => {
    const now = new Date('2026-11-15T00:00:00Z');
    const e = energyPlan(metrics, 'sedentary', now);
    expect(e.targetKcal).toBe(1430);
    expect(e.paceKgPerWeek).toBeCloseTo(0.26, 2);
    expect(e.weeksToGoal).toBe(31);
    expect(e.goalDate).toBe('2027-06-20');
  });

  it('holds weight steady when the goal is not lower', () => {
    const e = energyPlan({ ...metrics, goalKg: 72 }, 'light');
    expect(e.paceKgPerWeek).toBe(0);
    expect(e.goalDate).toBeNull();
  });
});

describe('adaptive questionnaire', () => {
  it('adds the pill and cravings follow-ups only when her answers call for them', () => {
    const ids = (a: Answers) => questionSteps(a).map((q) => q.id);
    expect(ids(pcosInsulin)).toContain('pill');
    expect(ids(pcosInsulin)).toContain('cravings_time');
    const none: Answers = { ...pcosInsulin, cycle: 'regular', hormone_signs: ['none'], insulin_signs: ['none'] };
    expect(ids(none)).not.toContain('pill');
    expect(ids(none)).not.toContain('cravings_time');
  });

  it('asks the menopause follow-up, not the pill one, when periods have stopped', () => {
    const ids = questionSteps({ ...pcosInsulin, cycle: 'stopped' }).map((q) => q.id);
    expect(ids).toContain('meno');
    expect(ids).not.toContain('pill');
  });

  it('reports true skip and add counts once the answers are in', () => {
    expect(adaptation({ struggle: 'cravings', cycle: 'regular', hormone_signs: ['none'] })).toEqual({ skipped: 2, added: 0 });
    expect(adaptation({ struggle: 'cravings', cycle: 'skip', hormone_signs: ['acne'] })).toEqual({ skipped: 1, added: 1 });
  });

  it('places the two interstitial screens', () => {
    const keys = buildSteps(pcosInsulin).map((s) => s.key);
    expect(keys.indexOf('scan')).toBe(keys.indexOf('hormone_signs') + 1);
    expect(keys.indexOf('finding')).toBe(keys.indexOf('family') + 1);
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
    expect(priceFor('w4', start, new Date('2026-11-15T10:14:59Z'))).toBe(499);
    expect(priceFor('w4', start, new Date('2026-11-15T10:15:00Z'))).toBe(999);
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
