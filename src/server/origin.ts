// The public address of the site, for links in emails. Behind a load balancer the
// request URL can carry an internal host, so production sets SITE_URL.

export function siteOrigin(req: Request): string {
  const fixed = process.env.SITE_URL;
  if (fixed) return fixed.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (host) return `${req.headers.get('x-forwarded-proto') ?? 'http'}://${host}`;
  return new URL(req.url).origin;
}
