import type { Order, PaidOrderSummary } from './types';

export function paidSummary(o: Order): PaidOrderSummary {
  return { id: o.id, sessionId: o.sessionId, tier: o.tier, amountRupees: o.amountRupees, status: o.status, provider: o.provider, paidAt: o.paidAt, createdAt: o.createdAt };
}
