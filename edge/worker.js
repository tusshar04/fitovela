// Cloudflare Worker in front of the app, the way tarot's global site is served.
// Cloud Run cannot map a custom domain in Mumbai, so this forwards every request
// for fitovela.com to the service's own address. It adds nothing and stores nothing.
//
// Live as the Worker "fitovela-edge" with the custom domains fitovela.com and
// www.fitovela.com. It was put in place through the Cloudflare dashboard on
// 2026-11-15 (as a single line, same logic). Keep this file and the live Worker
// the same: change it here, then paste it into the dashboard editor or run
// `npx wrangler deploy --config edge/wrangler.jsonc`.

const DEFAULT_ORIGIN = 'https://fitovela-pflkmzgscq-el.a.run.app';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // One address for the site: www goes to the bare domain.
    if (url.hostname === 'www.fitovela.com') {
      return Response.redirect('https://fitovela.com' + url.pathname + url.search, 301);
    }

    const target = new URL(url.pathname + url.search, env.ORIGIN || DEFAULT_ORIGIN);
    const headers = new Headers(request.headers);
    headers.set('x-forwarded-host', url.hostname);
    headers.set('x-forwarded-proto', 'https');

    // Redirects are passed back to the browser untouched; the app only sends relative ones.
    return fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });
  },
};
