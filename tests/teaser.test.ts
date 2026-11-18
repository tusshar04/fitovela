import { describe, expect, it } from 'vitest';
import { buildAssessment } from '@/domain/assessment';
import { reportTeaser } from '@/domain/teaser';
import type { Answers } from '@/domain/types';

// Synthetic women. The paywall is told how many signs, how many systems and how strong a match:
// never her type or which system scored what (D-030).
const base: Answers = {
  struggle: 'eat_little', cycle: 'regular', hormone_signs: ['none'], insulin_signs: ['none'], family: 'no', inflam_signs: ['none'],
  thyroid_signs: ['none'], thyroid_dx: 'no', stress: ['none'], metrics: { age: 29, heightCm: 160, weightKg: 72, goalKg: 62 },
  activity: 'sedentary', safety: ['none'], meds: ['none'], cuisine: ['north'], diet: 'veg', avoid: ['none'],
};

const women: Record<string, Answers> = {
  insulin: { ...base, insulin_signs: ['cravings', 'hungry', 'belly', 'patches'], cravings_time: 'within_hour', family: 'yes' },
  pcosInsulin: { ...base, cycle: 'late', hormone_signs: ['acne', 'facial_hair'], insulin_signs: ['cravings', 'belly', 'crash'], family: 'yes' },
  pcosAdrenal: { ...base, cycle: 'skip', hormone_signs: ['acne', 'hair_thin'], stress: ['short_sleep', 'wired', 'stress', 'wake_tired'] },
  routine: base,
};

describe('report teaser on the paywall', () => {
  it('counts every sign she ticked and the systems that stand out', () => {
    const a = buildAssessment(women.insulin)!;
    expect(a.result.type).toBe('insulin');
    const t = reportTeaser(a);
    expect(t.age).toBe(29);
    expect(t.signs).toBe(6);
    expect(t.signs).toBe(a.markers.length);
    expect(t.flagged).toBe(1);
    expect(t.strength).toBe(a.result.strength);
  });

  it('counts stress signs too, so the adrenal paywall does not contradict itself', () => {
    const a = buildAssessment(women.pcosAdrenal)!;
    expect(a.result.type).toBe('pcos_adrenal');
    expect(reportTeaser(a).signs).toBe(a.markers.length);
    expect(reportTeaser(a).signs).toBeGreaterThanOrEqual(a.result.matched);
  });

  it('has no match strength for the routine-led type', () => {
    const a = buildAssessment(women.routine)!;
    expect(a.result.type).toBe('routine');
    expect(reportTeaser(a)).toEqual({ age: 29, signs: 0, flagged: 0, strength: null });
  });

  it('carries only the four agreed fields: no type, no marker total, no per-system score', () => {
    const types = new Set<string>();
    for (const answers of Object.values(women)) {
      const a = buildAssessment(answers)!;
      types.add(a.result.type);
      const t = reportTeaser(a);
      expect(Object.keys(t).sort()).toEqual(['age', 'flagged', 'signs', 'strength']);
      expect(typeof t.signs).toBe('number');
      expect(typeof t.flagged).toBe('number');
      expect([null, 'early', 'clear', 'strong']).toContain(t.strength);
      // The denominator of "x of y markers matched" is unique to each type; it must not be here.
      expect(JSON.stringify(t)).not.toContain(a.result.type);
      expect(t).not.toHaveProperty('total');
      expect(t).not.toHaveProperty('match');
    }
    expect(types.size).toBe(4);
  });
});
