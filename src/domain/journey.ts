// "Your next 12 weeks": what she is likely to feel and see, week by week, picked
// from the signs she ticked. These are expectations worded as "often" and "can",
// not promises.
//
// Reviewed by the doctor on 2026-11-15 (relayed by Tushar):
//   - skin on the chin and jawline starts to respond from week 3
//   - cycles can become more regular once 5% of body weight is off: approved
//   - no dress-size claim; instead, at about 1 kg down women start to feel
//     lighter and their clothes sit looser
// The remaining lines are DRAFT copy by an AI agent, pending her approval.
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
/** Loss at which women start to feel lighter and clothes sit looser (doctor). */
const FEEL_LIGHTER_KG = 1;

export function buildJourney(markers: MarkerId[], energy: EnergyPlan, startKg: number): JourneyStop[] {
  const has = (m: MarkerId) => markers.includes(m);
  const losing = energy.paceKgPerWeek > 0;
  const at = (week: number) => weightAtWeek(startKg, energy.goalKg, energy.paceKgPerWeek, week);
  const lost = (week: number) => Math.round((startKg - at(week)) * 10) / 10;
  const cycleLineFrom = (week: number) => has('p_cycle') && lost(week) / startKg >= CYCLE_BENEFIT_SHARE;
  const sleepSign = has('s_sleep') || has('s_wake') || has('t_tired') || has('s_wired');

  // The "feel lighter" line goes on the first stop where about 1 kg is off.
  const lighterWeek = losing ? [2, 3, 4, 8, 12].find((w) => lost(w) >= FEEL_LIGHTER_KG) : undefined;
  const lighterLine = (week: number) =>
    `About ${lost(week)} kg down. You start to feel lighter and ${has('i_belly') ? 'your waistband sits looser' : 'your clothes sit looser'}.`;

  // Week 1: the first things she feels.
  const week1: string[] = [];
  if (has('i_cravings') || has('i_spike')) week1.push('The sugar cravings after meals start to fade as your plates change.');
  else if (has('i_hungry')) week1.push('You stay full for longer, with protein in every meal.');
  if (has('f_bloat')) week1.push('Bloating often eases with smaller, regular meals.');
  if (week1.length === 0) week1.push('Steadier energy through the day, on five regular meals.');
  if (week1.length === 1 && has('i_crash')) week1.push('The sleepy hour after lunch gets lighter.');

  // Week 2: clothes, if about 1 kg is already off; otherwise how she feels.
  const week2: string[] = [];
  if (lighterWeek === 2) week2.push(lighterLine(2));
  if (has('f_puffy')) week2.push('Less puffiness in your face and fingers in the morning.');
  if (week2.length < 2 && has('i_crash') && !week1.some((l) => l.includes('after lunch'))) week2.push('The slump after lunch is mostly gone.');
  if (week2.length === 0) week2.push('Meals and walks start to feel like routine, not effort.');

  // Week 3: skin (doctor: it starts to respond from week 3), then sleep and stamina.
  const week3: string[] = [];
  if (has('p_acne')) week3.push('Skin on the chin and jawline often starts to settle on low-GI meals.');
  if (lighterWeek === 3) week3.push(lighterLine(3));
  if (sleepSign) week3.push('The daily walk often starts to pay you back in deeper sleep.');
  if (week3.length === 0) week3.push('Your walk feels easier and you go further.');
  const week3Title = has('p_acne') ? 'Your skin responds' : lighterWeek === 3 ? 'Your clothes notice' : sleepSign ? 'Your sleep deepens' : 'Your stamina builds';

  // Week 4: the scale.
  const week4: string[] = [];
  if (lighterWeek === 4) week4.push(lighterLine(4));
  else if (losing && lost(4) > 0) week4.push(`Down about ${lost(4)} kg.`);
  week4.push('Four weeks in, this starts to feel like your normal.');

  // Week 8: what other people can see.
  const week8: string[] = [];
  if (lighterWeek === 8) week8.push(lighterLine(8));
  else if (losing && lost(8) > 0) week8.push(`Down about ${lost(8)} kg.`);
  if (cycleLineFrom(8)) week8.push('With this much weight off, cycles can start to become more regular.');
  if (losing && week8.length < 2) week8.push('This is usually when friends and family start to notice.');
  if (week8.length === 0) week8.push('The habits hold on busy days too.');

  // Week 12: the finish.
  const week12: string[] = [];
  if (losing) week12.push(energy.reachesGoal ? `${at(12)} kg. The weight you asked for.` : `${at(12)} kg, down ${lost(12)} kg. Stage 2 takes you on to ${energy.goalKg} kg.`);
  if (!cycleLineFrom(8) && cycleLineFrom(12)) week12.push('With this much weight off, cycles can start to become more regular.');
  week12.push('Your meals, your walk and your strength days now run on their own.');

  const kg = (week: number) => (losing ? at(week) : undefined);
  return [
    { week: 1, title: 'You feel it first', lines: week1.slice(0, 2) },
    { week: 2, title: lighterWeek === 2 ? 'Your clothes notice' : 'Your body settles in', lines: week2.slice(0, 2) },
    { week: 3, title: week3Title, lines: week3.slice(0, 2) },
    { week: 4, title: 'The scale moves', lines: week4.slice(0, 2), kg: kg(4) },
    { week: 8, title: 'Other people notice', lines: week8.slice(0, 2), kg: kg(8) },
    { week: 12, title: losing ? (energy.reachesGoal ? 'Your goal' : 'Stage 1 complete') : 'It is simply how you eat', lines: week12.slice(0, 2), kg: kg(12) },
  ];
}

export const JOURNEY_FOOTNOTE = 'What many women notice on a plan like this. Every body moves at its own pace.';
