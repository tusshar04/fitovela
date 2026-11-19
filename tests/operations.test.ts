import { randomUUID, createHmac } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fileStore } from '@/server/store/fileStore';
import type { Order } from '@/server/store';
import { deliverSlack, orderAlertText } from '@/server/slack';
import { reportWindow, scheduledReportTime, sendHourlyReport, totals } from '@/server/reporting';
import { parseSpendRows, fetchMetaSpend } from '@/server/metaInsights';
import { authorizedOps } from '@/server/opsAuth';
import { cashfreeRefundRecord } from '@/server/refunds';
import { POST as cashfreeWebhook } from '@/app/api/webhooks/cashfree/route';

const savedEnv = { ...process.env };
const cleanup: string[] = [];
function id(collection: string) {
  const id = `test-${randomUUID()}`;
  cleanup.push(path.join('.data', collection, `${id}.json`));
  return id;
}
const paid = (orderId: string): Order => ({
  id: orderId, sessionId: 'synthetic', tier: 'w1', amountRupees: 199, provider: 'cashfree', status: 'paid',
  createdAt: '2026-11-17T04:00:00.000Z', paidAt: '2026-11-17T05:31:00.000Z',
  email: 'synthetic@example.test', phone: '9000000000', providerPaymentId: 'payment-test',
  planToken: 'private-plan-must-not-leak', track: 'intensive', plan: { days: [] } as unknown as Order['plan'],
});
afterEach(async () => {
  vi.restoreAllMocks(); vi.unstubAllGlobals(); process.env = { ...savedEnv };
  await Promise.all(cleanup.splice(0).map(p => fs.rm(p, { force: true })));
});

describe('payment and notification idempotency', () => {
  it('commits only one paid snapshot when return and webhook race', async () => {
    const o = paid(id('orders'));
    cleanup.push(path.join('.data', 'deliveries', `order-${o.id}.json`));
    await fileStore.saveOrder({ ...o, status: 'created', plan: undefined, paidAt: undefined });
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => fileStore.commitPaidOrder({ ...o, paidAt: `2026-11-17T05:31:${String(i).padStart(2, '0')}.000Z` })));
    expect(results.filter(r => r.created)).toHaveLength(1);
    expect(new Set(results.map(r => r.order.paidAt)).size).toBe(1);
    const queued = (await fileStore.listPendingOrderAlerts()).filter(item => item.id === o.id);
    expect(queued).toHaveLength(1);
    expect(queued[0]).not.toHaveProperty('email');
    expect(queued[0]).not.toHaveProperty('plan');
  });
  it('sends a concurrent order alert once, and never sends private data', async () => {
    const delivery = id('deliveries');
    const fetcher = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetcher);
    const text = orderAlertText(paid('synthetic-order'));
    await Promise.all(Array.from({ length: 10 }, () => deliverSlack(delivery, 'https://hooks.slack.com/services/SYNTHETIC', text, fileStore)));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(text).toContain('₹199');
    for (const value of ['synthetic@example.test', '9000000000', 'private-plan-must-not-leak', 'intensive', 'PCOS']) expect(text).not.toContain(value);
  });
  it('does not resend a timeout that might already have reached Slack', async () => {
    const delivery = id('deliveries');
    const fetcher = vi.fn().mockRejectedValue(new Error('timeout'));
    vi.stubGlobal('fetch', fetcher);
    expect(await deliverSlack(delivery, 'https://hooks.slack.com/services/SYNTHETIC', 'test', fileStore)).toBe('uncertain');
    expect(await deliverSlack(delivery, 'https://hooks.slack.com/services/SYNTHETIC', 'test', fileStore)).toBe('skipped');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('retries a definitive rejection, but never follows redirects', async () => {
    const delivery = id('deliveries');
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('rate_limited', { status: 429 })).mockResolvedValueOnce(new Response('ok'));
    vi.stubGlobal('fetch', fetcher);
    expect(await deliverSlack(delivery, 'https://hooks.slack.com/services/SYNTHETIC', 'test', fileStore)).toBe('failed');
    expect(await deliverSlack(delivery, 'https://hooks.slack.com/services/SYNTHETIC', 'test', fileStore)).toBe('sent');
    expect(fetcher.mock.calls[0][1].redirect).toBe('error');
  });
});

