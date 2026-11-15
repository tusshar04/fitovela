// The week-by-week journey: personalised from her signs, weights from energy.ts,
// the doctor's three rulings applied, and no claim stronger than "often" or "can".

import { describe, expect, it } from 'vitest';
import { energyPlan } from '@/domain/energy';
import { buildJourney } from '@/domain/journey';
import type { MarkerId } from '@/domain/questions';
import type { Metrics } from '@/domain/types';

const metrics: Metrics = { age: 29, heightCm: 162, weightKg: 72, goalKg: 64 };
const energy = energyPlan(metrics, 'sedentary');
const stopText = (s: { title: string; lines: string[] }) => [s.title, ...s.lines].join(' | ');
const text = (markers: MarkerId[], e = energy, start = metrics.weightKg) => buildJourney(markers, e, start).map(stopText).join(' | ');

describe('journey', () => {
  it('always has six stops with something to say', () => {
    for (const markers of [[], ['i_cravings', 'f_bloat', 'i_belly', 'f_puffy', 'p_acne', 'p_cycle', 's_sleep']] as MarkerId[][]) {
      const stops = buildJourney(markers, energy, 72);
      expect(stops.map((s) => s.week)).toEqual([1, 2, 3, 4, 8, 12]);
      for (const s of stops) {
        expect(s.lines.length).toBeGreaterThanOrEqual(1);
        expect(s.lines.length).toBeLessThanOrEqual(2);
      }
    }
  });

  it('speaks to the signs she ticked, and only those', () => {
    const hers = text(['i_cravings', 'f_bloat', 'i_belly', 'f_puffy', 'p_acne', 's_wake']);
    expect(hers).toContain('sugar cravings');
    expect(hers).toContain('Bloating');
    expect(hers).toContain('waistband');
    expect(hers).toContain('puffiness');
    expect(hers).toContain('chin and jawline');
    expect(hers).toContain('deeper sleep');

    const none = text([]);
    for (const word of ['cravings', 'Bloating', 'waistband', 'puffiness', 'jawline', 'cycles', 'deeper sleep']) expect(none).not.toContain(word);
  });

  it('takes every weight from the energy plan', () => {
    const stops = buildJourney([], energy, 72);
    expect(stops.map((s) => s.kg)).toEqual([undefined, undefined, undefined, 69.2, 66.4, 64]);
    expect(text([])).toContain('Down about 2.8 kg');
    expect(stops[5].title).toBe('Your goal');
  });

  it('doctor: skin on the chin and jawline starts to respond in week 3', () => {
    const stops = buildJourney(['p_acne'], energy, 72);
    const week3 = stops.find((s) => s.week === 3)!;
    expect(week3.title).toBe('Your skin responds');
    expect(week3.lines[0]).toContain('chin and jawline');
    expect(stops.filter((s) => s.week !== 3).map(stopText).join(' ')).not.toContain('jawline');
  });

  it('doctor: at about 1 kg down she feels lighter and her clothes sit looser, on the first stop that reaches it', () => {
    // 0.7 kg a week: 1.4 kg by week 2.
    const fast = buildJourney(['i_belly'], energy, 72);
    expect(fast[1].title).toBe('Your clothes notice');
    expect(fast[1].lines[0]).toBe('About 1.4 kg down. You start to feel lighter and your waistband sits looser.');

    // A slower pace: a woman in the healthy range reaches 1 kg later, so the line moves with it.
    const slowMetrics: Metrics = { age: 30, heightCm: 160, weightKg: 56, goalKg: 52 };
    const slowEnergy = energyPlan(slowMetrics, 'sedentary');
    const slow = buildJourney([], slowEnergy, 56);
    const firstWithLine = slow.find((s) => s.lines.some((l) => l.includes('feel lighter')))!;
    expect(firstWithLine.week).toBeGreaterThan(2);
    expect(Math.round((56 - (56 - slowEnergy.paceKgPerWeek * firstWithLine.week)) * 10) / 10).toBeGreaterThanOrEqual(1);
    expect(slow[1].title).toBe('Your body settles in');
    expect(slow.filter((s) => s.lines.some((l) => l.includes('feel lighter')))).toHaveLength(1);
  });

  it('doctor: no dress-size claim anywhere', () => {
    expect(text(['i_cravings', 'i_belly', 'p_acne', 'p_cycle'])).not.toMatch(/dress size/i);
  });

  it('calls the 12 weeks stage one when her goal is further away', () => {
    const big: Metrics = { age: 35, heightCm: 160, weightKg: 95, goalKg: 65 };
    const stops = buildJourney([], energyPlan(big, 'light'), 95);
    expect(stops[5].title).toBe('Stage 1 complete');
    expect(stops[5].lines[0]).toContain('80.4 kg');
    expect(stops[5].lines[0]).toContain('65 kg');
  });

  it('doctor: cycles are mentioned only for late or skipped periods and only once 5% of her weight is off', () => {
    expect(text(['p_cycle'])).toContain('cycles can start to become more regular');
    expect(text([])).not.toContain('cycles');
    // A small loss: 60 kg to 58 kg never reaches 5%.
    const small: Metrics = { age: 30, heightCm: 158, weightKg: 60, goalKg: 58 };
    expect(text(['p_cycle'], energyPlan(small, 'sedentary'), 60)).not.toContain('cycles');
  });

  it('drops weights and loss lines when she is not trying to lose', () => {
    const steady = energyPlan({ ...metrics, goalKg: 72 }, 'light');
    const stops = buildJourney(['i_cravings'], steady, 72);
    expect(stops.every((s) => s.kg === undefined)).toBe(true);
    expect(text(['i_cravings'], steady)).not.toMatch(/Down about|kg down|feel lighter/);
  });

  it('never promises: no "will", "guarantee" or "cure"', () => {
    const all = text(['i_cravings', 'i_spike', 'i_hungry', 'i_belly', 'i_crash', 'f_bloat', 'f_puffy', 'p_acne', 'p_cycle', 's_sleep', 't_tired']);
    expect(all).not.toMatch(/\bwill\b|guarantee|cure/i);
  });
});
