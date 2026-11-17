import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { fileStore } from '@/server/store/fileStore';
import type { Order, Session } from '@/server/store';

const calls = vi.hoisted(() => ({ email: vi.fn(), slack: vi.fn() }));
vi.mock('@/server/email', () => ({ sendEmail: calls.email }));
vi.mock('@/server/slack', () => ({ notifyPaidOrder: calls.slack }));
vi.mock('@/server/session', () => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/server/plans', () => ({ buildPlan: () => ({ days: [] }) }));
vi.mock('@/domain/assessment', () => ({ buildAssessment: () => ({ eligibility: { eligible: true }, intensive: { blocks: [] }, metrics: { weightKg: 70 } }) }));
import { fulfilOrder } from '@/server/fulfil';

describe('customer delivery precedes operator notification', () => {
  it('attempts the customer email before waiting for a slow Slack request', async () => {
    const id = `test-${randomUUID()}`, sequence: string[] = [];
    const order: Order = { id, sessionId: 'synthetic', tier: 'w1', amountRupees: 199, status: 'created', provider: 'cashfree', email: 'synthetic@example.test', phone: '9000000000', createdAt: new Date().toISOString(), planToken: 'synthetic-private' };
    const session = { id: 'synthetic', answers: {} } as Session;
    let finishSlack!: () => void;
    calls.email.mockImplementation(async () => { sequence.push('email'); return { delivered: true }; });
    calls.slack.mockImplementation(() => { sequence.push('slack'); return new Promise<void>(resolve => { finishSlack = resolve; }); });
    await fileStore.saveOrder(order);
    try {
      const pending = fulfilOrder(order, session, 'https://fitovela.test', 'payment-test');
      await vi.waitFor(() => expect(calls.slack).toHaveBeenCalled());
      expect(sequence).toEqual(['email', 'slack']);
      expect((await fileStore.getOrder(id))?.status).toBe('paid');
      finishSlack();
      expect((await pending).ok).toBe(true);
    } finally {
      finishSlack?.();
      await fs.rm(`.data/orders/${id}.json`, { force: true });
      await fs.rm(`.data/deliveries/order-${id}.json`, { force: true });
    }
  });
});
