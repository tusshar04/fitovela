// The week-by-week journey: personalised from her signs, weights from energy.ts,
// and no claim stronger than "often" or "can".

import { describe, expect, it } from 'vitest';
import { energyPlan } from '@/domain/energy';
import { buildJourney } from '@/domain/journey';
import type { MarkerId } from '@/domain/questions';
import type { Metrics } from '@/domain/types';

const metrics: Metrics = { age: 29, heightCm: 162, weightKg: 72, goalKg: 64 };
const energy = energyPlan(metrics, 'sedentary');
const text = (markers: MarkerId[], e = energy, start = metrics.weightKg) =>
  buildJourney(markers, e, start)
    .flatMap((s) => [s.title, ...s.lines])
    .join(' | ');

describe('journey', () => {
  it('always has five stops with something to say', () => {
    for (const markers of [[], ['i_cravings', 'f_bloat', 'i_belly', 'f_puffy', 'p_acne', 'p_cycle', 's_sleep']] as MarkerId[][]) {
      const stops = buildJourney(markers, energy, 72);
      expect(stops.map((s) => s.week)).toEqual([1, 2, 4, 8, 12]);
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
    expect(stops.map((s) => s.kg)).toEqual([undefined, undefined, 69.2, 66.4, 64]);
    expect(text([])).toContain('Down about 2.8 kg');
    expect(stops[4].title).toBe('Your goal');
  });

  it('calls the 12 weeks stage one when her goal is further away', () => {
    const big: Metrics = { age: 35, heightCm: 160, weightKg: 95, goalKg: 65 };
    const stops = buildJourney([], energyPlan(big, 'light'), 95);
    expect(stops[4].title).toBe('Stage 1 complete');
    expect(stops[4].lines[0]).toContain('80.4 kg');
    expect(stops[4].lines[0]).toContain('65 kg');
  });

  it('mentions cycles only for late or skipped periods and only once 5% of her weight is off', () => {
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
    expect(text(['i_cravings'], steady)).not.toContain('Down about');
  });

  it('never promises: no "will", "guarantee" or "cure"', () => {
    const all = text(['i_cravings', 'i_spike', 'i_hungry', 'i_belly', 'i_crash', 'f_bloat', 'f_puffy', 'p_acne', 'p_cycle', 's_sleep', 't_tired']);
    expect(all).not.toMatch(/\bwill\b|guarantee|cure/i);
  });
});
