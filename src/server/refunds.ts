import { createHash } from 'node:crypto';
import { fromCashfreeOrderId } from './payments';
import type { Order } from './store';
import type { RefundRecord } from './store/types';

/** Called only after signature verification. Auto-refunds for extra/failed
 * attempts are excluded: they did not contribute to our paid-order revenue. */
export function cashfreeRefundRecord(value: unknown, order: Order): RefundRecord | null {
  const r = value as Record<string, unknown> | null;
  if (!r || r.refund_status !== 'SUCCESS' || r.refund_type === 'PAYMENT_AUTO_REFUND') return null;
  if (order.provider !== 'cashfree' || order.status !== 'paid' || fromCashfreeOrderId(r.order_id) !== order.id) throw new Error('Refund order mismatch');
  if (!order.providerPaymentId || String(r.cf_payment_id) !== order.providerPaymentId) throw new Error('Refund payment mismatch');
  const amount = Number(r.refund_amount);
  if (r.refund_currency !== 'INR' || !Number.isFinite(amount) || amount <= 0 || amount > order.amountRupees) throw new Error('Invalid refund amount');
  if (!r.cf_refund_id || typeof r.processed_at !== 'string' || !Number.isFinite(Date.parse(r.processed_at))) throw new Error('Incomplete refund');
  return {
    id: createHash('sha256').update(`cashfree:${r.cf_refund_id}`).digest('hex'),
    orderId: order.id, amountRupees: amount, processedAt: new Date(r.processed_at).toISOString(),
  };
}
