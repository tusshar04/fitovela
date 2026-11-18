// The questionnaire. DRAFT content by an AI agent: the question list and which
// answer counts as a "sign" in which area must be approved by the doctor
// (her answer 12A). See docs/MEDICAL_RULES.md.

import type { Answers, Area } from './types';
import { asList, isMetrics } from './types';

export type SectionId = 'hormones' | 'insulin' | 'inflammation' | 'thyroid' | 'body' | 'food';

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'hormones', label: 'Hormones' },
  { id: 'insulin', label: 'Insulin' },
  { id: 'inflammation', label: 'Inflammation' },
  { id: 'thyroid', label: 'Thyroid' },
  { id: 'body', label: 'Body' },
  { id: 'food', label: 'Food' },
];

/** A marker is one sign that counts once towards one area (or towards stress). */
export const MARKERS = {
  p_cycle: { area: 'pcos', label: 'Late or skipped periods' },
  p_acne: { area: 'pcos', label: 'Acne on the chin or jawline' },
  p_facial_hair: { area: 'pcos', label: 'Extra hair on the face or body' },
  p_hair_thin: { area: 'pcos', label: 'Hair thinning on the scalp' },
  p_diagnosed: { area: 'pcos', label: 'Told by a doctor you have PCOS or PCOD' },

  i_cravings: { area: 'insulin', label: 'Sugar cravings after meals' },
  i_hungry: { area: 'insulin', label: 'Hungry again within two hours' },
  i_belly: { area: 'insulin', label: 'Weight mostly on the belly' },
  i_patches: { area: 'insulin', label: 'Dark patches on the neck or underarms' },
  i_crash: { area: 'insulin', label: 'Sleepy after lunch' },
  i_family: { area: 'insulin', label: 'Type 2 diabetes in the family' },
  i_spike: { area: 'insulin', label: 'Cravings within an hour of eating' },

  f_bloat: { area: 'inflammation', label: 'Bloating most days' },
  f_joint: { area: 'inflammation', label: 'Joint pain or stiffness' },
  f_skin: { area: 'inflammation', label: 'Skin flare-ups' },
  f_headache: { area: 'inflammation', label: 'Frequent headaches' },
  f_puffy: { area: 'inflammation', label: 'Puffy face or fingers in the morning' },

  t_cold: { area: 'thyroid', label: 'Feeling cold when others do not' },
  t_constipation: { area: 'thyroid', label: 'Constipation' },
  t_dry: { area: 'thyroid', label: 'Dry skin or brittle nails' },
  t_hairfall: { area: 'thyroid', label: 'Hair fall all over' },
  t_tired: { area: 'thyroid', label: 'Tired even after a full night of sleep' },
  t_diagnosed: { area: 'thyroid', label: 'A diagnosed thyroid problem' },

  s_sleep: { area: 'stress', label: 'Under six hours of sleep' },
  s_wired: { area: 'stress', label: 'Tired but wired at night' },
  s_stress: { area: 'stress', label: 'High stress most days' },
  s_wake: { area: 'stress', label: 'Waking up tired' },
} as const satisfies Record<string, { area: Area | 'stress'; label: string }>;

export type MarkerId = keyof typeof MARKERS;

export interface Option {
  id: string;
  label: string;
  marker?: MarkerId;
  /** Selecting this clears the others (for "None of these"). */
  exclusive?: boolean;
}

export interface Noted {
  effect: string;
  insight: string;
}

export interface Question {
  id: string;
  section: SectionId;
  kind: 'single' | 'multi' | 'metrics' | 'cuisine';
  eyebrow?: string;
  title: string;
  /** Second half of the headline, shown in the italic accent face. */
  accent: string;
  help?: string;
  options?: Option[];
  max?: number;
  /** Conditional questions: shown only when this returns true. */
  showIf?: (a: Answers) => boolean;
  /** Answers this condition depends on; used to tell "not decided yet" from "skipped". */
  dependsOn?: string[];
  /** "Because you said: …" line above a follow-up. */
  because?: (a: Answers) => string | null;
  /** Feedback card shown once an option is chosen (single-choice follow-ups). */
  noted?: Record<string, Noted>;
}

