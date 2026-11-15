// Copy shown for each result type. DRAFT wording by an AI agent, pending the
// doctor's review. Every result is worded as "your symptoms match" (her answer 1A).

import type { TypeId } from './typing';

export interface TypeContent {
  /** Main part of the name, e.g. "Insulin-resistant". */
  name: string;
  /** Accent part, e.g. "PCOS type". */
  accent: string;
  /** Used in sentences: "the diet for insulin-resistant PCOS". */
  plain: string;
  summary: string;
  means: [string, string, string];
  planChanges: [string, string, string];
}

export const TYPE_CONTENT: Record<TypeId, TypeContent> = {
  pcos_insulin: {
    name: 'Insulin-resistant',
    accent: 'PCOS type',
    plain: 'insulin-resistant PCOS',
    summary: 'A common reason weight stays stuck with PCOS. High insulin tells your body to store fat, mostly around the belly, and makes you crave sugar soon after eating.',
    means: [
      'Carb-heavy meals can spike your insulin, then crash your energy by late afternoon.',
      'High insulin pushes fat to the belly and can disturb your cycle.',
      'Eating less will not move it. What you eat, and in what order, will.',
    ],
    planChanges: [
      'Slow-digesting swaps for rice and roti, not a ban on them',
      'Protein at every meal to soften the sugar spike',
      'Five regular meals so you are never running on empty',
    ],
  },
  pcos_inflammatory: {
    name: 'Inflammatory',
    accent: 'PCOS type',
    plain: 'inflammatory PCOS',
    summary: 'Your PCOS signs come with signs of ongoing inflammation: bloating, aches or skin flare-ups. Inflammation can keep hormones unsettled and make weight harder to shift.',
    means: [
      'Bloating and puffiness can hide progress on the scale and make you feel heavier than you are.',
      'Some everyday foods may be feeding the flare-ups without you noticing.',
      'Cutting calories alone rarely calms this. Changing what is on the plate can.',
    ],
    planChanges: [
      'More turmeric, ginger, greens and millets through the week',
      'A lighter first week on the foods you flagged, so you can see what changes',
      'Protein at every meal, with no food group banned',
    ],
  },
  pcos_postpill: {
    name: 'Post-pill',
    accent: 'PCOS type',
    plain: 'post-pill PCOS',
    summary: 'Your signs started or got worse after stopping the pill. Cycles and skin can take months to settle afterwards, and weight often creeps up in the meantime.',
    means: [
      'This pattern often settles with time, and steady food habits help it along.',
      'Skipping meals or crash dieting now tends to make cycles more irregular.',
      'Your body needs regular, well-built meals more than it needs fewer calories.',
    ],
    planChanges: [
      'Regular meal times with protein at every meal',
      'Plenty of dals, greens, nuts and seeds through the week',
      'No crash targets: a steady pace your body can keep',
    ],
  },
  pcos_adrenal: {
    name: 'Adrenal',
    accent: 'PCOS type',
    plain: 'adrenal PCOS',
    summary: 'Your PCOS signs show up with high stress and poor sleep, without strong insulin signs. Stress hormones can drive cravings and belly weight on their own.',
    means: [
      'Short sleep makes the next day hungrier and cravings louder.',
      'Long gaps between meals add to the stress load your body is already carrying.',
      'Harder dieting adds more stress. A calmer, regular plan works better here.',
    ],
    planChanges: [
      'Breakfast within an hour of waking, and no long gaps',
      'A lighter, earlier dinner to help your sleep',
      'Steady-energy snacks in place of tea-and-biscuit breaks',
    ],
  },
  insulin: {
    name: 'Insulin-resistance',
    accent: 'type',
    plain: 'insulin resistance',
    summary: 'Your answers match an insulin-resistance pattern: cravings after meals, energy dips and weight around the belly. High insulin tells your body to store, not burn.',
    means: [
      'Carb-heavy meals can spike your insulin, then crash your energy a few hours later.',
      'The cravings are your blood sugar talking, not a lack of willpower.',
      'Eating less will not move it. What you eat, and in what order, will.',
    ],
    planChanges: [
      'Slow-digesting swaps for rice and roti, not a ban on them',
      'Protein at every meal to soften the sugar spike',
      'Five regular meals so you are never running on empty',
    ],
  },
  thyroid: {
    name: 'Slow-thyroid',
    accent: 'type',
    plain: 'a slow thyroid',
    summary: 'Your answers match a slow-thyroid pattern: feeling cold, tired, constipated, with hair fall. A sluggish thyroid lowers the energy you burn at rest, so the usual diet maths stops working.',
    means: [
      'You may burn less at rest than a calculator expects, so strict diets stall quickly.',
      'Low energy makes it hard to move more, which slows things further.',
      'Under-eating can slow you down even more. Enough food, well chosen, is the way through.',
    ],
    planChanges: [
      'Calories set at your real resting need, never below it',
      'Curd, dals, nuts and seeds through the week, with fish or eggs if you eat them',
      'Fibre and fluids at every meal to keep digestion moving',
    ],
  },
  inflammation: {
    name: 'Inflammation',
    accent: 'type',
    plain: 'inflammation',
    summary: 'Your answers match an inflammation pattern: bloating, aches, puffiness or skin flare-ups. Ongoing inflammation can make the body hold water and resist weight loss.',
    means: [
      'Bloating and puffiness can hide progress on the scale and make you feel heavier than you are.',
      'Some everyday foods may be feeding the flare-ups without you noticing.',
      'Cutting calories alone rarely calms this. Changing what is on the plate can.',
    ],
    planChanges: [
      'More turmeric, ginger, greens and millets through the week',
      'A lighter first week on the foods you flagged, so you can see what changes',
      'Protein at every meal, with no food group banned',
    ],
  },
  routine: {
    name: 'Routine-led',
    accent: 'type',
    plain: 'a routine-led pattern',
    summary: 'We did not find a strong hormonal pattern in your answers. That is good news: your weight is more likely driven by meal timing, portions and routine, which respond fastest to a plan.',
    means: [
      'Long gaps and a heavy dinner can add up without any single meal looking wrong.',
      'Portions drift upward when meals are not planned ahead.',
      'A simple, repeatable week of meals usually works better than a strict diet.',
    ],
    planChanges: [
      'A fixed rhythm of five meals, planned for the whole week',
      'Portions in katoris and roti counts, so there is no guessing',
      'Protein at every meal to keep you full for longer',
    ],
  },
};

/** Tests to ask her own doctor about (doctor's answer 9B). */
export const SUGGESTED_TESTS = ['Fasting insulin', 'HbA1c', 'Pelvic ultrasound', 'TSH', 'Lipid profile'];
