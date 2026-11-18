// Who can pay and what she is given, through the real fulfilment path (D-029).
// Synthetic women only.

import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bmi, energyPlan } from '@/domain/energy';
import { fileStore } from '@/server/store/fileStore';
import type { Order, Session } from '@/server/store';
import type { Answers, Metrics } from '@/domain/types';

vi.mock('@/server/email', () => ({ sendEmail: vi.fn().mockResolvedValue({ delivered: true }) }));
vi.mock('@/server/slack', () => ({ notifyPaidOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/server/session', () => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
import { fulfilOrder } from '@/server/fulfil';

const big: Metrics = { age: 35, heightCm: 160, weightKg: 95, goalKg: 70 };
const usual: Metrics = { age: 29, heightCm: 162, weightKg: 72, goalKg: 64 };
const answers = (metrics: Metrics, extra: Partial<Answers> = {}): Answers => ({
  struggle: 'eat_little', cycle: 'late', hormone_signs: ['acne'], insulin_signs: ['cravings', 'belly'], cravings_time: 'within_hour', family: 'yes',
  inflam_signs: ['none'], thyroid_signs: ['none'], thyroid_dx: 'not_tested', stress: ['none'], metrics, activity: 'sedentary',
  safety: ['none'], meds: ['none'], cuisine: ['north'], diet: 'veg', avoid: ['none'], ...extra,
});

const made: string[] = [];
afterEach(async () => {
  await Promise.all(made.splice(0).flatMap((id) => [fs.rm(`.data/orders/${id}.json`, { force: true }), fs.rm(`.data/deliveries/order-${id}.json`, { force: true })]));
});

async function pay(a: Answers, track?: 'intensive') {
  const id = `test-${randomUUID()}`;
  made.push(id);
  const order: Order = { id, sessionId: 'synthetic', tier: 'w1', amountRupees: 199, status: 'created', provider: 'cashfree', email: 'synthetic@example.test', phone: '9000000000', createdAt: new Date().toISOString(), planToken: `synthetic-${id}`, ...(track ? { track } : {}) };
  await fileStore.saveOrder(order);
  const result = await fulfilOrder(order, { id: 'synthetic', answers: a } as Session, 'https://fitovela.test', 'payment-test');
  return { result, stored: await fileStore.getOrder(id) };
}
const DOCTOR_LINE = /Show this plan to your doctor/;

describe('who can pay (D-029)', () => {
  it.each([
    ['pregnant or breastfeeding', answers(usual, { safety: ['pregnant'] })],
    ['pregnant with a condition', answers(usual, { safety: ['pregnant', 'kidney'] })],
    ['age 17', answers({ ...usual, age: 17 })],
  ])('refuses %s even after a payment', async (_name, a) => {
    const { result, stored } = await pay(a);
    expect(result.ok).toBe(false);
    expect(stored?.status).toBe('created');
    expect(stored?.plan).toBeUndefined();
  });

  it.each([
    ['type 1 diabetes or insulin', answers(usual, { safety: ['t1d_insulin'] })],
    ['kidney disease', answers(usual, { safety: ['kidney'] })],
    ['an eating disorder', answers(usual, { safety: ['eating_disorder'] })],
    ['a BMI under 18.5', answers({ age: 29, heightCm: 162, weightKg: 45, goalKg: 44 })],
  ])('sells the standard plan to a woman with %s, with no doctor line', async (_name, a) => {
    const { result, stored } = await pay(a);
    expect(result.ok).toBe(true);
    expect(stored?.status).toBe('paid');
    expect(stored?.plan?.days.length).toBe(7);
    expect(stored?.plan?.notes.some((n) => DOCTOR_LINE.test(n))).toBe(false);
  });

  it('keeps the doctor line for metformin, with or without a condition', async () => {
    for (const a of [answers(usual, { meds: ['metformin'] }), answers(usual, { meds: ['metformin'], safety: ['kidney'] })]) {
      const { stored } = await pay(a);
      expect(stored?.plan?.notes.some((n) => DOCTOR_LINE.test(n))).toBe(true);
    }
  });

  it('refuses the intensive plan to a woman with a condition, and still gives it to one without', async () => {
    for (const c of ['t1d_insulin', 'kidney', 'eating_disorder']) {
      const { result, stored } = await pay(answers(big, { safety: [c], strict_check: ['none'] }), 'intensive');
      expect(result.ok).toBe(false);
      expect(stored?.status).toBe('created');
    }
    const fine = await pay(answers(big, { strict_check: ['none'] }), 'intensive');
    expect(fine.result.ok).toBe(true);
    expect(fine.stored?.plan?.targetKcal).toBeLessThanOrEqual(1000);
    // The same woman with kidney disease, buying the standard plan, gets 1,200 kcal.
    const standard = await pay(answers(big, { safety: ['kidney'], strict_check: ['none'] }));
    expect(standard.stored?.plan?.targetKcal).toBe(1200);
  });
});

describe('a woman below the healthy range is not made to lose', () => {
  it.each([
    [{ age: 29, heightCm: 162, weightKg: 45, goalKg: 44 }],
    [{ age: 22, heightCm: 160, weightKg: 43.5, goalKg: 40 }],
    [{ age: 45, heightCm: 150, weightKg: 40, goalKg: 40 }],
  ] as [Metrics][])('%o: food covers maintenance and the movement plan', (m) => {
    expect(bmi(m)).toBeLessThan(18.5);
    for (const activity of ['sedentary', 'light', 'moderate', 'active'] as const) {
      const e = energyPlan(m, activity);
      expect(e.toLoseKg).toBe(0);
      expect(e.deficit).toBe(0);
      expect(e.paceKgPerWeek).toBe(0);
      expect(e.goalKg).toBe(m.weightKg);
      expect(e.targetKcal).toBeGreaterThanOrEqual(e.tdee + e.movement.kcalPerDay - 1);
      expect(e.targetKcal).toBeLessThan(e.tdee + e.movement.kcalPerDay + 12);
      expect(energyPlan(m, activity, 'intensive').targetKcal).toBe(e.targetKcal);
    }
  });

  it('a woman in the healthy range with nothing to lose keeps the old rule: maintenance', () => {
    const m = { age: 29, heightCm: 162, weightKg: 55, goalKg: 55 };
    const e = energyPlan(m, 'sedentary');
    expect(e.targetKcal).toBe(Math.max(Math.ceil(e.bmr / 10) * 10, Math.round(e.tdee / 10) * 10));
  });
});
