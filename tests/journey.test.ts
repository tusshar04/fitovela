// The week-by-week journey: personalised from her signs, led by the first four
// weeks, with no weight on any stop and no promise stronger than the rules allow.

import { describe, expect, it } from 'vitest';
import { energyPlan } from '@/domain/energy';
import { buildJourney, FIRST_MONTH_WEEKS } from '@/domain/journey';
import { MARKERS, type MarkerId } from '@/domain/questions';
import type { Metrics } from '@/domain/types';

const metrics: Metrics = { age: 29, heightCm: 162, weightKg: 72, goalKg: 64 };
const energy = energyPlan(metrics, 'sedentary');
const stopText = (s: { title: string; lines: string[] }) => [s.title, ...s.lines].join(' | ');
const text = (markers: MarkerId[], e = energy, start = metrics.weightKg) => buildJourney(markers, e, start).map(stopText).join(' | ');
const ALL_MARKERS = Object.keys(MARKERS) as MarkerId[];

describe('journey', () => {
  it('always has six stops with something to say, four of them in the first month', () => {
    for (const markers of [[], ['i_cravings', 'f_bloat', 'i_belly', 'f_puffy', 'p_acne', 'p_cycle', 's_sleep'], ALL_MARKERS] as MarkerId[][]) {
      const stops = buildJourney(markers, energy, 72);
      expect(stops.map((s) => s.week)).toEqual([1, 2, 3, 4, 8, 12]);
      expect(stops.filter((s) => s.week <= FIRST_MONTH_WEEKS)).toHaveLength(4);
      for (const s of stops) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.lines.length).toBeGreaterThanOrEqual(1);
        expect(s.lines.length).toBeLessThanOrEqual(2);
      }
    }
  });

  it('speaks to the signs she ticked, and only those', () => {
    const hers = text(['i_cravings', 'f_bloat', 'i_belly', 'f_puffy', 'p_acne', 's_wake', 'i_patches']);
    expect(hers).toContain('something sweet');
    expect(hers).toContain('bloat');
    expect(hers).toContain('waistband');
    expect(hers).toContain('puffy morning face');
    expect(hers).toContain('chin and jawline');
    expect(hers).toContain('wake up fresh');
    expect(hers).toContain('dark patches');

    const none = text([]);
    for (const word of ['sweet', 'bloat', 'waistband', 'stomach in', 'puffy', 'jawline', 'Cycles', 'fall asleep', 'patches', 'after lunch']) expect(none).not.toContain(word);
  });

  it('founder: no weight on any stop, whatever she ticked and whichever plan', () => {
    const big: Metrics = { age: 35, heightCm: 160, weightKg: 95, goalKg: 65 };
    const cases: [MarkerId[], ReturnType<typeof energyPlan>, number][] = [
      [['i_cravings', 'i_belly', 'p_acne', 'p_cycle'], energy, 72],
      [ALL_MARKERS, energy, 72],
      [[], energyPlan(big, 'light'), 95],
      [ALL_MARKERS, energyPlan(big, 'light', 'intensive'), 95],
    ];
    for (const [markers, e, start] of cases) {
      const stops = buildJourney(markers, e, start);
      for (const s of stops) expect(Object.keys(s).sort()).toEqual(['lines', 'title', 'week']);
      expect(stops.map(stopText).join(' ')).not.toMatch(/\bkg\b|kilo|weight|scale|\bgoal\b|stage|\d/i);
    }
  });

  it('doctor: skin on the chin and jawline starts to respond in week 3', () => {
    const stops = buildJourney(['p_acne'], energy, 72);
    const week3 = stops.find((s) => s.week === 3)!;
    expect(week3.title).toBe('Your skin starts to clear');
    expect(week3.lines[0]).toContain('chin and jawline start to');
    expect(stops.filter((s) => s.week !== 3).map(stopText).join(' ')).not.toContain('jawline');
  });

  it('doctor: at about 1 kg down her clothes sit looser, on the first stop that reaches it', () => {
    // 0.7 kg a week: 1.4 kg by week 2.
    const fast = buildJourney(['i_belly'], energy, 72);
    expect(fast[1].title).toBe('Your clothes stop fighting you');
    expect(fast[1].lines[0]).toContain('waistband that dug in all day loosens');

    // A slower pace: a woman in the healthy range reaches 1 kg later, so the line moves with it.
    const slowMetrics: Metrics = { age: 30, heightCm: 160, weightKg: 56, goalKg: 52 };
    const slowEnergy = energyPlan(slowMetrics, 'sedentary');
    const slow = buildJourney([], slowEnergy, 56);
    const withLine = slow.filter((s) => s.lines.some((l) => l.includes('stop clinging')));
    expect(withLine).toHaveLength(1);
    expect(withLine[0].week).toBeGreaterThan(2);
    expect(slowEnergy.paceKgPerWeek * withLine[0].week).toBeGreaterThanOrEqual(0.95);
    expect(slow[1].title).not.toBe('Your clothes stop fighting you');
    // "No more loose clothes to cover up" is a clothes line too: only once her clothes line has appeared.
    const week4 = slow.find((s) => s.week === 4)!;
    expect(week4.lines.join(' ').includes('loose clothes')).toBe(withLine[0].week <= 4);
    expect(week4.title).toBe(withLine[0].week <= 4 ? 'You stop hiding' : 'You feel like yourself again');
  });

  it('doctor: no dress-size claim anywhere', () => {
    expect(text(ALL_MARKERS)).not.toMatch(/dress size|size down|sizes?\b/i);
  });

  it('week 12 is about how she lives, not a target, even when her goal is further away', () => {
    const big: Metrics = { age: 35, heightCm: 160, weightKg: 95, goalKg: 65 };
    const stops = buildJourney([], energyPlan(big, 'light'), 95);
    expect(stops[5].title).toBe('You dress to be seen');
    expect(stops[5].lines.join(' ')).toContain('the outfit you like');
  });

  it('doctor: cycles are mentioned only for late or skipped periods and only once 5% of her weight is off', () => {
    expect(text(['p_cycle'])).toContain('Cycles can start to become more regular');
    expect(text([])).not.toMatch(/cycles/i);
    // A small loss: 60 kg to 58 kg never reaches 5%.
    const small: Metrics = { age: 30, heightCm: 158, weightKg: 60, goalKg: 58 };
    expect(text(['p_cycle'], energyPlan(small, 'sedentary'), 60)).not.toMatch(/cycles/i);
    // Never in the first month on the standard plan: 5% takes longer than four weeks.
    expect(buildJourney(['p_cycle'], energy, 72).slice(0, 4).map(stopText).join(' ')).not.toMatch(/cycles/i);
  });

  it('"someone asks" comes in week 4 only when about 2.5 kg is off by then, else other people wait for week 8', () => {
    // 0.7 kg a week: 2.8 kg by week 4.
    expect(buildJourney([], energy, 72)[3].lines).toContain('The first person asks what you have been doing.');
    const slowEnergy = energyPlan({ age: 30, heightCm: 160, weightKg: 56, goalKg: 52 }, 'sedentary');
    expect(slowEnergy.paceKgPerWeek * 4).toBeLessThan(2.5);
    expect(buildJourney([], slowEnergy, 56)[3].lines.join(' ')).not.toContain('first person');
  });

  it('drops the clothes and "other people" lines when she is not trying to lose', () => {
    const steady = energyPlan({ ...metrics, goalKg: 72 }, 'light');
    expect(text(['i_cravings', 'i_belly'], steady)).not.toMatch(/clinging|waistband|loose clothes|photos|first person|relatives|outfit|Weddings/);
    expect(buildJourney(['i_cravings'], steady, 72)[5].lines).toEqual(['You are not on a diet. This is simply how you eat now.']);
    expect(text(['i_cravings'], steady)).toContain('something sweet');
  });

  it('never promises: no "will", "guarantee" or "cure", and medical changes stay "start to" or "can"', () => {
    const all = text(ALL_MARKERS);
    expect(all).not.toMatch(/\bwill\b|guarantee|\bcured?\b|\bfix(es|ed)?\b|\breverse/i);
    for (const stop of buildJourney(ALL_MARKERS, energy, 72)) {
      for (const line of stop.lines) {
        if (/jawline|Cycles|patches/.test(line)) expect(line).toMatch(/start to|\bcan\b/);
        if (/bloat/.test(line)) expect(line).toMatch(/starts to/);
      }
    }
  });
});
