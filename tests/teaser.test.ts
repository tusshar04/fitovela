import { describe, expect, it } from 'vitest';
import { buildAssessment } from '@/domain/assessment';
import { reportTeaser } from '@/domain/teaser';
import { TYPE_CONTENT } from '@/domain/typeContent';
import { AREA_LABEL, LEVEL_LABEL, type Answers } from '@/domain/types';

// Synthetic women. The paywall gets counts only: never her type or which system scored what (D-030).
const base: Answers = {
  struggle: 'weight', cycle: 'regular', hormone_signs: ['none'], insulin_signs: ['none'], family: ['none'], inflam_signs: ['none'],
  thyroid_signs: ['none'], thyroid_dx: 'no', stress: ['none'], metrics: { age: 29, heightCm: 160, weightKg: 72, goalKg: 62 },
  activity: 'sedentary', safety: ['none'], meds: ['none'], cuisine: ['north'], diet: 'veg', avoid: ['none'],
};

const insulin: Answers = { ...base, insulin_signs: ['belly', 'cravings', 'slump', 'dark_patches'], cravings_time: 'evening', family: ['diabetes'] };

describe('report teaser on the paywall', () => {
  it('counts her signs and the systems that stand out', () => {
    const a = buildAssessment(insulin)!;
    const t = reportTeaser(a);
    expect(t.age).toBe(29);
    expect(t.signs).toBe(a.counts.pcos + a.counts.insulin + a.counts.inflammation + a.counts.thyroid);
    expect(t.signs).toBeGreaterThan(0);
    expect(t.flagged).toBe(Object.values(a.levels).filter((l) => l !== 'low').length);
    expect(t.flagged).toBeGreaterThan(0);
  });

  it('gives the match count for a named type and none for the routine-led type', () => {
    const named = buildAssessment(insulin)!;
    expect(named.result.type).not.toBe('routine');
    expect(reportTeaser(named).match).toEqual({ matched: named.result.matched, total: named.result.total, strength: named.result.strength });

    const routine = buildAssessment(base)!;
    expect(routine.result.type).toBe('routine');
    expect(reportTeaser(routine)).toEqual({ age: 29, signs: 0, flagged: 0, match: null });
  });

  it('holds nothing that names her type or a system score', () => {
    for (const answers of [insulin, base]) {
      const a = buildAssessment(answers)!;
      const sent = JSON.stringify(reportTeaser(a));
      for (const c of Object.values(TYPE_CONTENT)) expect(sent).not.toContain(c.name);
      for (const word of [...Object.values(AREA_LABEL), ...Object.values(LEVEL_LABEL), a.result.type, ...Object.keys(a.levels)]) expect(sent).not.toContain(word);
    }
  });
});