const NONE: Option = { id: 'none', label: 'None of these', exclusive: true };

const has = (a: Answers, q: string, opt: string) => asList(a[q]).includes(opt);

export const QUESTIONS: Question[] = [
  {
    id: 'struggle',
    section: 'hormones',
    kind: 'single',
    eyebrow: 'FIRST, ABOUT YOU',
    title: 'What frustrates you most',
    accent: 'about your weight?',
    options: [
      { id: 'eat_little', label: 'I eat little and still gain' },
      { id: 'comes_back', label: 'I lose it, then it comes back' },
      { id: 'cravings', label: 'Cravings beat me every time' },
      { id: 'no_time', label: 'No time or energy to diet' },
    ],
  },
  {
    id: 'cycle',
    section: 'hormones',
    kind: 'single',
    eyebrow: 'PART 1 · HORMONE SIGNS',
    title: 'How are',
    accent: 'your periods?',
    options: [
      { id: 'regular', label: 'Regular, every 21 to 35 days' },
      { id: 'late', label: 'Often late, more than 35 days apart', marker: 'p_cycle' },
      { id: 'skip', label: 'I skip months', marker: 'p_cycle' },
      { id: 'stopped', label: 'They have stopped (menopause or surgery)' },
      { id: 'unsure', label: 'Not sure' },
    ],
  },
  {
    id: 'hormone_signs',
    section: 'hormones',
    kind: 'multi',
    eyebrow: 'PART 1 · HORMONE SIGNS',
    title: 'Which of these',
    accent: 'sound like you?',
    help: 'Choose all that apply',
    options: [
      { id: 'acne', label: 'Acne on the chin or jawline', marker: 'p_acne' },
      { id: 'facial_hair', label: 'Extra hair on the face or body', marker: 'p_facial_hair' },
      { id: 'hair_thin', label: 'Hair thinning on the scalp', marker: 'p_hair_thin' },
      { id: 'diagnosed', label: 'A doctor has told me I have PCOS or PCOD', marker: 'p_diagnosed' },
      NONE,
    ],
  },
  {
    id: 'meno',
    section: 'hormones',
    kind: 'multi',
    eyebrow: 'PART 1 · HORMONE SIGNS',
    title: 'Since your periods changed,',
    accent: 'what do you notice?',
    help: 'Choose all that apply',
    dependsOn: ['cycle'],
    showIf: (a) => a.cycle === 'stopped',
    because: () => 'Because your periods have stopped',
    options: [
      { id: 'flushes', label: 'Hot flushes or night sweats' },
      { id: 'waist', label: 'New weight around the waist' },
      { id: 'sleep', label: 'Broken sleep' },
      { id: 'mood', label: 'Mood swings' },
      NONE,
    ],
  },
  {
    id: 'insulin_signs',
    section: 'insulin',
    kind: 'multi',
    eyebrow: 'PART 2 · INSULIN SIGNS',
    title: 'Around food and energy,',
    accent: 'what is true for you?',
    help: 'Choose all that apply',
    options: [
      { id: 'cravings', label: 'Sugar cravings after meals', marker: 'i_cravings' },
      { id: 'hungry', label: 'Hungry again within two hours', marker: 'i_hungry' },
      { id: 'belly', label: 'Weight sits mostly on my belly', marker: 'i_belly' },
      { id: 'patches', label: 'Dark patches on neck or underarms', marker: 'i_patches' },
      { id: 'crash', label: 'Sleepy after lunch', marker: 'i_crash' },
      NONE,
    ],
  },
  {
    id: 'cravings_time',
    section: 'insulin',
    kind: 'single',
    eyebrow: 'PART 2 · INSULIN SIGNS',
    title: 'When do the cravings',
    accent: 'hit hardest?',
    dependsOn: ['insulin_signs'],
    showIf: (a) => has(a, 'insulin_signs', 'cravings'),
    because: () => 'Because you said: sugar cravings after meals',
    options: [
      { id: 'within_hour', label: 'Within an hour of eating', marker: 'i_spike' },
      { id: 'afternoon', label: 'Around 4 to 5 pm' },
      { id: 'night', label: 'Late at night' },
      { id: 'all_day', label: 'They come and go all day' },
    ],
    noted: {
      within_hour: { effect: 'Insulin score updated', insight: 'Cravings soon after a meal often follow a sharp rise in insulin. This is one of the clearest signs we look for.' },
      afternoon: { effect: 'Added to your lunch plan', insight: 'A late-afternoon dip often follows a carb-heavy lunch. Your plan will change what goes on that plate.' },
      night: { effect: 'Added to your meal timings', insight: 'Night cravings often go with short sleep and long gaps between meals. Your plan will set your dinner time.' },
      all_day: { effect: 'Added to your protein target', insight: 'All-day cravings can mean meals are light on protein. Your plan will add it to every meal.' },
    },
  },
  {
    id: 'family',
    section: 'insulin',
    kind: 'single',
    eyebrow: 'PART 2 · INSULIN SIGNS',
    title: 'Does a parent, brother or sister',
    accent: 'have type 2 diabetes?',
    options: [
      { id: 'yes', label: 'Yes', marker: 'i_family' },
      { id: 'no', label: 'No' },
      { id: 'unsure', label: 'Not sure' },
    ],
  },
  {
    id: 'inflam_signs',
    section: 'inflammation',
    kind: 'multi',
    eyebrow: 'PART 3 · INFLAMMATION SIGNS',
    title: 'In a normal week,',
    accent: 'do you get any of these?',
    help: 'Choose all that apply',
    options: [
      { id: 'bloat', label: 'Bloating most days', marker: 'f_bloat' },
      { id: 'joint', label: 'Joint pain or stiffness', marker: 'f_joint' },
      { id: 'skin', label: 'Skin flare-ups or rashes', marker: 'f_skin' },
      { id: 'headache', label: 'Frequent headaches', marker: 'f_headache' },
      { id: 'puffy', label: 'Puffy face or fingers in the morning', marker: 'f_puffy' },
      NONE,
    ],
  },
  {
    id: 'bloat_when',
    section: 'inflammation',
    kind: 'single',
    eyebrow: 'PART 3 · INFLAMMATION SIGNS',
    title: 'When does the bloating',
    accent: 'show up?',
    dependsOn: ['inflam_signs'],
    showIf: (a) => has(a, 'inflam_signs', 'bloat'),
    because: () => 'Because you said: bloating most days',
    options: [
      { id: 'wheat', label: 'After roti or other wheat' },
      { id: 'dairy', label: 'After milk, curd or paneer' },
      { id: 'most_meals', label: 'After most meals' },
      { id: 'evening', label: 'Mostly in the evening' },
    ],
    noted: {
      wheat: { effect: 'Added to your first week', insight: 'Your first week will go lighter on wheat so you can see whether it makes a difference.' },
      dairy: { effect: 'Added to your first week', insight: 'Your first week will go lighter on dairy so you can see whether it makes a difference.' },
      most_meals: { effect: 'Added to your portions', insight: 'Bloating after most meals often eases with smaller, more regular plates. Your plan is spread across five meals.' },
      evening: { effect: 'Added to your dinner plan', insight: 'Evening bloating often follows a long gap and a heavy dinner. Your plan keeps dinner earlier and lighter.' },
    },
  },
  {
    id: 'thyroid_signs',
    section: 'thyroid',
    kind: 'multi',
    eyebrow: 'PART 4 · THYROID SIGNS',
    title: 'And how about',
    accent: 'these?',
    help: 'Choose all that apply',
    options: [
      { id: 'cold', label: 'I feel cold when others do not', marker: 't_cold' },
      { id: 'constipation', label: 'Constipation', marker: 't_constipation' },
      { id: 'dry', label: 'Dry skin or brittle nails', marker: 't_dry' },
      { id: 'hairfall', label: 'Hair fall all over', marker: 't_hairfall' },
      { id: 'tired', label: 'Tired even after a full night of sleep', marker: 't_tired' },
      NONE,
    ],
  },
  {
    id: 'thyroid_dx',
    section: 'thyroid',
    kind: 'single',
    eyebrow: 'PART 4 · THYROID SIGNS',
    title: 'Has a doctor found',
    accent: 'a thyroid problem?',
    options: [
      { id: 'yes_tablets', label: 'Yes, and I take tablets', marker: 't_diagnosed' },
      { id: 'yes_no_tablets', label: 'Yes, but no tablets', marker: 't_diagnosed' },
      { id: 'no', label: 'No, my tests were normal' },
      { id: 'not_tested', label: 'Never tested' },
    ],
  },
  {
    id: 'thyroid_stable',
    section: 'thyroid',
    kind: 'single',
    eyebrow: 'PART 4 · THYROID SIGNS',
    title: 'Has your dose stayed the same',
    accent: 'for six months?',
    dependsOn: ['thyroid_dx'],
    showIf: (a) => a.thyroid_dx === 'yes_tablets',
    because: () => 'Because you take thyroid tablets',
    options: [
      { id: 'yes', label: 'Yes, same dose' },
      { id: 'no', label: 'No, it changed recently' },
      { id: 'unsure', label: 'Not sure' },
    ],
    noted: {
      yes: { effect: 'Noted for your plan', insight: 'A steady dose means food is the lever left to pull. Keep taking your tablet exactly as prescribed.' },
      no: { effect: 'Noted for your plan', insight: 'A recent change means your weight may still be settling. Show your plan to your doctor and keep your tablet as prescribed.' },
      unsure: { effect: 'Noted for your plan', insight: 'Worth asking your doctor at your next visit. Keep taking your tablet exactly as prescribed.' },
    },
  },
  {
    id: 'stress',
    section: 'thyroid',
    kind: 'multi',
    eyebrow: 'PART 4 · ENERGY AND SLEEP',
    title: 'Your sleep and stress,',
    accent: 'honestly?',
    help: 'Choose all that apply',
    options: [
      { id: 'short_sleep', label: 'Under six hours of sleep most nights', marker: 's_sleep' },
      { id: 'wired', label: 'Tired but wired at night', marker: 's_wired' },
      { id: 'stress', label: 'Stress is high most days', marker: 's_stress' },
      { id: 'wake_tired', label: 'I wake up tired', marker: 's_wake' },
      NONE,
    ],
  },
  {
    id: 'metrics',
    section: 'body',
    kind: 'metrics',
    eyebrow: 'PART 5 · YOUR BODY',
    title: 'Your numbers,',
    accent: 'so the maths is yours.',
    help: 'Used for your BMI, your calories and your timeline.',
  },
  {
    id: 'activity',
    section: 'body',
    kind: 'single',
    eyebrow: 'PART 5 · YOUR BODY',
    title: 'How much do you',
    accent: 'move in a day?',
    options: [
      { id: 'sedentary', label: 'Mostly sitting' },
      { id: 'light', label: 'On my feet part of the day' },
      { id: 'moderate', label: 'A walk or exercise 3 to 4 days a week' },
      { id: 'active', label: 'Active most days' },
    ],
  },
  {
    id: 'safety',
    section: 'body',
    kind: 'multi',
    eyebrow: 'PART 5 · A SAFETY CHECK',
    title: 'Do any of these',
    accent: 'apply to you?',
    help: 'So we never give you a plan that is wrong for you.',
    options: [
      { id: 'pregnant', label: 'Pregnant or breastfeeding' },
      { id: 't1d_insulin', label: 'Type 1 diabetes, or I take insulin' },
      { id: 'kidney', label: 'Kidney disease' },
      { id: 'eating_disorder', label: 'An eating disorder, now or in the past' },
      NONE,
    ],
  },
  {
    id: 'meds',
    section: 'body',
    kind: 'multi',
    eyebrow: 'PART 5 · A SAFETY CHECK',
    title: 'Do you take',
    accent: 'any of these?',
    help: 'Choose all that apply',
    options: [
      { id: 'metformin', label: 'Metformin' },
      { id: 'thyroid_tablets', label: 'Thyroid tablets' },
      { id: 'other', label: 'Another prescription medicine' },
      NONE,
    ],
  },
  {
    // Shown only to women who could be offered the intensive plan (BMI 30 and above).
    // Nobody reviews an order, so these answers decide it.
    id: 'strict_check',
    section: 'body',
    kind: 'multi',
    eyebrow: 'PART 5 · A SAFETY CHECK',
    title: 'One last check.',
    accent: 'Any of these?',
    help: 'So we only show you plans that are safe for you.',
    dependsOn: ['metrics'],
    // Rounded to one decimal like bmi() in energy.ts, which the intensive gate uses: 29.96 counts as 30 in both.
    showIf: (a) => isMetrics(a.metrics) && Math.round((a.metrics.weightKg / (a.metrics.heightCm / 100) ** 2) * 10) / 10 >= 30,
    options: [
      { id: 'heart', label: 'Heart disease, or chest pain when I exert myself' },
      { id: 'gallstones', label: 'Gallstones or gallbladder trouble' },
      { id: 'gout', label: 'Gout or high uric acid' },
      { id: 'bp_meds', label: 'I take blood-pressure medicine' },
      NONE,
    ],
  },
  {
    id: 'cuisine',
    section: 'food',
    kind: 'cuisine',
    eyebrow: 'PART 6 · YOUR FOOD',
    title: 'Which kitchen',
    accent: 'feels like home?',
    help: 'Pick up to two. Your plan is built from these dishes.',
    max: 2,
    options: [
      { id: 'south', label: 'South Indian' },
      { id: 'north', label: 'North Indian' },
      { id: 'punjabi', label: 'Punjabi' },
      { id: 'gujarati', label: 'Gujarati' },
      { id: 'bengali', label: 'Bengali' },
      { id: 'odia', label: 'Odia' },
      { id: 'maharashtrian', label: 'Maharashtrian' },
      { id: 'rajasthani', label: 'Rajasthani' },
      { id: 'hyderabadi', label: 'Hyderabadi' },
      { id: 'kerala', label: 'Kerala' },
    ],
  },
  {
    id: 'diet',
    section: 'food',
    kind: 'single',
    eyebrow: 'PART 6 · YOUR FOOD',
    title: 'What do',
    accent: 'you eat?',
    options: [
      { id: 'veg', label: 'Vegetarian' },
      { id: 'egg', label: 'Vegetarian, plus eggs' },
      { id: 'nonveg', label: 'Non-vegetarian' },
    ],
  },
  {
    id: 'avoid',
    section: 'food',
    kind: 'multi',
    eyebrow: 'PART 6 · YOUR FOOD',
    title: 'Anything you',
    accent: 'do not eat?',
    help: 'Choose all that apply',
    options: [
      { id: 'onion_garlic', label: 'Onion and garlic' },
      { id: 'dairy', label: 'Dairy' },
      { id: 'wheat', label: 'Wheat' },
      { id: 'mushroom', label: 'Mushroom' },
      { id: 'brinjal', label: 'Brinjal' },
      { id: 'seafood', label: 'Seafood' },
      { id: 'none', label: 'I eat everything', exclusive: true },
    ],
  },
];

export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

export function optionLabel(questionId: string, optionId: string): string {
  return QUESTION_BY_ID[questionId]?.options?.find((o) => o.id === optionId)?.label ?? optionId;
}
