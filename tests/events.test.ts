import { describe, expect, it } from 'vitest';
import { CLIENT_EVENTS, MAX_BATCH, allowEvents, cleanProps, cleanText, parseClientBatch, uaInfo } from '../src/server/events';
import { safePath } from '../src/ui/track';

const NOW = Date.UTC(2026, 10, 18, 6, 0, 0);

describe('browser event batches', () => {
  it('keeps allowed events and stamps them with the session, the visit and the server clock', () => {
    const batch = parseClientBatch(
      { vid: 'abcdef0123456789', sent: 1_000_000, events: [{ n: 'tap', t: 998_000, p: { path: '/', label: '18–29', y: 62 } }] },
      { now: NOW, sessionId: 's1', userAgent: 'x' },
    );
    expect(batch?.events).toEqual([
      { name: 'tap', at: new Date(NOW - 2000).toISOString(), sessionId: 's1', visitId: 'abcdef0123456789', props: { path: '/', label: '18–29', y: 62 }, source: 'browser' },
    ]);
  });

  it('refuses names the browser may not write, such as payment and funnel events', () => {
    for (const name of ['payment_confirmed', 'order_created', 'age_selected', 'question_answered', 'lead_captured', 'landing_view', 'result_view', 'unlock_view', 'plan_view']) {
      expect(CLIENT_EVENTS.has(name)).toBe(false);
    }
    const batch = parseClientBatch({ events: [{ n: 'payment_confirmed', t: 1 }, { n: 'scroll', t: 1, p: { pct: 50 } }, { n: 42 }, null] }, { now: NOW });
    expect(batch?.events.map((e) => e.name)).toEqual(['scroll']);
  });

  it('does not trust the phone clock: events land between ten minutes ago and now', () => {
    const batch = parseClientBatch({ sent: 5_000_000, events: [{ n: 'scroll', t: 9_000_000 }, { n: 'scroll', t: 1 }, { n: 'scroll', t: 'x' }] }, { now: NOW });
    expect(batch?.events.map((e) => e.at)).toEqual([new Date(NOW).toISOString(), new Date(NOW - 600_000).toISOString(), new Date(NOW).toISOString()]);
  });

  it('caps the batch and ignores a bad visit id', () => {
    const events = Array.from({ length: MAX_BATCH + 25 }, () => ({ n: 'tap', t: 1 }));
    const batch = parseClientBatch({ vid: 'no spaces allowed!', sent: 1, events }, { now: NOW });
    expect(batch?.events).toHaveLength(MAX_BATCH);
    expect(batch?.visitId).toBeUndefined();
    expect(batch?.events[0].visitId).toBeUndefined();
  });

  it('returns null when the body is not a batch, so the older single-event shape still works', () => {
    expect(parseClientBatch({ name: 'scan_view' }, { now: NOW })).toBeNull();
    expect(parseClientBatch(null, { now: NOW })).toBeNull();
  });

  it('adds a coarse device description to page views only', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 13; SM-A146B) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/493.0;]';
    const batch = parseClientBatch({ events: [{ n: 'page_view', t: 1, p: { path: '/' } }, { n: 'tap', t: 1 }] }, { now: NOW, userAgent: ua });
    expect(batch?.events[0].props).toEqual({ path: '/', ua: 'fb_app', os: 'android' });
    expect(batch?.events[1].props).toBeUndefined();
  });
});

describe('event properties', () => {
  it('masks email addresses and phone numbers that slip into a label', () => {
    expect(cleanText('Sent to priya.k@example.com now')).toBe('Sent to [email] now');
    expect(cleanText('Call 98765 43210 today')).toBe('Call [number] today');
    expect(cleanText('Plans from ₹199')).toBe('Plans from ₹199');
  });

  it('keeps only flat, short, well-named values', () => {
    expect(cleanProps({ path: '/unlock', pct: 49.999, open: true, Bad_Key: 'x', nested: { a: 1 }, list: [1], nan: Number.NaN, long: 'a'.repeat(300), empty: '  ' })).toEqual({
      path: '/unlock',
      pct: 50,
      open: true,
      long: 'a'.repeat(80),
    });
    expect(cleanProps({ ad: '120248243481920009', label: 'Call 120248243481920009', path: '/' })).toEqual({ ad: '120248243481920009', label: 'Call [number]', path: '/' });
    expect(cleanProps('x')).toBeUndefined();
    expect(Object.keys(cleanProps(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, i]))) ?? {})).toHaveLength(14);
  });
});

describe('device description', () => {
  it('separates Meta’s crawler and the in-app browsers from ordinary browsers', () => {
    expect(uaInfo('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)').ua).toBe('meta_crawler');
    expect(uaInfo('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 350.0')).toEqual({ ua: 'ig_app', os: 'ios' });
    expect(uaInfo('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36')).toEqual({ ua: 'chrome', os: 'android' });
    expect(uaInfo('curl/8.7.1').ua).toBe('bot');
    expect(uaInfo(null)).toEqual({ ua: 'none', os: 'other' });
  });
});

describe('rate brake', () => {
  it('lets a normal visit through and stops a flood inside one minute', () => {
    expect(allowEvents('t:a', 40, 1000)).toBe(true);
    for (let i = 0; i < 9; i += 1) allowEvents('t:a', 40, 2000);
    expect(allowEvents('t:a', 40, 3000)).toBe(false);
    expect(allowEvents('t:a', 40, 1000 + 61_000)).toBe(true);
    expect(allowEvents('t:b', 500, 1000)).toBe(false);
  });
});

describe('page paths', () => {
  it('never stores the private token of a plan link', () => {
    expect(safePath('/plan/Zx9_hG2kLmN0pQrStUvWxYz012345')).toBe('/plan/:id');
    expect(safePath('/plan/short')).toBe('/plan/:id');
    expect(safePath('/unlock')).toBe('/unlock');
    expect(safePath('/')).toBe('/');
  });
});
