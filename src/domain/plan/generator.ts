// Builds a day-by-day plan from the meal library. Deterministic for a given seed.
// Rules from the doctor's answer 10A: low-GI Indian meals, protein at every meal,
// no food group banned. Calories follow energy.ts (never below BMR).

import type { MovementPlan } from '../energy';
import type { TypeId } from '../typing';
import { MEALS } from './meals';
import type { AvoidTag, Cuisine, Diet, Ingredient, Meal, MealSlot, MealTag } from './types';

export type DaySlot = 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner';

const DAY_SLOTS: { slot: DaySlot; pool: MealSlot; label: string; time: string }[] = [
  { slot: 'breakfast', pool: 'breakfast', label: 'Breakfast', time: '8:30 am' },
  { slot: 'snack_am', pool: 'snack', label: 'Snack', time: '11:00 am' },
  { slot: 'lunch', pool: 'lunch', label: 'Lunch', time: '1:30 pm' },
  { slot: 'snack_pm', pool: 'snack', label: 'Snack', time: '5:00 pm' },
  { slot: 'dinner', pool: 'dinner', label: 'Dinner', time: '7:45 pm' },
];

export interface PlanDish {
  id: string;
  name: string;
  portion: string;
  kcal: number;
  protein: number;
}

export interface AddOn {
  id: string;
  label: string;
  kcal: number;
  protein: number;
}

export interface PlanMeal {
  slot: DaySlot;
  label: string;
  time: string;
  dish: PlanDish;
  addOns: AddOn[];
  swaps: PlanDish[];
}

export interface PlanDay {
  day: number;
  meals: PlanMeal[];
  kcal: number;
  protein: number;
}

export interface GroceryItem {
  item: string;
  qty: number;
  unit: Ingredient['unit'];
}

export interface Plan {
  days: PlanDay[];
  targetKcal: number;
  typeId: TypeId;
  cuisines: Cuisine[];
  diet: Diet;
  avoid: AvoidTag[];
  /** One shopping list per week of the plan. */
  groceries: GroceryItem[][];
  notes: string[];
  generatedAt: string;
  /** Walk and strength prescription. Absent on plans made before it existed. */
  movement?: MovementPlan;
}

export interface PlanInput {
  seed: string;
  days: number;
  targetKcal: number;
  typeId: TypeId;
  cuisines: Cuisine[];
  diet: Diet;
  avoid: AvoidTag[];
  weekOneLighterOn: 'wheat' | 'dairy' | null;
  medicationAdvisory: boolean;
  movement?: MovementPlan;
}

interface AddOnDef extends AddOn {
  pools: MealSlot[];
  contains: AvoidTag[];
  diet: Diet;
}

const ADD_ONS: AddOnDef[] = [
  { id: 'extra_dal', label: '1 extra katori dal', kcal: 120, protein: 7, pools: ['lunch', 'dinner'], contains: [], diet: 'veg' },
  { id: 'paneer', label: '50 g paneer on the side', kcal: 130, protein: 9, pools: ['breakfast', 'lunch', 'dinner'], contains: ['dairy'], diet: 'veg' },
  { id: 'peanuts', label: 'A handful of roasted peanuts', kcal: 90, protein: 4, pools: ['snack'], contains: [], diet: 'veg' },
  { id: 'extra_roti', label: '1 extra phulka', kcal: 75, protein: 3, pools: ['lunch', 'dinner'], contains: ['wheat'], diet: 'veg' },
  { id: 'boiled_egg', label: '1 boiled egg', kcal: 70, protein: 6, pools: ['breakfast', 'snack'], contains: [], diet: 'egg' },
  { id: 'chana', label: 'A handful of roasted chana', kcal: 70, protein: 4, pools: ['snack'], contains: [], diet: 'veg' },
  { id: 'curd', label: '1 katori curd', kcal: 65, protein: 4, pools: ['breakfast', 'lunch', 'dinner'], contains: ['dairy'], diet: 'veg' },
  { id: 'fruit', label: '1 seasonal fruit', kcal: 60, protein: 1, pools: ['breakfast', 'snack'], contains: [], diet: 'veg' },
];

