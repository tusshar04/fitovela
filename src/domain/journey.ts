// "Your first 4 weeks": what she is likely to feel and see, week by week, picked
// from the signs she ticked. Weeks 8 and 12 follow, folded away on screen.
//
// Founder and doctor, 2026-11-15 (relayed by Tushar): the timeline was underselling.
//   - sell the first month: weeks 1 to 4 lead, weeks 8 and 12 sit under "show more"
//   - every stop speaks to something she is self-conscious about and how good it
//     feels when it eases
//   - no weight on any stop: no kilograms, no target, no "goal reached"
//
// Reviewed by the doctor earlier the same day:
//   - skin on the chin and jawline starts to respond from week 3
//   - cycles can become more regular once 5% of body weight is off: approved
//   - no dress-size claim; at about 1 kg down clothes start to sit looser
// Her kilogram thresholds still decide WHEN a line appears; they are never shown.
// Everything else is DRAFT copy by an AI agent, pending her approval.
//
// Rules for anything added here:
//   - only say what a low-GI, protein-forward plan with daily walking plausibly does
//   - speak to the complaint she told us about, from her side: the daily annoyance
//     going away. Never tell her that her body looks bad.
//   - no "will", no guarantee, no cure; medical changes (skin, cycles, patches) keep
//     "start to" or "can"
//   - no weights; thresholds come from energy.ts and nowhere else

import { weightAtWeek, type EnergyPlan } from './energy';
import type { MarkerId } from './questions';

export interface JourneyStop {
  week: number;
  title: string;
  lines: string[];
}

/** Stops up to this week are shown outright; later ones sit under "show more". */
export const FIRST_MONTH_WEEKS = 4;

/** Weight loss, as a share of starting weight, from which PCOS cycles can become more regular. */
const CYCLE_BENEFIT_SHARE = 0.05;
/** Loss at which clothes start to sit looser (doctor). */
const CLOTHES_LOOSER_KG = 1;

export function buildJourney(markers: MarkerId[], energy: EnergyPlan, startKg: number): JourneyStop[] {
  const has = (m: MarkerId) => markers.includes(m);
  const losing = energy.paceKgPerWeek > 0;
  const lost = (week: number) => Math.round((startKg - weightAtWeek(startKg, energy.goalKg, energy.paceKgPerWeek, week)) * 10) / 10;
  const cycleLineFrom = (week: number) => has('p_cycle') && lost(week) / startKg >= CYCLE_BENEFIT_SHARE;
  const sleepSign = has('s_sleep') || has('s_wake') || has('t_tired') || has('s_wired');

  // The clothes line goes on the first stop where about 1 kg is off.
  const clothesWeek = losing ? [2, 3, 4, 8, 12].find((w) => lost(w) >= CLOTHES_LOOSER_KG) : undefined;
  const clothesLine = has('i_belly') ? 'Your waistband loosens. Your jeans button without the deep breath.' : 'Your clothes start to sit looser, and you stop tugging at your top.';
  const cycleLine = 'Cycles can start to become more regular.';

  // Week 1: the first relief.
  const week1: string[] = [];
  let week1Title = 'Your energy steadies';
  if (has('i_cravings') || has('i_spike')) {
    week1.push('The pull towards something sweet after meals goes quiet. It was never about your willpower.');
    week1Title = 'The cravings go quiet';
  } else if (has('i_hungry')) {
    week1.push('You stay full between meals and stop hunting for a snack an hour after lunch.');
    week1Title = 'You stay full';
  }
  if (has('f_bloat')) {
    if (week1.length === 0) week1Title = 'Your stomach settles';
    week1.push('The bloat that tightens your clothes by evening starts to ease.');
  }
  if (week1.length === 0) week1.push('Your energy stays steady from morning to night, with no crash.');
  const crashInWeek1 = week1.length === 1 && has('i_crash');
  if (crashInWeek1) week1.push('No more fighting sleep after lunch.');

  // Week 2: clothes, if about 1 kg is already off; then her face and her mornings.
  const week2: string[] = [];
  let week2Title = 'It starts to feel easy';
  if (clothesWeek === 2) {
    week2.push(clothesLine);
    week2Title = 'Your clothes notice';
  }
  if (has('f_puffy')) {
    if (week2.length === 0) week2Title = 'Your face looks fresher';
    week2.push('Less puffiness in the mirror each morning. Your face looks fresher.');
  }
  if (week2.length < 2 && has('t_constipation')) {
    if (week2.length === 0) week2Title = 'Your body settles in';
    week2.push('Your mornings get regular and the heavy feeling lifts.');
  }
  if (week2.length < 2 && has('i_crash') && !crashInWeek1) {
    if (week2.length === 0) week2Title = 'Your afternoons are yours again';
    week2.push('The slump after lunch is gone.');
  }
  if (week2.length === 0) week2.push('Eating well stops feeling like a fight. You are simply doing it.');

  // Week 3: skin (doctor: it starts to respond from week 3), then sleep and stamina.
  const week3: string[] = [];
  if (has('p_acne')) week3.push('Your chin and jawline start to calm down. Fewer mornings spent covering up.');
  if (clothesWeek === 3) week3.push(clothesLine);
  if (sleepSign) week3.push('Sleep comes easier, and you wake up properly rested.');
  if (week3.length === 0) week3.push('The walk that felt like a chore now feels easy, and you go further.');
  const week3Title = has('p_acne') ? 'Your skin calms down' : clothesWeek === 3 ? 'Your clothes notice' : sleepSign ? 'You wake up rested' : 'Your stamina is back';

  // Week 4: the end of the first month, and the last stop shown outright.
  const week4: string[] = [];
  if (clothesWeek === 4) week4.push(clothesLine);
  week4.push('You catch your reflection and like what you see.');
  if (week4.length < 2) week4.push(clothesWeek !== undefined && clothesWeek < 4 ? 'Getting dressed stops being a daily battle.' : 'One month in, the meals and the walk take no willpower.');

  // Week 8: what other people can see.
  const week8: string[] = [];
  if (clothesWeek === 8) week8.push(clothesLine);
  if (cycleLineFrom(8)) week8.push(cycleLine);
  if (losing && week8.length < 2) week8.push('Friends and family start asking what you have changed.');
  if (week8.length === 0) week8.push('The habits hold on busy days too.');

  // Week 12: how she lives now. No target and no weight.
  const week12: string[] = [];
  if (clothesWeek === 12) week12.push(clothesLine);
  if (!cycleLineFrom(8) && cycleLineFrom(12)) week12.push(cycleLine);
  if (has('i_patches')) week12.push('The dark patches on your neck and underarms can start to fade as your insulin settles.');
  if (losing) week12.push('You pick clothes because you like them, not because they hide you.');
  week12.push('You are not on a diet any more. This is simply how you eat.');

  return [
    { week: 1, title: week1Title, lines: week1.slice(0, 2) },
    { week: 2, title: week2Title, lines: week2.slice(0, 2) },
    { week: 3, title: week3Title, lines: week3.slice(0, 2) },
    { week: 4, title: clothesWeek === 4 ? 'Your clothes notice' : 'You feel like yourself again', lines: week4.slice(0, 2) },
    { week: 8, title: losing ? 'Other people notice' : 'The habits hold', lines: week8.slice(0, 2) },
    { week: 12, title: losing ? 'Comfortable in your own skin' : 'It is simply how you eat', lines: week12.slice(0, 2) },
  ];
}

export const JOURNEY_FOOTNOTE = 'What many women notice on a plan like this. Every body moves at its own pace.';
