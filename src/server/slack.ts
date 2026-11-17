import { randomUUID } from 'node:crypto';
import { TIERS } from '@/domain/offer';
import { getStore, type PaidOrderSummary, type Store } from './store';

export const rupees = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function orderAlertText(order: PaidOrderSummary): string {
  return [
    '*Fitovela · Payment received*',
    `${rupees(order.amountRupees)} · ${TIERS[order.tier].name} · ${order.provider}`,
    `Order: \`${order.id}\``,
    `Paid: ${new Date(order.paidAt!).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })} IST`,
    'Plan unlocked. This alert does not confirm email delivery.',
  ].join('\n');
}

/** Atomic claim protects concurrent callbacks. An ambiguous network result is
 * deliberately NOT retried automatically: incoming webhooks have no dedupe key. */
export async function deliverSlack(id: string, webhook: string, text: string, storeOverride?: Store): Promise<'sent' | 'skipped' | 'failed' | 'uncertain'> {
  const store = storeOverride ?? await getStore();
  const url = new URL(webhook);
  if (url.protocol !== 'https:' || url.hostname !== 'hooks.slack.com' || !url.pathname.startsWith('/services/')) throw new Error('Invalid Slack webhook host');
  const attempt = randomUUID();
  if (!(await store.claimDelivery(id, attempt, new Date().toISOString()))) return 'skipped';
  let state: 'sent' | 'failed' | 'uncertain' = 'uncertain';
  try {
    const response = await fetch(webhook, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, unfurl_links: false, unfurl_media: false }),
      signal: AbortSignal.timeout(6_000), redirect: 'error',
    });
    const body = await response.text();
    state = response.ok && body.trim() === 'ok' ? 'sent' : response.status >= 500 ? 'uncertain' : 'failed';
  } catch {
    // Never log the exception: network errors can include the secret webhook URL.
    state = 'uncertain';
  }
  await store.finishDelivery(id, attempt, state, new Date().toISOString());
  return state;
}

export async function notifyPaidOrder(order: PaidOrderSummary): Promise<void> {
  const webhook = process.env.SLACK_ORDER_WEBHOOK_URL;
  if (!webhook || order.provider === 'demo' || order.status !== 'paid' || !order.paidAt) return;
  if (process.env.ORDER_ALERTS_START_AT && order.paidAt < process.env.ORDER_ALERTS_START_AT) return;
  // No customer contact details, symptoms, track, result, or bearer plan URL.
  try {
    const result = await deliverSlack(`order-${order.id}`, webhook, orderAlertText(order));
    if (result === 'failed' || result === 'uncertain') console.error(`slack order delivery ${result}: ${order.id}`);
  } catch {
    console.error(`slack order delivery failed: ${order.id}`);
  }
}

export async function retryOrderAlerts(): Promise<number> {
  const store = await getStore();
  // Outbox entries are committed atomically with the paid snapshot. A small
  // pending-only batch avoids repeatedly reading every customer's meal plan.
  const orders = await store.listPendingOrderAlerts();
  for (const order of orders) await notifyPaidOrder(order);
  return orders.length;
}
