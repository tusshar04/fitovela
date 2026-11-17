import { NextResponse } from 'next/server';
import { pixelUrl, validConsent } from '@/domain/meta';
import { currentAdConsent } from '@/server/adConsent';
import { metaEnabled, metaEventId } from '@/server/metaEvents';
import { siteOrigin } from '@/server/origin';
import { currentSession } from '@/server/session';
import { getStore } from '@/server/store';

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'cache-control': 'private, no-store' } });

export async function POST(req: Request) {
  if (req.headers.get('origin') !== siteOrigin(req)) return reply({}, 403);
  if (!metaEnabled()) return reply({ pixel: null });
  const c = await currentAdConsent();
  if (!validConsent(c)) return reply({ pixel: null });
  const body = await req.json().catch(() => null);
  if (typeof body?.orderId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(body.orderId)) return reply({}, 400);
  const session = await currentSession();
  const store = await getStore();
  const order = await store.getOrder(body.orderId);
  if (!session || order?.sessionId !== session.id || order.status !== 'paid' || order.provider !== 'cashfree' || order.adAttribution?.consentId !== c.id) return reply({ pixel: null });
  const d = await store.claimBrowserPurchase(metaEventId(order.id), c.id, new Date().toISOString());
  return reply({ pixel: d ? pixelUrl(process.env.META_PIXEL_ID!, { name: 'Purchase', id: d.event.event_id, value: d.event.custom_data.value }, c) : null });
}