/** Meal tags each type leans towards. DRAFT, pending doctor review. */
const TYPE_TAGS: Record<TypeId, MealTag[]> = {
  pcos_insulin: ['steady_energy', 'high_fibre'],
  pcos_inflammatory: ['anti_inflammatory', 'high_fibre'],
  pcos_postpill: ['steady_energy', 'thyroid_support'],
  pcos_adrenal: ['steady_energy'],
  insulin: ['steady_energy', 'high_fibre'],
  thyroid: ['thyroid_support', 'high_fibre'],
  inflammation: ['anti_inflammatory', 'high_fibre'],
  routine: ['steady_energy'],
};

const DIET_RANK: Record<Diet, number> = { veg: 0, egg: 1, nonveg: 2 };

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  let s = a;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toDish(m: Meal): PlanDish {
  return { id: m.id, name: m.name, portion: m.portion, kcal: m.kcal, protein: m.protein };
}

export function allowedMeals(input: Pick<PlanInput, 'diet' | 'avoid' | 'cuisines'>, library: Meal[] = MEALS): Meal[] {
  return library.filter((m) => {
    if (DIET_RANK[m.diet] > DIET_RANK[input.diet]) return false;
    if (m.contains.some((c) => input.avoid.includes(c))) return false;
    return m.cuisines.includes('any') || m.cuisines.some((c) => input.cuisines.includes(c as Cuisine));
  });
}

