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
// Founder, later the same day: sell hard. The lines name the moment she is ashamed of
// (sucking her stomach in, loose clothes to cover up, the back row in photos, the
// relatives' comments) and take it away. Whether Meta accepts the page is his to handle.
//
// Rules for anything added here:
//   - only say what a low-GI, protein-forward plan with daily walking plausibly does
//   - speak to the complaint she told us about and the moment it embarrasses her
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
/** Loss from which other people plausibly notice (AI agent's draft, not the doctor's). */
const NOTICED_KG = 2.5;

export function buildJourney(markers: MarkerId[], energy: EnergyPlan, startKg: number): JourneyStop[] {
  const has = (m: MarkerId) => markers.includes(m);
  const losing = energy.paceKgPerWeek > 0;
  const lost = (week: number) => Math.round((startKg - weightAtWeek(startKg, energy.goalKg, energy.paceKgPerWeek, week)) * 10) / 10;
  const cycleLineFrom = (week: number) => has('p_cycle') && lost(week) / startKg >= CYCLE_BENEFIT_SHARE;
  const sleepSign = has('s_sleep') || has('s_wake') || has('t_tired') || has('s_wired');

  // The clothes line goes on the first stop where about 1 kg is off.
  const clothesWeek = losing ? [2, 3, 4, 8, 12].find((w) => lost(w) >= CLOTHES_LOOSER_KG) : undefined;
  const clothesLine = has('i_belly') ? 'The waistband that dug in all day loosens. You stop sucking your stomach in.' : 'Your clothes stop clinging. You stop tugging your top down all day.';
  const cycleLine = 'Cycles can start to become more regular.';
  // "Someone asks" needs a change other people can see: about 2.5 kg, else it waits for week 8.
  const noticedByWeek4 = losing && lost(4) >= NOTICED_KG;

  // Week 1: the first relief.
  const week1: string[] = [];
  let week1Title = 'Your energy is back';
  if (has('i_cravings') || has('i_spike')) {
    week1.push('The hunt for something sweet after meals stops, and so does the guilt. It was never your willpower.');
    week1Title = 'The cravings let go';
  } else if (has('i_hungry')) {
    week1.push('You stay full till the next meal. No more raiding the kitchen an hour after lunch.');
    week1Title = 'You stay full';
  }
  if (has('f_bloat')) {
    if (week1.length === 0) week1Title = 'The bloat goes down';
    week1.push('The evening bloat that makes you look bigger than you are starts to go down.');
  }
  if (week1.length === 0) week1.push('You wake up light and stay switched on all day. No crash, no dragging yourself through the evening.');
  const crashInWeek1 = week1.length === 1 && has('i_crash');
  if (crashInWeek1) week1.push('No more nodding off after lunch.');

  // Week 2: clothes, if about 1 kg is already off; then her face and her mornings.
  const week2: string[] = [];
  let week2Title = 'It stops feeling like a diet';
  if (clothesWeek === 2) {
    week2.push(clothesLine);
    week2Title = 'Your clothes stop fighting you';
  }
  if (has('f_puffy')) {
    if (week2.length === 0) week2Title = 'Your face looks fresher';
    week2.push('The puffy morning face goes down. You look fresh before any make-up.');
  }
  if (week2.length < 2 && has('t_constipation')) {
    if (week2.length === 0) week2Title = 'Your stomach feels light';
    week2.push('Your mornings get regular and the heavy, stuffed feeling lifts.');
  }
  if (week2.length < 2 && has('i_crash') && !crashInWeek1) {
    if (week2.length === 0) week2Title = 'Your afternoons are yours again';
    week2.push('The slump after lunch is gone.');
  }
  if (week2.length === 0) week2.push('Eating right stops feeling like punishment. You are simply doing it.');

  // Week 3: skin (doctor: it starts to respond from week 3), then sleep and stamina.
  const week3: string[] = [];
  if (has('p_acne')) week3.push('Your chin and jawline start to clear. Less concealer, fewer days you want to hide your face.');
  if (clothesWeek === 3) week3.push(clothesLine);
  if (sleepSign) week3.push('You fall asleep easily and wake up fresh, not drained before the day begins.');
  if (week3.length === 0) week3.push('Stairs stop leaving you out of breath. The walk you dreaded is now the easy part.');
  const week3Title = has('p_acne') ? 'Your skin starts to clear' : clothesWeek === 3 ? 'Your clothes stop fighting you' : sleepSign ? 'You wake up fresh' : 'Your stamina is back';

  // Week 4: the end of the first month, and the last stop shown outright.
  const clothesByWeek4 = clothesWeek !== undefined && clothesWeek <= 4;
  const week4: string[] = [];
  if (clothesWeek === 4) week4.push(clothesLine);
  if (clothesByWeek4) week4.push('No more loose clothes to cover up. No more standing at the back in photos.');
  week4.push(noticedByWeek4 ? 'The first person asks what you have been doing.' : 'You catch your reflection and, for once, you like it.');
  if (week4.length < 2) week4.push('One month in, none of this takes willpower.');

  // Week 8: what other people can see.
  const week8: string[] = [];
  if (clothesWeek === 8) week8.push(clothesLine);
  if (cycleLineFrom(8)) week8.push(cycleLine);
  if (losing && week8.length < 2) week8.push('The relatives who always had a comment now ask what you are eating.');
  if (week8.length === 0) week8.push('The habits hold on busy days too.');

  // Week 12: how she lives now. No target and no weight.
  const week12: string[] = [];
  if (clothesWeek === 12) week12.push(clothesLine);
  if (!cycleLineFrom(8) && cycleLineFrom(12)) week12.push(cycleLine);
  if (has('i_patches')) week12.push('The dark patches on your neck and underarms can start to fade as your insulin settles.');
  if (losing) {
    week12.push('You buy the outfit you like, not the one that hides the most.');
    week12.push('Weddings and functions stop being something to dread.');
  }
  week12.push('You are not on a diet. This is simply how you eat now.');

  return [
    { week: 1, title: week1Title, lines: week1.slice(0, 2) },
    { week: 2, title: week2Title, lines: week2.slice(0, 2) },
    { week: 3, title: week3Title, lines: week3.slice(0, 2) },
    { week: 4, title: clothesByWeek4 ? 'You stop hiding' : 'You feel like yourself again', lines: week4.slice(0, 2) },
    { week: 8, title: losing ? 'The comments change' : 'The habits hold', lines: week8.slice(0, 2) },
    { week: 12, title: losing ? 'You dress to be seen' : 'It is simply how you eat', lines: week12.slice(0, 2) },
  ];
}

export const JOURNEY_FOOTNOTE = 'What many women notice on a plan like this. Every body moves at its own pace.';
