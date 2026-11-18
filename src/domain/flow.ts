// Which screen comes next. The list is rebuilt after every answer, so follow-up
// questions appear and irrelevant ones disappear based on what she said.

import { QUESTIONS, type Question } from './questions';
import type { Answers } from './types';

export type Step =
  | { kind: 'question'; key: string; question: Question }
  | { kind: 'scan'; key: 'scan' }
  | { kind: 'finding'; key: 'finding' };

/** Interstitial screens and the question they follow. */
const AFTER: Record<string, Step> = {
  hormone_signs: { kind: 'scan', key: 'scan' },
  family: { kind: 'finding', key: 'finding' },
};

function isAnswered(a: Answers, id: string): boolean {
  const v = a[id];
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** undefined = cannot tell yet, because the answers it depends on are missing. */
function decided(q: Question, a: Answers): boolean | undefined {
  if (!q.showIf) return true;
  const deps = q.dependsOn ?? [];
  if (!deps.every((d) => isAnswered(a, d))) return undefined;
  return q.showIf(a);
}

export function buildSteps(answers: Answers): Step[] {
  const steps: Step[] = [];
  for (const q of QUESTIONS) {
    if (decided(q, answers) !== true) continue;
    steps.push({ kind: 'question', key: q.id, question: q });
    const after = AFTER[q.id];
    if (after) steps.push(after);
  }
  return steps;
}

/** Where the back button goes from `key`, or null for "leave the assessment". The scan screen moves
 * on by itself, so stopping on it would send her straight forward again: back steps over it. */
export function stepBefore(steps: Step[], key: string | null): string | null {
  let i = steps.findIndex((s) => s.key === key) - 1;
  while (i >= 0 && steps[i].kind === 'scan') i -= 1;
  return i >= 0 ? steps[i].key : null;
}

export function questionSteps(answers: Answers): Question[] {
  return buildSteps(answers).flatMap((s) => (s.kind === 'question' ? [s.question] : []));
}

/** Counts used on the "reading your answers" screen. Both are true statements about this session. */
export function adaptation(answers: Answers): { skipped: number; added: number } {
  let skipped = 0;
  let added = 0;
  for (const q of QUESTIONS) {
    if (!q.showIf) continue;
    const d = decided(q, answers);
    if (d === false) skipped += 1;
    if (d === true) added += 1;
  }
  return { skipped, added };
}

export function isComplete(answers: Answers): boolean {
  return questionSteps(answers).every((q) => isAnswered(answers, q.id));
}

export function firstUnanswered(answers: Answers): string | null {
  const q = questionSteps(answers).find((x) => !isAnswered(answers, x.id));
  return q ? q.id : null;
}
