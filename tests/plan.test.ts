// The plan generator and the meal library, checked against the doctor's answer 10A
// (low-GI Indian meals, protein at every meal) and the customer's own preferences.

import { describe, expect, it } from 'vitest';
import { allowedMeals, generatePlan, type PlanInput } from '@/domain/plan/generator';
import { MEALS } from '@/domain/plan/meals';
import type { AvoidTag, Cuisine, Diet } from '@/domain/plan/types';

const base: PlanInput = {
  seed: 'test-order',
  days: 28,
  targetKcal: 1430,
  typeId: 'pcos_insulin',
  cuisines: ['south', 'north'],
  diet: 'veg',
  avoid: [],
  weekOneLighterOn: null,
  medicationAdvisory: false,
};

const byId = new Map(MEALS.map((m) => [m.id, m]));
const RANK: Record<Diet, number> = { veg: 0, egg: 1, nonveg: 2 };

describe('meal library', () => {
  it('has unique ids and sane numbers', () => {
    expect(new Set(MEALS.map((m) => m.id)).size).toBe(MEALS.length);
    for (const m of MEALS) {
      expect(m.kcal, m.id).toBeGreaterThanOrEqual(80);
      expect(m.kcal, m.id).toBeLessThanOrEqual(540);
      expect(m.protein, m.id).toBeGreaterThanOrEqual(4);
      expect(['low', 'medium'], m.id).toContain(m.gi);
      expect(m.slots.length, m.id).toBeGreaterThan(0);
      expect(m.ingredients.length, m.id).toBeGreaterThan(0);
    }
  });

  it('puts protein in every main meal', () => {
    for (const m of MEALS) {
      if (m.slots.includes('breakfast')) expect(m.protein, m.id).toBeGreaterThanOrEqual(10);
      if (m.slots.includes('lunch') || m.slots.includes('dinner')) expect(m.protein, m.id).toBeGreaterThanOrEqual(14);
    }
  });

  it('gives every cuisine and diet enough choice in every slot', () => {
    const cuisines: Cuisine[] = ['south', 'north', 'punjabi', 'gujarati', 'bengali', 'odia', 'maharashtrian', 'rajasthani', 'hyderabadi', 'kerala'];
    for (const cuisine of cuisines) {
      for (const diet of ['veg', 'egg', 'nonveg'] as Diet[]) {
        const pool = allowedMeals({ cuisines: [cuisine], diet, avoid: [] });
        for (const slot of ['breakfast', 'snack', 'lunch', 'dinner'] as const) {
          expect(pool.filter((m) => m.slots.includes(slot)).length, `${cuisine}/${diet}/${slot}`).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });
});

describe('plan generator', () => {
  it('builds the requested number of days with five meals each', () => {
    for (const days of [7, 28, 84]) {
      const plan = generatePlan({ ...base, days });
      expect(plan.days).toHaveLength(days);
      expect(plan.days.every((d) => d.meals.length === 5)).toBe(true);
      expect(plan.groceries).toHaveLength(Math.ceil(days / 7));
    }
  });

  it('is the same plan for the same order', () => {
    const a = generatePlan(base);
    const b = generatePlan(base);
    expect(a.days.map((d) => d.meals.map((m) => m.dish.id))).toEqual(b.days.map((d) => d.meals.map((m) => m.dish.id)));
  });

  it.each([1300, 1430, 1600, 1850])('lands each day near a %i kcal target', (targetKcal) => {
    const plan = generatePlan({ ...base, targetKcal });
    for (const d of plan.days) {
      expect(Math.abs(d.kcal - targetKcal), `day ${d.day}: ${d.kcal}`).toBeLessThanOrEqual(130);
    }
  });

  it('respects diet preference', () => {
    for (const diet of ['veg', 'egg', 'nonveg'] as Diet[]) {
      const plan = generatePlan({ ...base, diet });
      for (const d of plan.days) {
        for (const m of d.meals) {
          for (const dish of [m.dish, ...m.swaps]) expect(RANK[byId.get(dish.id)!.diet], dish.id).toBeLessThanOrEqual(RANK[diet]);
          if (diet === 'veg') expect(m.addOns.map((a) => a.id)).not.toContain('boiled_egg');
        }
      }
    }
  });

  it.each([['dairy'], ['wheat'], ['onion_garlic'], ['dairy', 'wheat']] as AvoidTag[][])('never serves what she avoids: %s', (...avoid) => {
    const plan = generatePlan({ ...base, avoid });
    for (const d of plan.days) {
      for (const m of d.meals) {
        for (const dish of [m.dish, ...m.swaps]) {
          expect(byId.get(dish.id)!.contains.filter((c) => avoid.includes(c)), dish.id).toEqual([]);
        }
        if (avoid.includes('dairy')) expect(m.addOns.map((a) => a.id)).not.toEqual(expect.arrayContaining(['curd']));
        if (avoid.includes('wheat')) expect(m.addOns.map((a) => a.id)).not.toContain('extra_roti');
      }
    }
  });

  it('keeps to her kitchens or pan-Indian staples', () => {
    const plan = generatePlan(base);
    for (const d of plan.days) {
      for (const m of d.meals) {
        const meal = byId.get(m.dish.id)!;
        expect(meal.cuisines.some((c) => c === 'any' || base.cuisines.includes(c as Cuisine)), m.dish.id).toBe(true);
      }
    }
  });

  it('does not repeat a dish within a day and offers two swaps', () => {
    const plan = generatePlan(base);
    for (const d of plan.days) {
      const ids = d.meals.map((m) => m.dish.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const m of d.meals) expect(m.swaps.length, `day ${d.day} ${m.slot}`).toBe(2);
    }
  });

  it('goes lighter on wheat in week one when she flagged it', () => {
    const plan = generatePlan({ ...base, weekOneLighterOn: 'wheat' });
    for (const d of plan.days.slice(0, 7)) {
      for (const m of d.meals) expect(byId.get(m.dish.id)!.contains, `day ${d.day} ${m.dish.id}`).not.toContain('wheat');
    }
    expect(plan.notes.join(' ')).toContain('lighter on wheat');
  });

  it('carries the medication advisory when it applies', () => {
    expect(generatePlan({ ...base, medicationAdvisory: true }).notes[0]).toContain('doctor');
    expect(generatePlan(base).notes.join(' ')).not.toContain('dose');
  });

  it('adds up a weekly grocery list from the planned dishes', () => {
    const plan = generatePlan({ ...base, days: 7 });
    const list = plan.groceries[0];
    expect(list.length).toBeGreaterThan(8);
    const expected = new Map<string, number>();
    for (const d of plan.days) for (const m of d.meals) for (const ing of byId.get(m.dish.id)!.ingredients) expected.set(`${ing.item}|${ing.unit}`, (expected.get(`${ing.item}|${ing.unit}`) ?? 0) + ing.qty);
    for (const g of list) expect(g.qty).toBe(expected.get(`${g.item}|${g.unit}`));
  });
});
