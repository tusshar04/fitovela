import { randomBytes, randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { pixelUrl, validConsent, type AdConsent } from '@/domain/meta';
import { AD_COOKIE, currentAdConsent } from '@/server/adConsent';
import { metaEnabled } from '@/server/metaEvents';
import { siteOrigin } from '@/server/origin';
import { getStore } from '@/server/store';

export const dynamic = 'force-dynamic';
const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 90 * 86400 };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'cache-control': 'private, no-store' } });

export async function GET() {
  const c = await currentAdConsent();
  return reply({ enabled: metaEnabled(), choice: !c || Date.parse(c.expiresAt) <= Date.now() ? null : validConsent(c) });
}

export async function POST(req: Request) {
  if (req.headers.get('origin') !== siteOrigin(req)) return reply({ error: 'Invalid origin' }, 403);
  const body = await req.json().catch(() => null);
  if (typeof body?.allowed !== 'boolean') return reply({ error: 'Choose an option' }, 400);
  if (!metaEnabled() && body.allowed) return reply({ enabled: false }, 503);
  const prev = await currentAdConsent();
  const now = Date.now();
  const allowed: boolean = body.allowed;
  let c: AdConsent = {
    id: prev?.id ?? randomBytes(16).toString('hex'), allowed,
    updatedAt: new Date(now).toISOString(), expiresAt: new Date(now + 90 * 86400000).toISOString(),
  };
  const landing = body.landing === true;
  if (allowed) {
    c.fbp = validConsent(prev, now) ? prev.fbp : `fb.1.${now}.${randomInt(1, 2147483647)}`;
    if (validConsent(prev, now) && prev.fbc) c.fbc = prev.fbc;
    // Only an actually observed public landing click ID; never invented from UTMs/order data.
    if (landing && typeof body.fbclid === 'string' && /^[A-Za-z0-9_-]{10,500}$/.test(body.fbclid)) {
      if (!c.fbc?.endsWith(`.${body.fbclid}`)) c.fbc = `fb.1.${now}.${body.fbclid}`;
    }
  }
  const store = await getStore();
  if (body.refresh === true) {
    if (!prev) return reply({ enabled: metaEnabled(), choice: null, pixel: null });
    const refreshed = await store.refreshAdClick(prev.id, landing && typeof body.fbclid === 'string' ? body.fbclid : undefined, now);
    if (!refreshed) return reply({ enabled: metaEnabled(), choice: false, pixel: null });
    c = refreshed;
  } else {
    await store.saveAdConsent(c);
  }
  const jar = await cookies();
  jar.set(AD_COOKIE, c.id, opts);
  if (allowed) {
    jar.set('_fbp', c.fbp!, opts);
    if (c.fbc) jar.set('_fbc', c.fbc, opts); else jar.delete('_fbc');
  } else { jar.delete('_fbp'); jar.delete('_fbc'); }
  return reply({ enabled: metaEnabled(), choice: allowed,
    pixel: allowed && landing ? pixelUrl(process.env.META_PIXEL_ID!, { name: 'PageView', id: randomBytes(16).toString('hex') }, c, `${siteOrigin(req)}/`) : null,
  });
}
