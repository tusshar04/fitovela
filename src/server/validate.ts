// Everything from the browser is checked against the question definitions before it is stored.

import { QUESTION_BY_ID } from '@/domain/questions';
import type { AgeBand, Answers, AnswerValue, Category, Hook, Metrics } from '@/domain/types';

const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10) / 10;
};

export function sanitizeMetrics(v: unknown): Metrics | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const age = num(o.age, 13, 90);
  const heightCm = num(o.heightCm, 120, 215);
  const weightKg = num(o.weightKg, 30, 250);
  const goalKg = num(o.goalKg, 30, 250);
  if (age === null || heightCm === null || weightKg === null || goalKg === null) return null;
  return { age: Math.round(age), heightCm, weightKg, goalKg };
}

/** Keeps only known questions and known option ids. Unknown input is dropped, never stored. */
export function sanitizeAnswers(input: unknown): Answers {
  const out: Answers = {};
  if (typeof input !== 'object' || input === null) return out;
  for (const [id, raw] of Object.entries(input as Record<string, unknown>)) {
    const q = QUESTION_BY_ID[id];
    if (!q) continue;
    let value: AnswerValue | null = null;
    if (q.kind === 'metrics') {
      value = sanitizeMetrics(raw);
    } else if (q.kind === 'single') {
      if (typeof raw === 'string' && q.options?.some((o) => o.id === raw)) value = raw;
    } else {
      const valid = new Set(q.options?.map((o) => o.id));
      let list = Array.isArray(raw) ? [...new Set(raw.filter((x): x is string => typeof x === 'string' && valid.has(x)))] : [];
      const exclusive = q.options?.filter((o) => o.exclusive).map((o) => o.id) ?? [];
      const picked = list.find((x) => exclusive.includes(x));
      if (picked) list = [picked];
      if (q.max) list = list.slice(0, q.max);
      if (list.length > 0) value = list;
    }
    if (value !== null) out[id] = value;
  }
  return out;
}

export function isAgeBand(v: unknown): v is AgeBand {
  return v === '18-29' || v === '30-39' || v === '40-49' || v === '50+';
}

export function asHook(v: unknown): Hook {
  return v === 'b' || v === 'c' ? v : 'a';
}

export function asCategory(v: unknown): Category {
  return v === 'thyroid' || v === 'menopause' || v === 'diabetes' || v === 'weightloss' ? v : 'pcos';
}

export function cleanEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

/** Indian mobile number: ten digits starting 6 to 9. Returned without the country code. */
export function cleanPhone(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const digits = v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

const AD_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

export function sanitizeAd(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof v !== 'object' || v === null) return out;
  for (const k of AD_KEYS) {
    const val = (v as Record<string, unknown>)[k];
    if (typeof val === 'string' && val.length > 0) out[k] = val.slice(0, 300);
  }
  return out;
}
