// Who is not sold a plan (doctor's answer 5A, narrowed on 2026-11-18, D-029), who
// buys with a caution, and who gets the "show this to your doctor" advisory (6A).

import { bmi } from './energy';
import { asList, isMetrics, type Answers } from './types';

/** Still not sold a plan: the plan cuts calories, and for them the cut itself is the risk. */
export type ExclusionId = 'pregnant' | 'under18';

/** Were on the doctor's "do not sell" list until 2026-11-18. They can now buy the standard plan
 * like anyone else, with no extra line about a doctor (the founder's decision), but are never
 * given the intensive (800 to 1,000 kcal) track. */
export type CautionId = 't1d_insulin' | 'kidney' | 'eating_disorder' | 'underweight';

export const EXCLUSION_LABEL: Record<ExclusionId, string> = {
  pregnant: 'you are pregnant or breastfeeding',
  under18: 'you are under 18',
};

export const MEDICATION_ADVISORY = 'Show this plan to your doctor before you start, and do not change the dose of any medicine because of it.';

export interface Eligibility {
  eligible: boolean;
  reasons: ExclusionId[];
  cautions: CautionId[];
  /** True for women on metformin or thyroid tablets: they can buy, with the advisory. A caution alone does not set it. */
  medicationAdvisory: boolean;
}

export function checkEligibility(answers: Answers): Eligibility {
  const reasons: ExclusionId[] = [];
  const cautions: CautionId[] = [];
  const safety = asList(answers.safety);
  if (safety.includes('pregnant')) reasons.push('pregnant');
  for (const id of ['t1d_insulin', 'kidney', 'eating_disorder'] as const) {
    if (safety.includes(id)) cautions.push(id);
  }

  const m = answers.metrics;
  if (isMetrics(m)) {
    if (m.age < 18) reasons.push('under18');
    if (bmi(m) < 18.5) cautions.push('underweight');
  }

  const meds = asList(answers.meds);
  const medicationAdvisory = meds.includes('metformin') || meds.includes('thyroid_tablets') || answers.thyroid_dx === 'yes_tablets';

  return { eligible: reasons.length === 0, reasons, cautions, medicationAdvisory };
}
