import { getStore, type PaidOrderSummary } from './store';
import type { RefundRecord } from './store/types';
import { deliverSlack, rupees } from './slack';
import { fetchMetaSpend, type SpendRow } from './metaInsights';

const IST = 330 * 60_000;
const HOUR = 3600_000;
export function reportWindow(now: Date) {
  const endMs = Math.floor((now.getTime() + IST) / HOUR) * HOUR - IST;
  const lastHourStart = endMs - HOUR;
  // At midnight, report the day that just ended, including 23:00–24:00.
  const date = new Date(lastHourStart + IST).toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00+05:30`).toISOString();
  const end = new Date(endMs).toISOString();
  const lastHour = new Date(lastHourStart + IST).getUTCHours();
  return { date, start, end, lastHourStart: new Date(lastHourStart).toISOString(), lastHour, id: `report-${date}-${String(lastHour).padStart(2, '0')}` };
}

export function totals(orders: PaidOrderSummary[], refunds: RefundRecord[], rows: SpendRow[] | null) {
  const gross = orders.reduce((n, o) => n + o.amountRupees, 0);
  const refunded = refunds.reduce((n, r) => n + r.amountRupees, 0);
  const spend = rows === null ? null : rows.reduce((n, r) => n + r.spend, 0);
  return { orders: orders.length, gross, refunded, spend, margin: spend === null ? null : gross - refunded - spend };
}

type Totals = ReturnType<typeof totals>;
function line(label: string, t: Totals) {
  return `*${label}* ${t.orders} paid orders · Revenue ${rupees(t.gross)} · Refunds ${rupees(t.refunded)}\nAd spend ${t.spend === null ? 'unavailable' : rupees(t.spend)} · Revenue after ads/refunds ${t.margin === null ? 'unavailable' : rupees(t.margin)}`;
}
const safe = (text: string) => text.replace(/[<>&`\r\n]/g, ' ').slice(0, 70);

export async function sendHourlyReport(now = new Date()): Promise<'sent' | 'skipped' | 'failed' | 'uncertain'> {
  const webhook = process.env.SLACK_REPORT_WEBHOOK_URL;
  if (!webhook) throw new Error('Report webhook not configured');
  const w = reportWindow(now);
  const store = await getStore();
  const [orders, refunds, uncertain] = await Promise.all([
    store.listPaidOrders(w.start, w.end), store.listRefunds(w.start, w.end), store.listUncertainDeliveries(),
  ]);
  let rows: SpendRow[] | null = null;
  let unavailable = '';
  try { rows = (await fetchMetaSpend(w.date)).filter(r => r.hour <= w.lastHour); }
  catch (err) { unavailable = err instanceof Error && err.message.startsWith('Meta') ? err.message : 'Meta request failed'; }
  const day = totals(orders, refunds, rows);
  const hour = totals(orders.filter(o => o.paidAt! >= w.lastHourStart), refunds.filter(r => r.processedAt >= w.lastHourStart), rows?.filter(r => r.hour === w.lastHour) ?? null);
  const sessions = new Map<string, Awaited<ReturnType<typeof store.getSession>>>();
  for (const order of orders) if (!sessions.has(order.sessionId)) sessions.set(order.sessionId, await store.getSession(order.sessionId));
  const byAd = new Map<string, { name: string; spend: number; orders: number; revenue: number }>();
  for (const r of rows ?? []) {
    const ad = byAd.get(r.adId) ?? { name: r.adName, spend: 0, orders: 0, revenue: 0 };
    ad.spend += r.spend; byAd.set(r.adId, ad);
  }
  let attributed = 0;
  for (const o of orders) {
    const ad = sessions.get(o.sessionId)?.ad;
    const id = ad?.utm_content;
    // Only exact IDs returned for this account; never infer from campaign names
    // or health category. Other/organic sales remain in storefront totals only.
    const row = id ? byAd.get(id) : undefined;
    if (row) { row.orders++; row.revenue += o.amountRupees; attributed++; }
  }
  const message = [
    `*Fitovela · ${w.date} · through ${String(w.lastHour + 1).padStart(2, '0')}:00 IST*`,
    line('Day so far', day),
    line(`Last hour ${String(w.lastHour).padStart(2, '0')}:00–${String(w.lastHour + 1).padStart(2, '0')}:00`, hour),
    ...(rows ? [...byAd.values()].sort((a, b) => b.spend - a.spend).slice(0, 5).map(a => `• ${safe(a.name)}: ads ${rupees(a.spend)} · ${a.orders} attributed orders · CPA ${a.orders ? rupees(a.spend / a.orders) : '—'}`) : [`⚠ ${unavailable}; spend and margin withheld.`]),
    `Backend attribution: ${attributed}/${orders.length} orders matched to reported ad IDs.`,
    'Revenue includes all storefront orders. Margin excludes payment fees, taxes and operating costs; it is not net profit. Meta spend can settle later.',
    ...(uncertain.length ? [`⚠ ${uncertain.length} notification attempts need delivery review; no automatic resend of ambiguous Slack deliveries.`] : []),
    'Reporting only; campaign settings are never changed.',
  ].join('\n\n');
  return deliverSlack(w.id, webhook, message, store);
}
