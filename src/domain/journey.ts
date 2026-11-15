// "Your next 12 weeks": what she is likely to feel and see, week by week, picked
// from the signs she ticked. These are expectations worded as "often" and "can",
// not promises. DRAFT copy by an AI agent, pending the doctor's approval.
//
// Rules for anything added here:
//   - only say what a low-GI, protein-forward plan with daily walking plausibly does
//   - speak to what she told us she wants relief from; never shame her body
//   - weights come from energy.ts and nowhere else

import { weightAtWeek, type EnergyPlan } from './energy';
import type { MarkerId } from './questions';

export interface JourneyStop {
  week: number;
  title: string;
  lines: string[];
  /** Target weight at this week, shown as a small tag. Absent when she is not trying to lose. */
  kg?: number;
}

/** Weight loss, as a share of starting weight, from which PCOS cycles can become more regular. */
const CYCLE_BENEFIT_SHARE = 0.05;
const DRESS_SIZE_KG = 4.5;

export function buildJourney(markers: MarkerId[], energy: EnergyPlan, startKg: number): JourneyStop[] {
  const has = (m: MarkerId) => markers.includes(m);
  const losing = energy.paceKgPerWeek > 0;
  const at = (week: number) => weightAtWeek(startKg, energy.goalKg, energy.paceKgPerWeek, week);
  const lost = (week: number) => Math.round((startKg - at(week)) * 10) / 10;
  const cycleLineFrom = (week: number) => has('p_cycle') && lost(week) / startKg >= CYCLE_BENEFIT_SHARE;

  // Week 1: the first things she feels.
  const week1: string[] = [];
  if (has('i_cravings') || has('i_spike')) week1.push('The sugar cravings after meals start to fade as your plates change.');
  else if (has('i_hungry')) week1.push('You stay full for longer, with protein in every meal.');
  if (has('f_bloat')) week1.push('Bloating often eases with smaller, regular meals.');
  if (week1.length === 0) week1.push('Steadier energy through the day, on five regular meals.');
  if (week1.length === 1 && has('i_crash')) week1.push('The sleepy hour after lunch gets lighter.');

  // Week 2: the first things she sees.
  const week2: string[] = [];
  if (losing) week2.push(has('i_belly') ? 'Your waistband starts to sit looser.' : 'Clothes start to feel a little looser.');
  if (has('f_puffy')) week2.push('Less puffiness in your face and fingers in the morning.');
  if (week2.length < 2 && has('i_crash') && !week1.some((l) => l.includes('after lunch'))) week2.push('The slump after lunch is mostly gone.');
  if (week2.length === 0) week2.push('Meals and walks start to feel like routine, not effort.');

  // Week 4: the scale and her stamina.
  const week4: string[] = [];
  if (losing && lost(4) > 0) week4.push(`Down about ${lost(4)} kg.`);
  week4.push(has('s_sleep') || has('s_wake') || has('t_tired') || has('s_wired') ? 'The daily walk often starts to pay you back in deeper sleep.' : 'Your walk feels easier and you go further.');

  // Week 8: what other people can see.
  const week8: string[] = [];
  if (losing && lost(8) >= DRESS_SIZE_KG) week8.push(`Down about ${lost(8)} kg. For many women that is around one dress size.`);
  else if (losing && lost(8) > 0) week8.push(`Down about ${lost(8)} kg.`);
  if (has('p_acne')) week8.push('Skin on the chin and jawline often starts to settle on low-GI meals.');
  if (cycleLineFrom(8)) week8.push('With this much weight off, cycles can start to become more regular.');
  if (week8.length === 0) week8.push('The habits hold on busy days too.');

  // Week 12: the finish.
  const week12: string[] = [];
  if (losing) week12.push(energy.reachesGoal ? `${at(12)} kg. The weight you asked for.` : `${at(12)} kg, down ${lost(12)} kg. Stage 2 takes you on to ${energy.goalKg} kg.`);
  if (!cycleLineFrom(8) && cycleLineFrom(12)) week12.push('With this much weight off, cycles can start to become more regular.');
  week12.push('Your meals, your walk and your strength days now run on their own.');

  const kg = (week: number) => (losing ? at(week) : undefined);
  return [
    { week: 1, title: 'You feel it first', lines: week1.slice(0, 2) },
    { week: 2, title: 'Your clothes notice', lines: week2.slice(0, 2) },
    { week: 4, title: 'The scale moves', lines: week4.slice(0, 2), kg: kg(4) },
    { week: 8, title: 'Other people notice', lines: week8.slice(0, 2), kg: kg(8) },
    { week: 12, title: losing ? (energy.reachesGoal ? 'Your goal' : 'Stage 1 complete') : 'It is simply how you eat', lines: week12.slice(0, 2), kg: kg(12) },
  ];
}

export const JOURNEY_FOOTNOTE = 'What many women notice on a plan like this. Every body moves at its own pace.';
