// Who is not sold a plan automatically (doctor's answer 5A) and who gets the
// medication advisory (6A).

import { bmi } from './energy';
import { asList, isMetrics, type Answers } from './types';

export type ExclusionId = 'pregnant' | 'under18' | 't1d_insulin' | 'kidney' | 'eating_disorder' | 'underweight';

export const EXCLUSION_LABEL: Record<ExclusionId, string> = {
  pregnant: 'you are pregnant or breastfeeding',
  under18: 'you are under 18',
  t1d_insulin: 'you have type 1 diabetes or take insulin',
  kidney: 'you have kidney disease',
  eating_disorder: 'you have a history of an eating disorder',
  underweight: 'your BMI is below 18.5',
};

export const MEDICATION_ADVISORY = 'Show this plan to your doctor before you start, and do not change the dose of any medicine because of it.';

export interface Eligibility {
  eligible: boolean;
  reasons: ExclusionId[];
  /** True for women on metformin or thyroid tablets: they can buy, with the advisory. */
  medicationAdvisory: boolean;
}

export function checkEligibility(answers: Answers): Eligibility {
  const reasons: ExclusionId[] = [];
  const safety = asList(answers.safety);
  for (const id of ['pregnant', 't1d_insulin', 'kidney', 'eating_disorder'] as const) {
    if (safety.includes(id)) reasons.push(id);
  }

  const m = answers.metrics;
  if (isMetrics(m)) {
    if (m.age < 18) reasons.push('under18');
    if (bmi(m) < 18.5) reasons.push('underweight');
  }

  const meds = asList(answers.meds);
  const medicationAdvisory = meds.includes('metformin') || meds.includes('thyroid_tablets') || answers.thyroid_dx === 'yes_tablets';

  return { eligible: reasons.length === 0, reasons, medicationAdvisory };
}
