import { cookies } from 'next/headers';
import { validConsent, type AdAttribution } from '@/domain/meta';
import { getStore } from './store';
import { metaEnabled } from './metaEvents';
import { siteOrigin } from './origin';

export const AD_COOKIE = 'fv_ads';
export const validAdId = (id: string) => /^[a-f0-9]{32}$/.test(id);

export async function currentAdConsent() {
  const id = (await cookies()).get(AD_COOKIE)?.value ?? '';
  if (!validAdId(id)) return null;
  return (await getStore()).getAdConsent(id);
}

export async function checkoutAttribution(req: Request): Promise<AdAttribution | undefined> {
  if (!metaEnabled()) return undefined;
  try {
    const c = await currentAdConsent();
    if (!validConsent(c)) return undefined;
    // The real public checkout is the source. Never accept arbitrary client URLs.
    const source = new URL(req.headers.get('referer') ?? '');
    const origin = siteOrigin(req);
    if (source.origin !== origin || source.pathname !== '/unlock') return undefined;
    const userAgent = req.headers.get('user-agent')?.slice(0, 512);
    if (!userAgent) return undefined;
    return { consentId: c.id, fbp: c.fbp, ...(c.fbc ? { fbc: c.fbc } : {}), userAgent, sourceUrl: `${origin}/unlock` };
  } catch { return undefined; }
}