describe('reporting boundaries and missing data', () => {
  it.each([
    { label: 'an empty day', orderHour: null, spendHour: null, spend: 0, expected: 'skipped' },
    { label: 'an explicit zero-spend row', orderHour: null, spendHour: 11, spend: 0, expected: 'skipped' },
    { label: 'earlier activity but a quiet last hour', orderHour: 10, spendHour: 10, spend: 100, expected: 'skipped' },
    { label: 'spend without orders', orderHour: null, spendHour: 11, spend: 0.01, expected: 'sent' },
    { label: 'an order without spend', orderHour: 11, spendHour: null, spend: 0, expected: 'sent' },
    { label: 'unavailable spend without orders', orderHour: null, spendHour: null, spend: null, expected: 'sent' },
  ])('$expected for $label', async ({ orderHour, spendHour, spend, expected }) => {
    process.env.SLACK_REPORT_WEBHOOK_URL = 'https://hooks.slack.com/services/SYNTHETIC';
    process.env.META_MARKETING_ACCESS_TOKEN = 'synthetic-token';
    delete process.env.STORE_DRIVER;
    const date = '2026-11-17';
    const at = (hour: number) => new Date(`${date}T${hour}:15:00+05:30`).toISOString();
    vi.spyOn(fileStore, 'listPaidOrders').mockResolvedValue(orderHour === null ? [] : [{ ...paid('synthetic-report-order'), paidAt: at(orderHour) }]);
    // Even a refund/old uncertain delivery does not create an otherwise zero/zero report.
    vi.spyOn(fileStore, 'listRefunds').mockResolvedValue([{ id: 'refund', orderId: 'older-order', amountRupees: 199, processedAt: at(11) }]);
    vi.spyOn(fileStore, 'listUncertainDeliveries').mockResolvedValue([{ id: 'old-attempt', state: 'uncertain', attempt: 'synthetic', updatedAt: at(10) }]);
    vi.spyOn(fileStore, 'getSession').mockResolvedValue(null);
    const claim = vi.spyOn(fileStore, 'claimDelivery').mockResolvedValue(true);
    vi.spyOn(fileStore, 'finishDelivery').mockResolvedValue(undefined);
    const slack = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = new URL(String(input));
      if (url.hostname === 'hooks.slack.com') return slack(input, init);
      if (url.pathname.endsWith('/insights')) {
        if (spend === null) throw new Error('Meta unavailable');
        return Response.json({ data: spendHour === null ? [] : [{ ad_id: '123', ad_name: 'Synthetic ad', campaign_id: '456', spend: String(spend), date_start: date, date_stop: date, hourly_stats_aggregated_by_advertiser_time_zone: `${spendHour}:00:00 - ${spendHour}:59:59` }] });
      }
      return Response.json({ account_id: '1457307065897121', currency: 'INR', timezone_name: 'Asia/Kolkata', business: { id: '1110506178493480' } });
    }));
    expect(await sendHourlyReport(new Date(`${date}T12:05:00+05:30`))).toBe(expected);
    expect(slack).toHaveBeenCalledTimes(expected === 'skipped' ? 0 : 1);
    expect(claim).toHaveBeenCalledTimes(expected === 'skipped' ? 0 : 1);
    if (spend === null) expect(JSON.parse(slack.mock.calls[0][1].body).text).toContain('spend and margin withheld');
  });
  it('keeps the original scheduled window when a retry crosses midnight', () => {
    const scheduled = '2026-11-17T17:35:00Z'; // 23:05 IST
    const request = new Request('https://fitovela.test/api/ops/report', { headers: { 'x-cloudscheduler-scheduletime': scheduled } });
    const delayed = new Date('2026-11-17T18:40:00Z'); // next day 00:10 IST
    expect(reportWindow(scheduledReportTime(request, delayed)).id).toBe('report-2026-11-17-22');
    const invalid = new Request('https://fitovela.test', { headers: { 'x-cloudscheduler-scheduletime': 'bad-date' } });
    expect(() => scheduledReportTime(invalid, delayed)).toThrow();
    expect(scheduledReportTime(new Request('https://fitovela.test'), delayed)).toEqual(delayed);
  });
  it('uses completed IST hours and reports yesterday at midnight', () => {
    const w = reportWindow(new Date('2026-11-17T18:35:00Z')); // 00:05 IST Nov 18
    expect(w.date).toBe('2026-11-17'); expect(w.lastHour).toBe(23);
    expect(w.start).toBe('2026-11-16T18:30:00.000Z');
    expect(w.end).toBe('2026-11-17T18:30:00.000Z');
    expect(reportWindow(new Date('2026-11-17T06:40:00Z')).lastHour).toBe(11);
  });
  it('subtracts refunds and spend, and withholds margin when spend is unknown', () => {
    const o = paid('one');
    const refunds = [{ id: 'refund', orderId: o.id, amountRupees: 199, processedAt: o.paidAt! }];
    const rows = [{ adId: '123', adName: 'Ad', campaignId: '456', hour: 11, spend: 100 }];
    expect(totals([o], refunds, rows).margin).toBe(-100);
    expect(totals([o], refunds, null).margin).toBeNull();
    expect(totals([], [], []).spend).toBe(0);
  });
  it('rejects wrong dates and malformed Meta amounts rather than turning them into zero', () => {
    const row = { ad_id: '123', ad_name: 'Ad', campaign_id: '456', spend: '100.50', date_start: '2026-11-17', date_stop: '2026-11-17', hourly_stats_aggregated_by_advertiser_time_zone: '11:00:00 - 11:59:59' };
    expect(parseSpendRows([row], '2026-11-17')[0].spend).toBe(100.5);
    expect(() => parseSpendRows([{ ...row, spend: 'invalid' }], '2026-11-17')).toThrow();
    expect(() => parseSpendRows([row], '2026-11-18')).toThrow();
    expect(() => parseSpendRows(null, '2026-11-17')).toThrow();
  });
  it('stops Meta reads immediately if the account or currency is wrong', async () => {
    process.env.META_MARKETING_ACCESS_TOKEN = 'synthetic-token';
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ account_id: '1434668624866847', currency: 'INR', timezone_name: 'Asia/Kolkata', business: { id: '1110506178493480' } })));
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchMetaSpend('2026-11-17')).rejects.toThrow('identity mismatch');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).not.toContain('synthetic-token');
  });
  it('requires the complete scheduler secret; missing config fails closed', () => {
    delete process.env.OPS_REPORT_SECRET;
    expect(authorizedOps(new Request('https://fitovela.test'))).toBe(false);
    process.env.OPS_REPORT_SECRET = 'x'.repeat(40);
    const req = (token: string) => new Request('https://fitovela.test', { headers: { authorization: `Bearer ${token}` } });
    expect(authorizedOps(req('x'.repeat(40)))).toBe(true);
    expect(authorizedOps(req('x'.repeat(39)))).toBe(false);
  });
});

