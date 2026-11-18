import { randomBytes, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canClaimMeta, pixelUrl, type AdConsent } from '@/domain/meta';
import { fileStore } from '@/server/store/fileStore';
import type { Order, Session } from '@/server/store';
import { metaEventId, purchaseDelivery, sendMetaPurchase } from '@/server/metaEvents';

const browser = vi.hoisted(() => ({ cookies: new Map<string, string>(), maxAge: new Map<string, number | undefined>(), session: null as Session | null }));
vi.mock('next/headers', () => ({ cookies: async () => ({
  get: (key: string) => browser.cookies.has(key) ? { value: browser.cookies.get(key) } : undefined,
  set: (key: string, value: string, opts?: { maxAge?: number }) => { browser.cookies.set(key, value); browser.maxAge.set(key, opts?.maxAge); },
  delete: (key: string) => browser.cookies.delete(key),
}) }));
vi.mock('@/server/session', () => ({ currentSession: async () => browser.session }));
import { GET as readPreference, POST as preference } from '@/app/api/ads/preferences/route';
import { POST as browserPurchase } from '@/app/api/ads/purchase/route';
import { checkoutAttribution } from '@/server/adConsent';

const savedEnv = { ...process.env };
const cleanup: string[] = [];
const record = (collection: string, id: string) => { cleanup.push(`.data/${collection}/${id}.json`); return id; };
const request = (path: string, body: unknown) => new Request(`https://fitovela.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://fitovela.test' }, body: JSON.stringify(body) });

beforeEach(() => {
  process.env.META_EVENTS_ENABLED = '1'; process.env.META_PIXEL_ID = '123456';
  process.env.META_MARKETING_ACCESS_TOKEN = 'test-secret-never-logged';
  process.env.SITE_URL = 'https://fitovela.test';
  browser.cookies.clear(); browser.maxAge.clear(); browser.session = null;
});
afterEach(async () => {
  vi.unstubAllGlobals(); vi.restoreAllMocks(); process.env = { ...savedEnv };
  await Promise.all(cleanup.splice(0).map(p => fs.rm(p, { force: true })));
});

async function consent(): Promise<AdConsent> {
  const c = { id: record('adConsents', randomBytes(16).toString('hex')), allowed: true, updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), fbp: `fb.1.${Date.now()}.123456789`, fbc: `fb.1.${Date.now()}.RealSyntheticClickId123` };
  await fileStore.saveAdConsent(c); browser.cookies.set('fv_ads', c.id); return c;
}

async function paid(c: AdConsent): Promise<Order> {
  const id = record('orders', `test-${randomUUID()}`);
  record('deliveries', `order-${id}`); record('metaDeliveries', metaEventId(id));
  const o: Order = { id, sessionId: 'synthetic-session', tier: 'w1', amountRupees: 199, status: 'paid', provider: 'cashfree', email: 'PRIVATE@example.test', phone: '9876543210', createdAt: new Date().toISOString(), paidAt: new Date().toISOString(), planToken: 'PRIVATE-TOKEN', track: 'intensive', plan: { typeId: 'PCOS-SECRET', days: [] } as unknown as Order['plan'], adAttribution: { consentId: c.id, fbp: c.fbp!, fbc: c.fbc, userAgent: 'Synthetic Browser', sourceUrl: 'https://fitovela.test/unlock' } };
  await fileStore.saveOrder({ ...o, status: 'created', paidAt: undefined, plan: undefined });
  return o;
}

describe('Meta commerce-only event boundary', () => {
  it('never queues unpaid, demo, old/unattributed or malformed orders', async () => {
    const o = await paid(await consent());
    expect(purchaseDelivery({ ...o, status: 'created' })).toBeNull();
    expect(purchaseDelivery({ ...o, provider: 'demo' })).toBeNull();
    expect(purchaseDelivery({ ...o, adAttribution: undefined })).toBeNull();
    for (const sourceUrl of ['not a URL', 'https://evil.test/unlock', 'https://fitovela.test/plan/PRIVATE', 'https://fitovela.test/unlock?condition=pcos']) {
      expect(purchaseDelivery({ ...o, adAttribution: { ...o.adAttribution!, sourceUrl } })).toBeNull();
    }
    expect(purchaseDelivery({ ...o, paidAt: 'not a time' })).toBeNull();
    expect(purchaseDelivery({ ...o, amountRupees: NaN })).toBeNull();
  });

  it('atomically queues one paid event and sends one request when callbacks race', async () => {
    const o = await paid(await consent());
    const commits = await Promise.all(Array.from({ length: 10 }, () => fileStore.commitPaidOrder({ ...o })));
    expect(commits.filter(c => c.created)).toHaveLength(1);
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ events_received: 1 })));
    vi.stubGlobal('fetch', fetcher);
    await Promise.all(Array.from({ length: 10 }, () => sendMetaPurchase(metaEventId(o.id), fileStore)));
    expect(fetcher).toHaveBeenCalledTimes(1);
    const options = fetcher.mock.calls[0][1];
    expect(options.redirect).toBe('error');
    const event = JSON.parse(options.body).data[0];
    expect(Object.keys(event).sort()).toEqual(['action_source', 'custom_data', 'event_id', 'event_name', 'event_source_url', 'event_time', 'user_data']);
    expect(event.custom_data).toEqual({ value: 199, currency: 'INR' });
    expect(Object.keys(event.user_data).sort()).toEqual(['client_user_agent', 'fbc', 'fbp']);
    for (const secret of [o.email, o.phone, o.planToken!, 'PCOS-SECRET', 'intensive', o.id, o.sessionId]) expect(options.body).not.toContain(secret);
    expect(await sendMetaPurchase(metaEventId(o.id), fileStore)).toBe('skipped');
  });

  it('checks withdrawal before dispatch and before browser Pixel', async () => {
    const c = await consent(); const o = await paid(c); await fileStore.commitPaidOrder(o);
    await fileStore.saveAdConsent({ ...c, allowed: false });
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect(await sendMetaPurchase(metaEventId(o.id), fileStore)).toBe('stopped');
    browser.session = { id: o.sessionId } as Session;
    expect(await (await browserPurchase(request('/api/ads/purchase', { orderId: o.id }))).json()).toEqual({ pixel: null });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('retries a failed server event with the same ID/time; limits age and attempts', async () => {
    const o = await paid(await consent()); await fileStore.commitPaidOrder(o);
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue(new Response(JSON.stringify({ events_received: 1 })));
    vi.spyOn(console, 'error').mockImplementation(() => undefined); vi.stubGlobal('fetch', fetcher);
    expect(await sendMetaPurchase(metaEventId(o.id), fileStore)).toBe('failed');
    const path = `.data/metaDeliveries/${metaEventId(o.id)}.json`;
    const d = JSON.parse(await fs.readFile(path, 'utf8'));
    await fs.writeFile(path, JSON.stringify({ ...d, updatedAt: new Date(Date.now() - 300000).toISOString() }));
    expect(await sendMetaPurchase(d.id, fileStore)).toBe('sent');
    expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
    expect(canClaimMeta({ ...d, attempts: 8 }, Date.now() + 3600000)).toBe(false);
    expect(canClaimMeta(d, Date.now() + 86400001)).toBe(false);
    expect(canClaimMeta({ ...d, state: 'sending', updatedAt: new Date(Date.now() - 300000).toISOString() }, Date.now())).toBe(true);
  });

  it('allows only the original consenting paid session to emit a single browser event', async () => {
    const c = await consent(); const o = await paid(c); await fileStore.commitPaidOrder(o);
    const req = () => request('/api/ads/purchase', { orderId: o.id });
    expect((await (await browserPurchase(req())).json()).pixel).toBeNull();
    browser.session = { id: o.sessionId } as Session;
    const responses = await Promise.all(Array.from({ length: 5 }, async () => (await browserPurchase(req())).json()));
    const pixels = responses.map(r => r.pixel).filter(Boolean);
    expect(pixels).toHaveLength(1);
    const q = new URL(pixels[0]).searchParams;
    expect(q.get('eid')).toBe(metaEventId(o.id)); expect(q.get('ev')).toBe('Purchase');
    expect(q.get('cd[value]')).toBe('199'); expect(q.get('cd[currency]')).toBe('INR');
    expect(q.has('dl')).toBe(false); expect(q.has('rl')).toBe(false);
    for (const secret of [o.email, o.phone, o.planToken!, 'PCOS', 'intensive']) expect(pixels[0]).not.toContain(secret);
  });
});

describe('measurement choice and genuine attribution', () => {
  it('shares nothing before the landing page has run, records only an actual click, and clears cookies when turned off', async () => {
    const checkout = new Request('https://fitovela.test/api/order', { headers: { referer: 'https://fitovela.test/unlock?pay=pending', 'user-agent': 'Browser Test' } });
    expect(await checkoutAttribution(checkout)).toBeUndefined();
    const result = await (await preference(request('/api/ads/preferences', { allowed: true, landing: true, fbclid: 'ActualClickValueAbC123' }))).json();
    const id = browser.cookies.get('fv_ads')!; record('adConsents', id);
    expect(result.choice).toBe(true); expect(new URL(result.pixel).searchParams.get('dl')).toBe('https://fitovela.test/');
    const attribution = await checkoutAttribution(checkout);
    expect(attribution?.fbc).toMatch(/^fb\.1\.\d{13}\.ActualClickValueAbC123$/);
    expect(attribution?.sourceUrl).toBe('https://fitovela.test/unlock');
    expect(await checkoutAttribution(new Request('https://fitovela.test/api/order', { headers: { referer: 'https://evil.test/unlock', 'user-agent': 'Browser Test' } }))).toBeUndefined();
    await preference(request('/api/ads/preferences', { allowed: false }));
    expect(browser.cookies.has('_fbc')).toBe(false); expect(browser.cookies.has('_fbp')).toBe(false);
    expect(await checkoutAttribution(checkout)).toBeUndefined();
  });

  it('is switched on by default for a browser with no stored choice, and says so in the record', async () => {
    const r = await (await preference(request('/api/ads/preferences', { allowed: true, landing: true, auto: true, fbclid: 'ActualClickValueAbC123' }))).json();
    const id = browser.cookies.get('fv_ads')!; record('adConsents', id);
    expect(r.choice).toBe(true); expect(new URL(r.pixel).searchParams.get('ev')).toBe('PageView');
    const stored = await fileStore.getAdConsent(id);
    expect(stored?.allowed).toBe(true); expect(stored?.basis).toBe('default');
    expect(stored?.fbc).toMatch(/^fb\.1\.\d{13}\.ActualClickValueAbC123$/);
    expect(browser.cookies.get('_fbp')).toBe(stored?.fbp);
  });

  it('the default never switches it back on after she turned it off', async () => {
    await preference(request('/api/ads/preferences', { allowed: false }));
    const id = browser.cookies.get('fv_ads')!; record('adConsents', id);
    expect((await fileStore.getAdConsent(id))?.basis).toBe('choice');
    const r = await (await preference(request('/api/ads/preferences', { allowed: true, landing: true, auto: true, fbclid: 'ActualNewClick12345' }))).json();
    expect(r.choice).toBe(false); expect(r.pixel).toBeNull();
    const stored = await fileStore.getAdConsent(id);
    expect(stored?.allowed).toBe(false); expect(stored?.fbp).toBeUndefined(); expect(stored?.fbc).toBeUndefined();
    expect(browser.cookies.get('fv_ads')).toBe(id); expect(browser.cookies.has('_fbp')).toBe(false);
    const checkout = new Request('https://fitovela.test/api/order', { headers: { referer: 'https://fitovela.test/unlock', 'user-agent': 'Browser Test' } });
    expect(await checkoutAttribution(checkout)).toBeUndefined();
  });

  it('remembers "off" beyond the 90 days: a long cookie, renewed at each landing, and an off record never lapses', async () => {
    await preference(request('/api/ads/preferences', { allowed: false }));
    const id = browser.cookies.get('fv_ads')!; record('adConsents', id);
    expect(browser.maxAge.get('fv_ads')).toBe(400 * 86400);
    // 91 days later: the record's own 90 days have run out, the cookie is still there.
    const stored = (await fileStore.getAdConsent(id))!;
    await fileStore.saveAdConsent({ ...stored, expiresAt: new Date(Date.now() - 86400000).toISOString() });
    browser.maxAge.clear();
    expect((await (await readPreference()).json()).choice).toBe(false);
    expect(browser.maxAge.get('fv_ads')).toBe(400 * 86400); // the landing page's read renews it
    browser.maxAge.clear();
    const r = await (await preference(request('/api/ads/preferences', { allowed: true, landing: true, auto: true, fbclid: 'ActualNewClick12345' }))).json();
    expect(r.choice).toBe(false); expect(r.pixel).toBeNull();
    expect(browser.cookies.get('fv_ads')).toBe(id); expect(browser.maxAge.get('fv_ads')).toBe(400 * 86400);
    expect((await fileStore.getAdConsent(id))?.allowed).toBe(false);
    expect(browser.cookies.has('_fbp')).toBe(false);
  });

  it('an "on" record whose 90 days have run out is replaced by a new default record, never written over', async () => {
    const c = await consent();
    await fileStore.saveAdConsent({ ...c, basis: 'choice', expiresAt: new Date(Date.now() - 86400000).toISOString() });
    expect((await (await readPreference()).json()).choice).toBeNull();
    const r = await (await preference(request('/api/ads/preferences', { allowed: true, landing: true, auto: true }))).json();
    const id = browser.cookies.get('fv_ads')!; record('adConsents', id);
    expect(r.choice).toBe(true); expect(r.pixel).toContain('ev=PageView');
    expect(id).not.toBe(c.id); expect(browser.maxAge.get('fv_ads')).toBe(90 * 86400);
    const fresh = await fileStore.getAdConsent(id);
    expect(fresh?.basis).toBe('default'); expect(fresh?.fbp).not.toBe(c.fbp); expect(fresh?.fbc).toBeUndefined();
    expect((await fileStore.getAdConsent(c.id))?.basis).toBe('choice');
  });

  it('the default is only a refresh for a browser that already has it on', async () => {
    const c = await consent();
    await fileStore.saveAdConsent({ ...c, basis: 'choice' });
    const r = await (await preference(request('/api/ads/preferences', { allowed: true, landing: true, auto: true, fbclid: 'ActualNewClick12345' }))).json();
    expect(r.choice).toBe(true); expect(r.pixel).toContain('ev=PageView');
    const stored = await fileStore.getAdConsent(c.id);
    expect(browser.cookies.get('fv_ads')).toBe(c.id);
    expect(stored?.fbp).toBe(c.fbp); expect(stored?.basis).toBe('choice');
    expect(stored?.updatedAt).toBe(c.updatedAt); expect(stored?.expiresAt).toBe(c.expiresAt);
    expect(new URL(r.pixel).searchParams.get('fbp')).toBe(c.fbp);
    expect(stored?.fbc).toMatch(/\.ActualNewClick12345$/);
  });

  it('rejects a default that is not "on", and records her own choice as a choice', async () => {
    expect((await preference(request('/api/ads/preferences', { allowed: false, auto: true }))).status).toBe(400);
    expect(browser.cookies.has('fv_ads')).toBe(false);
    await preference(request('/api/ads/preferences', { allowed: true }));
    const id = browser.cookies.get('fv_ads')!; record('adConsents', id);
    expect((await fileStore.getAdConsent(id))?.basis).toBe('choice');
  });

  it('an automatic landing refresh cannot undo a withdrawal from another tab', async () => {
    const c = await consent();
    // A stale tab saw true; the other tab then explicitly revoked.
    await fileStore.saveAdConsent({ ...c, allowed: false });
    const r = await (await preference(request('/api/ads/preferences', { allowed: true, landing: true, refresh: true, fbclid: 'ActualNewClick12345' }))).json();
    expect(r.pixel).toBeNull(); expect(r.choice).toBe(false);
    expect((await fileStore.getAdConsent(c.id))?.allowed).toBe(false);
  });

  it('does not invent a click ID and rejects cross-origin preference writes', async () => {
    await preference(request('/api/ads/preferences', { allowed: true, landing: true }));
    record('adConsents', browser.cookies.get('fv_ads')!);
    expect(browser.cookies.has('_fbc')).toBe(false);
    const cross = new Request('https://fitovela.test/api/ads/preferences', { method: 'POST', headers: { origin: 'https://evil.test' }, body: '{"allowed":true}' });
    expect((await preference(cross)).status).toBe(403);
  });

  it('image transport accepts only the public landing URL and never a private URL', () => {
    for (const url of ['https://fitovela.test/?c=pcos', 'https://fitovela.test/plan/PRIVATE']) expect(() => pixelUrl('123', { name: 'PageView', id: 'test' }, {}, url)).toThrow();
  });
});
