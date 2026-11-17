import { createHash } from 'node:crypto';
import type { MetaDelivery } from '@/domain/meta';
import { validConsent } from '@/domain/meta';
import type { Order, Store } from './store/types';
import { getStore } from './store';

export const metaEventId = (orderId: string) => `purchase-${createHash('sha256').update(orderId).digest('hex').slice(0, 32)}`;

export function metaEnabled(): boolean {
  return process.env.META_EVENTS_ENABLED === '1' && /^\d+$/.test(process.env.META_PIXEL_ID ?? '') && Boolean(process.env.META_MARKETING_ACCESS_TOKEN);
}

/** Called inside the first paid-order commit. Old orders, demos and nonconsenting buyers are excluded. */
export function purchaseDelivery(order: Order): MetaDelivery | null {
  const a = order.adAttribution;
  if (!metaEnabled() || order.status !== 'paid' || order.provider !== 'cashfree' || !order.paidAt || !a || !a.fbp || !a.userAgent) return null;
  if (!Number.isFinite(order.amountRupees) || order.amountRupees <= 0) return null;
  let source: URL;
  try { source = new URL(a.sourceUrl); } catch { return null; }
  if (source.origin !== (process.env.SITE_URL ?? '').replace(/\/$/, '') || source.pathname !== '/unlock' || source.search || source.hash) return null;
  if (!Number.isFinite(Date.parse(order.paidAt)) || !/^fb\.1\.\d{13}\.\d+$/.test(a.fbp) || !/^[a-f0-9]{32}$/.test(a.consentId)) return null;
  if (a.fbc && !/^fb\.1\.\d{13}\.[A-Za-z0-9_-]{10,500}$/.test(a.fbc)) return null;
  const id = metaEventId(order.id);
  return {
    id, consentId: a.consentId, state: 'pending', attempts: 0, updatedAt: order.paidAt,
    event: {
      event_name: 'Purchase', event_id: id, event_time: Math.floor(Date.parse(order.paidAt) / 1000),
      action_source: 'website', event_source_url: source.href,
      user_data: { fbp: a.fbp, ...(a.fbc ? { fbc: a.fbc } : {}), client_user_agent: a.userAgent },
      custom_data: { value: order.amountRupees, currency: 'INR' },
    },
  };
}

export async function sendMetaPurchase(id: string, store?: Store): Promise<'sent' | 'failed' | 'skipped' | 'stopped'> {
  if (!metaEnabled()) return 'skipped';
  const db = store ?? await getStore();
  const now = new Date().toISOString();
  const item = await db.claimMetaDelivery(id, now);
  if (!item) return 'skipped';
  if (!validConsent(await db.getAdConsent(item.consentId))) {
    await db.finishMetaDelivery(id, item.attempts, 'stopped', new Date().toISOString());
    return 'stopped';
  }
  let state: 'sent' | 'failed' = 'failed';
  try {
    const response = await fetch(`https://graph.facebook.com/v24.0/${process.env.META_PIXEL_ID}/events`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(3000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.META_MARKETING_ACCESS_TOKEN}` },
      body: JSON.stringify({ data: [item.event] }),
    });
    const body = await response.json().catch(() => null) as { events_received?: number; error?: { code?: number; error_subcode?: number } } | null;
    if (response.ok && body?.events_received === 1) state = 'sent';
    else console.error('meta purchase rejected', { status: response.status, code: body?.error?.code, subcode: body?.error?.error_subcode });
  } catch {
    // Never log the request, user identifiers, token or provider error text.
    console.error('meta purchase delivery failed');
  }
  await db.finishMetaDelivery(id, item.attempts, state, new Date().toISOString());
  return state;
}

/** Best effort: an advertising outage must not turn a successful payment into an error. */
export async function notifyMetaPurchase(order: Order): Promise<void> {
  if (!order.adAttribution || !metaEnabled()) return;
  try { await sendMetaPurchase(metaEventId(order.id)); } catch { console.error('meta purchase recovery required'); }
}

export async function retryMetaPurchases(): Promise<number> {
  if (!metaEnabled()) return 0;
  const store = await getStore();
  const items = await store.listPendingMetaDeliveries();
  for (const item of items) await sendMetaPurchase(item.id, store);
  return items.length;
}