describe('Cashfree refund handling', () => {
  const refund = { cf_refund_id: '1234', cf_payment_id: 'payment-test', order_id: 'fv_test', refund_status: 'SUCCESS', refund_currency: 'INR', refund_amount: 199, processed_at: '2026-11-17T14:00:00+05:30', refund_type: 'MERCHANT_INITIATED' };
  it('only counts a successful INR refund against the paid payment', () => {
    const o = paid('test');
    expect(cashfreeRefundRecord(refund, o)?.amountRupees).toBe(199);
    expect(cashfreeRefundRecord({ ...refund, refund_status: 'PENDING' }, o)).toBeNull();
    expect(cashfreeRefundRecord({ ...refund, refund_type: 'PAYMENT_AUTO_REFUND' }, o)).toBeNull();
    expect(() => cashfreeRefundRecord({ ...refund, cf_payment_id: 'another-payment' }, o)).toThrow();
    expect(() => cashfreeRefundRecord({ ...refund, refund_currency: 'USD' }, o)).toThrow();
    expect(() => cashfreeRefundRecord({ ...refund, refund_amount: 200 }, o)).toThrow();
  });
  it('deduplicates signed refund retries and rejects tampering', async () => {
    process.env.CASHFREE_APP_ID = 'synthetic'; process.env.CASHFREE_SECRET_KEY = 'synthetic-secret';
    const o = paid(id('orders'));
    await fileStore.saveOrder(o);
    const body = JSON.stringify({ type: 'REFUND_STATUS_WEBHOOK', data: { refund: { ...refund, order_id: `fv_${o.id}`, cf_refund_id: o.id } } });
    const ts = '1785401067911';
    const signature = createHmac('sha256', 'synthetic-secret').update(ts + body).digest('base64');
    const req = (raw = body) => new Request('https://fitovela.test/api/webhooks/cashfree', { method: 'POST', body: raw, headers: { 'x-webhook-timestamp': ts, 'x-webhook-signature': signature } });
    expect((await cashfreeWebhook(req(body + ' '))).status).toBe(401);
    expect((await cashfreeWebhook(req())).status).toBe(200);
    expect((await cashfreeWebhook(req())).status).toBe(200);
    const records = (await fileStore.listRefunds('2026-11-17T00:00:00.000Z', '2026-11-18T00:00:00.000Z')).filter(r => r.orderId === o.id);
    expect(records).toHaveLength(1);
    cleanup.push(...records.map(r => path.join('.data', 'refunds', `${r.id}.json`)));
  });
  it('enriches a return-first paid order from the signed callback so its refund can reconcile', async () => {
    process.env.CASHFREE_APP_ID = 'synthetic'; process.env.CASHFREE_SECRET_KEY = 'synthetic-secret';
    delete process.env.SLACK_ORDER_WEBHOOK_URL;
    const o = { ...paid(id('orders')), sessionId: id('sessions'), providerPaymentId: undefined };
    await fileStore.saveOrder(o);
    await fileStore.saveSession({ id: o.sessionId, createdAt: o.createdAt, updatedAt: o.createdAt, hook: 'a', category: 'pcos', ageBand: '30-39', ad: {}, answers: {} });
    const signed = (event: unknown) => {
      const body = JSON.stringify(event), ts = '1785401067911';
      const sig = createHmac('sha256', 'synthetic-secret').update(ts + body).digest('base64');
      return new Request('https://fitovela.test/api/webhooks/cashfree', { method: 'POST', body, headers: { 'x-webhook-timestamp': ts, 'x-webhook-signature': sig } });
    };
    const success = { type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: `fv_${o.id}`, order_amount: 199, order_currency: 'INR' }, payment: { payment_status: 'SUCCESS', cf_payment_id: 'payment-test' } } };
    expect((await cashfreeWebhook(signed(success))).status).toBe(200);
    const enriched = await fileStore.getOrder(o.id);
    expect(enriched?.providerPaymentId).toBe('payment-test');
    expect(enriched?.paidAt).toBe(o.paidAt);
    await fileStore.recordPaidPaymentReference(o.id, 'another-payment');
    expect((await fileStore.getOrder(o.id))?.providerPaymentId).toBe('payment-test');
    const refundEvent = { type: 'REFUND_STATUS_WEBHOOK', data: { refund: { ...refund, order_id: `fv_${o.id}`, cf_refund_id: o.id } } };
    expect((await cashfreeWebhook(signed(refundEvent))).status).toBe(200);
    const records = (await fileStore.listRefunds('2026-11-17T00:00:00.000Z', '2026-11-18T00:00:00.000Z')).filter(r => r.orderId === o.id);
    expect(records).toHaveLength(1);
    cleanup.push(...records.map(r => path.join('.data', 'refunds', `${r.id}.json`)));
  });
});
