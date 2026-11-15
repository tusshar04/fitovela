// Everything the result, paywall and plan pages need, computed from the answers.

import { checkEligibility, type Eligibility } from './eligibility';
import { bmi, bmiBand, energyPlan, type Activity, type BmiBand, type EnergyPlan } from './energy';
import { buildJourney, type JourneyStop } from './journey';
import { MARKERS, optionLabel, type MarkerId } from './questions';
import { areaCounts, areaLevels, markersFrom, stressCount } from './scoring';
import { TYPE_CONTENT, type TypeContent } from './typeContent';
import { determineType, type TypeResult } from './typing';
import { asList, isMetrics, type Answers, type Area, type Level, type Metrics } from './types';
import type { AvoidTag, Cuisine, Diet } from './plan/types';

export interface Assessment {
  markers: MarkerId[];
  counts: Record<Area, number>;
  levels: Record<Area, Level>;
  stress: number;
  result: TypeResult;
  content: TypeContent;
  metrics: Metrics;
  bmi: number;
  bmiBand: BmiBand;
  activity: Activity;
  energy: EnergyPlan;
  eligibility: Eligibility;
  cuisines: Cuisine[];
  diet: Diet;
  avoid: AvoidTag[];
  /** Short lines quoting her own answers, for the paywall recap. */
  recap: string[];
  /** Which food week one goes lighter on, from the bloating follow-up. */
  weekOneLighterOn: 'wheat' | 'dairy' | null;
  /** What she is likely to feel and see, week by week, from her own signs. */
  journey: JourneyStop[];
}

const DIET_LABEL: Record<Diet, string> = { veg: 'Vegetarian', egg: 'Vegetarian with eggs', nonveg: 'Non-vegetarian' };

function joinAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function cuisineLabels(cuisines: string[]): string {
  return joinAnd(cuisines.map((c) => optionLabel('cuisine', c)));
}

export function buildAssessment(answers: Answers, now: Date = new Date()): Assessment | null {
  const metrics = answers.metrics;
  if (!isMetrics(metrics)) return null;

  const markers = markersFrom(answers);
  const counts = areaCounts(markers);
  const levels = areaLevels(counts);
  const result = determineType(answers, markers, counts);
  const activity = (typeof answers.activity === 'string' ? answers.activity : 'sedentary') as Activity;
  void now;
  const energy = energyPlan(metrics, activity);
  const bmiValue = bmi(metrics);

  const cuisines = asList(answers.cuisine) as Cuisine[];
  const diet = (typeof answers.diet === 'string' ? answers.diet : 'veg') as Diet;
  const avoid = asList(answers.avoid).filter((a) => a !== 'none') as AvoidTag[];

  // Recap: up to two of her own signs from the areas behind her type, then food and goal.
  const relevant = markers.filter((m) => {
    const area = MARKERS[m].area;
    return area !== 'stress' && result.drivingAreas.includes(area);
  });
  // One sign from each area behind her type first, then fill up to two.
  const perArea = result.drivingAreas.flatMap((area) => relevant.filter((m) => MARKERS[m].area === area).slice(0, 1));
  const picked = [...new Set([...perArea, ...relevant])].slice(0, 2);
  const signLines: string[] = picked.map((m) => MARKERS[m].label);
  const recap: string[] = [...signLines];
  recap.push(cuisines.length ? `${DIET_LABEL[diet]}, ${cuisineLabels(cuisines)}` : DIET_LABEL[diet]);
  if (energy.toLoseKg > 0) recap.push(`Your goal: ${metrics.weightKg} kg to ${energy.goalKg} kg`);

  const bloat = answers.bloat_when;
  const weekOneLighterOn = bloat === 'wheat' || bloat === 'dairy' ? bloat : null;

  return {
    markers,
    counts,
    levels,
    stress: stressCount(markers),
    result,
    content: TYPE_CONTENT[result.type],
    metrics,
    bmi: bmiValue,
    bmiBand: bmiBand(bmiValue),
    activity,
    energy,
    eligibility: checkEligibility(answers),
    cuisines,
    diet,
    avoid,
    recap,
    weekOneLighterOn,
    journey: buildJourney(markers, energy, metrics.weightKg),
  };
}
