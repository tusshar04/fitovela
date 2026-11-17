/** Advertising measurement has its own allowlist. Never spread a session/order into it. */
export interface AdConsent {
  id: string;
  allowed: boolean;
  updatedAt: string;
  expiresAt: string;
  fbp?: string;
  fbc?: string;
}

export interface AdAttribution {
  consentId: string;
  fbp: string;
  fbc?: string;
  userAgent: string;
  sourceUrl: string;
}

export interface MetaPurchase {
  event_name: 'Purchase';
  event_id: string;
  event_time: number;
  action_source: 'website';
  event_source_url: string;
  user_data: { fbp: string; fbc?: string; client_user_agent: string };
  custom_data: { value: number; currency: 'INR' };
}

export interface MetaDelivery {
  id: string;
  consentId: string;
  event: MetaPurchase;
  state: 'pending' | 'sending' | 'sent' | 'failed' | 'stopped';
  attempts: number;
  updatedAt: string;
  browserSentAt?: string;
}

export function validConsent(c: AdConsent | null, now = Date.now()): c is AdConsent & { fbp: string } {
  return Boolean(c?.allowed && c.fbp && Date.parse(c.expiresAt) > now);
}

export function canClaimMeta(d: MetaDelivery, now: number): boolean {
  if (['sent', 'stopped'].includes(d.state) || d.attempts >= 8) return false;
  if (now - d.event.event_time * 1000 > 24 * 60 * 60 * 1000) return false;
  const delay = d.state === 'pending' ? 0 : Math.min(60 * 60_000, 60_000 * 2 ** d.attempts);
  return now - Date.parse(d.updatedAt) >= delay;
}

/** Documented image Pixel transport: no third-party JS, DOM access or automatic events.
 * Purchase deliberately omits the page address. The image's HTTP referrer is also disabled. */
export function pixelUrl(pixelId: string, event: { name: 'PageView' | 'Purchase'; id: string; value?: number }, c: Pick<AdConsent, 'fbp' | 'fbc'>, publicLanding?: string): string {
  const q = new URLSearchParams({ id: pixelId, ev: event.name, eid: event.id, noscript: '1' });
  if (c.fbp) q.set('fbp', c.fbp);
  if (c.fbc) q.set('fbc', c.fbc);
  if (event.name === 'Purchase' && Number.isFinite(event.value)) {
    q.set('cd[value]', String(event.value));
    q.set('cd[currency]', 'INR');
  }
  if (event.name === 'PageView' && publicLanding) {
    const url = new URL(publicLanding);
    if (url.pathname !== '/' || url.search || url.hash) throw new Error('Only the public landing URL is allowed');
    q.set('dl', url.href);
  }
  return `https://www.facebook.com/tr?${q}`;
}

/** An automatic landing refresh can update a genuine click, but never grant consent. */
export function refreshedAdClick(c: AdConsent | null, fbclid: string | undefined, now: number): AdConsent | null {
  if (!validConsent(c, now)) return null;
  if (fbclid && /^[A-Za-z0-9_-]{10,500}$/.test(fbclid) && !c.fbc?.endsWith(`.${fbclid}`)) return { ...c, fbc: `fb.1.${now}.${fbclid}` };
  return c;
}
