// Behaviour events sent by the browser: what she saw, tapped and scrolled, and where she left.
// Everything here is first-party. Nothing in this log is sent to an advertiser.
//
// The browser is not trusted: names come from a fixed list (so a visitor cannot forge
// "payment_confirmed"), properties are cut to a small, flat shape, and anything that looks
// like an email address or a phone number is masked before it is stored.

import type { EventRecord } from './store/types';

type Props = Record<string, string | number | boolean>;

/** The only event names a browser may send. Funnel and payment events are written by the server. */
export const CLIENT_EVENTS = new Set([
  // Steps only the browser knows about (in use since the first release).
  'scan_view', 'finding_view', 'analysing_view', 'lead_view', 'checkout_opened',
  // Every page.
  'page_view', 'first_touch', 'engaged', 'scroll', 'section_view', 'page_exit',
  'tap', 'tap_dead', 'rage_tap', 'field_focus', 'field_blur', 'toggle', 'perf', 'js_error',
  // Named moments.
  'age_tap', 'session_error', 'question_view', 'question_back', 'save_error', 'form_error',
  'lead_submit', 'lead_skip_tap', 'tier_select', 'checkout_tap', 'checkout_error', 'offer_expired',
]);

export const MAX_BATCH = 40;
export const MAX_BODY = 16_000;
const MAX_PROPS = 14;
const MAX_TEXT = 80;
const MAX_AGE_MS = 10 * 60 * 1000;

const KEY = /^[a-z][a-z0-9_]{0,19}$/;
const VISIT = /^[A-Za-z0-9_-]{8,32}$/;
const AD_ID = /^[\w-]{1,40}$/;

/** Masks contact details that could slip into a label, and strips control characters. */
export function cleanText(v: string): string {
  return v
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]')
    .replace(/\d[\d\s-]{6,}\d/g, '[number]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

export function cleanProps(input: unknown): Props | undefined {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return undefined;
  const out: Props = {};
  let n = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (n >= MAX_PROPS) break;
    if (!KEY.test(k)) continue;
    if (typeof v === 'string') {
      // An ad id is a long run of digits; it is the one value that must not be masked as a phone number.
      const text = k === 'ad' && AD_ID.test(v) ? v : cleanText(v);
      if (!text) continue;
      out[k] = text;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = Math.round(v * 100) / 100;
    } else if (typeof v === 'boolean') {
      out[k] = v;
    } else continue;
    n += 1;
  }
  return n > 0 ? out : undefined;
}

export function cleanVisitId(v: unknown): string | undefined {
  return typeof v === 'string' && VISIT.test(v) ? v : undefined;
}

/** A coarse description of the browser. The full User-Agent string is never stored. */
export function uaInfo(ua: string | null | undefined): { ua: string; os: string } {
  const s = ua ?? '';
  const os = /Android/i.test(s) ? 'android' : /iPhone|iPad|iPod/i.test(s) ? 'ios' : /Windows/i.test(s) ? 'windows' : /Macintosh|Mac OS X/i.test(s) ? 'mac' : /Linux/i.test(s) ? 'linux' : 'other';
  let family = 'other';
  if (!s) family = 'none';
  else if (/facebookexternalhit|meta-externalagent|meta-externalfetcher|facebookcatalog/i.test(s)) family = 'meta_crawler';
  else if (/Instagram/i.test(s)) family = 'ig_app';
  else if (/FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(s)) family = 'fb_app';
  else if (/bot|crawl|spider|slurp|curl|wget|python|Go-http|Headless|Lighthouse|scan|monitor|preview/i.test(s)) family = 'bot';
  else if (/WhatsApp/i.test(s)) family = 'whatsapp';
  else if (/SamsungBrowser/i.test(s)) family = 'samsung';
  else if (/Edg\//i.test(s)) family = 'edge';
  else if (/Firefox|FxiOS/i.test(s)) family = 'firefox';
  else if (/Chrome|CriOS/i.test(s)) family = 'chrome';
  else if (/Safari/i.test(s)) family = 'safari';
  return { ua: family, os };
}

export interface ClientBatch {
  visitId?: string;
  events: EventRecord[];
}

/**
 * Turns the browser's JSON into event records, or null if the request is not a batch at all.
 * `now` is the server's clock; the browser only tells us how long ago each event happened,
 * so a phone with the wrong time cannot write events into the past or the future.
 */
export function parseClientBatch(body: unknown, opts: { now: number; sessionId?: string; userAgent?: string | null }): ClientBatch | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.events)) return null;
  const visitId = cleanVisitId(b.vid);
  const sent = typeof b.sent === 'number' && Number.isFinite(b.sent) ? b.sent : null;
  const device = uaInfo(opts.userAgent);
  const events: EventRecord[] = [];
  for (const raw of b.events.slice(0, MAX_BATCH)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const e = raw as Record<string, unknown>;
    if (typeof e.n !== 'string' || !CLIENT_EVENTS.has(e.n)) continue;
    const ago = sent !== null && typeof e.t === 'number' && Number.isFinite(e.t) ? Math.min(Math.max(sent - e.t, 0), MAX_AGE_MS) : 0;
    let props = cleanProps(e.p);
    if (e.n === 'page_view') props = { ...(props ?? {}), ...device };
    events.push({
      name: e.n,
      at: new Date(opts.now - ago).toISOString(),
      ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
      ...(visitId ? { visitId } : {}),
      ...(props ? { props } : {}),
      source: 'browser',
    });
  }
  return { visitId, events };
}

// A small per-instance brake so one browser cannot fill the database. Cloud Run may run
// several instances, so this is a limit on abuse, not an exact quota.
const WINDOW_MS = 60_000;
const PER_WINDOW = 400;
const buckets = new Map<string, { start: number; count: number }>();
let sweptAt = 0;

export function allowEvents(key: string, count: number, now: number, limit = PER_WINDOW): boolean {
  if (buckets.size > 5000 && now - sweptAt > WINDOW_MS) {
    sweptAt = now;
    for (const [k, b] of buckets) if (now - b.start > WINDOW_MS) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || now - b.start > WINDOW_MS) {
    buckets.set(key, { start: now, count });
    return count <= limit;
  }
  if (b.count + count > limit) return false;
  b.count += count;
  return true;
}