export function generatePlan(input: PlanInput, library: Meal[] = MEALS): Plan {
  const rand = mulberry32(hashSeed(input.seed));
  const preferTags = TYPE_TAGS[input.typeId];
  let allowed = allowedMeals(input, library);

  // If a narrow combination leaves a slot empty, widen to every cuisine before giving up.
  const pools: MealSlot[] = ['breakfast', 'snack', 'lunch', 'dinner'];
  if (pools.some((p) => allowed.filter((m) => m.slots.includes(p)).length < 3)) {
    allowed = library.filter((m) => DIET_RANK[m.diet] <= DIET_RANK[input.diet] && !m.contains.some((c) => input.avoid.includes(c)));
  }

  const score = (m: Meal): number => {
    let s = rand() * 2;
    if (!m.cuisines.includes('any')) s += 3;
    s += m.tags.filter((t) => preferTags.includes(t)).length * 1.5;
    if (m.gi === 'low') s += 1;
    if (input.diet !== 'veg' && m.diet === input.diet) s += 1;
    // On low-calorie days protein matters most: favour dishes with more protein per calorie.
    if (input.targetKcal <= 1300) s += (m.protein / m.kcal) * 40;
    return s;
  };

  const recent: Record<MealSlot, string[]> = { breakfast: [], snack: [], lunch: [], dinner: [] };
  const days: PlanDay[] = [];

  for (let d = 1; d <= input.days; d += 1) {
    const lighter = d <= 7 ? input.weekOneLighterOn : null;
    const usedToday = new Set<string>();
    const chosen: { def: (typeof DAY_SLOTS)[number]; meal: Meal; pool: Meal[] }[] = [];

    for (const def of DAY_SLOTS) {
      let pool = allowed.filter((m) => m.slots.includes(def.pool));
      if (lighter) {
        const lighterPool = pool.filter((m) => !m.contains.includes(lighter));
        if (lighterPool.length >= 3) pool = lighterPool;
      }
      const fresh = pool.filter((m) => !usedToday.has(m.id) && !recent[def.pool].includes(m.id));
      const candidates = fresh.length > 0 ? fresh : pool.filter((m) => !usedToday.has(m.id));
      const pick = [...(candidates.length > 0 ? candidates : pool)].sort((a, b) => score(b) - score(a))[0];
      usedToday.add(pick.id);
      recent[def.pool].push(pick.id);
      const keep = def.pool === 'snack' ? 6 : 4;
      if (recent[def.pool].length > keep) recent[def.pool].shift();
      chosen.push({ def, meal: pick, pool });
    }

    // Fit the day to the calorie target.
    let total = chosen.reduce((n, c) => n + c.meal.kcal, 0);

    // Too high: swap the heaviest main for the lightest unused option, up to three times.
    // Each pass trades the meal with the most room to spare for the lighter option that lands
    // the day closest to the target, keeping as much protein as it can.
    for (let tries = 0; tries < 8 && total > input.targetKcal + 60; tries += 1) {
      const over = total - input.targetKcal;
      let best: { slot: (typeof chosen)[number]; option: Meal; miss: number } | null = null;
      for (const c of chosen) {
        for (const option of c.pool) {
          if (usedToday.has(option.id) || option.kcal >= c.meal.kcal) continue;
          const saved = c.meal.kcal - option.kcal;
          const miss = Math.abs(over - saved) - (option.protein - c.meal.protein) * 2;
          if (!best || miss < best.miss) best = { slot: c, option, miss };
        }
      }
      if (!best) break;
      usedToday.delete(best.slot.meal.id);
      usedToday.add(best.option.id);
      total += best.option.kcal - best.slot.meal.kcal;
      best.slot.meal = best.option;
    }

    // Too low: add protein-first extras, at most two per meal.
    const addOns: Record<string, AddOn[]> = {};
    const usable = ADD_ONS.filter((a) => DIET_RANK[a.diet] <= DIET_RANK[input.diet] && !a.contains.some((c) => input.avoid.includes(c)) && !(lighter && a.contains.includes(lighter)));
    let guard = 0;
    while (input.targetKcal - total > 45 && guard < 10) {
      guard += 1;
      const gap = input.targetKcal - total;
      const option = usable
        .filter((a) => a.kcal <= gap + 40)
        .map((a) => ({ a, target: chosen.filter((c) => a.pools.includes(c.def.pool) && (addOns[c.def.slot]?.length ?? 0) < 2 && !(addOns[c.def.slot] ?? []).some((x) => x.id === a.id)) }))
        .filter((x) => x.target.length > 0)
        .sort((x, y) => y.a.protein / y.a.kcal - x.a.protein / x.a.kcal)[0];
      if (!option) break;
      const target = option.target.sort((x, y) => (addOns[x.def.slot]?.length ?? 0) - (addOns[y.def.slot]?.length ?? 0))[0];
      (addOns[target.def.slot] ??= []).push({ id: option.a.id, label: option.a.label, kcal: option.a.kcal, protein: option.a.protein });
      total += option.a.kcal;
    }

    const meals: PlanMeal[] = chosen.map((c) => {
      const swaps = c.pool
        .filter((m) => m.id !== c.meal.id && !usedToday.has(m.id))
        .sort((a, b) => Math.abs(a.kcal - c.meal.kcal) - Math.abs(b.kcal - c.meal.kcal))
        .slice(0, 2)
        .map(toDish);
      return { slot: c.def.slot, label: c.def.label, time: c.def.time, dish: toDish(c.meal), addOns: addOns[c.def.slot] ?? [], swaps };
    });

    const protein = meals.reduce((n, m) => n + m.dish.protein + m.addOns.reduce((x, a) => x + a.protein, 0), 0);
    days.push({ day: d, meals, kcal: total, protein });
  }

  // Shopping list per week, summed from the chosen dishes.
  const byId = new Map(library.map((m) => [m.id, m]));
  const groceries: GroceryItem[][] = [];
  for (let w = 0; w * 7 < days.length; w += 1) {
    const sums = new Map<string, GroceryItem>();
    for (const day of days.slice(w * 7, w * 7 + 7)) {
      for (const meal of day.meals) {
        for (const ing of byId.get(meal.dish.id)?.ingredients ?? []) {
          const key = `${ing.item}|${ing.unit}`;
          const cur = sums.get(key);
          if (cur) cur.qty += ing.qty;
          else sums.set(key, { item: ing.item, qty: ing.qty, unit: ing.unit });
        }
      }
    }
    groceries.push([...sums.values()].sort((a, b) => a.item.localeCompare(b.item)));
  }

  const notes: string[] = [];
  if (input.medicationAdvisory) notes.push('Show this plan to your doctor before you start, and do not change the dose of any medicine because of it.');
  if (input.weekOneLighterOn) notes.push(`Week 1 goes lighter on ${input.weekOneLighterOn}, as you told us it may bloat you. Notice whether you feel different.`);
  notes.push('Portions are for one person. Calories and protein are approximate.');

  return {
    days,
    targetKcal: input.targetKcal,
    typeId: input.typeId,
    cuisines: input.cuisines,
    diet: input.diet,
    avoid: input.avoid,
    groceries,
    notes,
    generatedAt: new Date().toISOString(),
    movement: input.movement,
  };
}
