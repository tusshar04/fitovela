'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// Keep the image alive until completion. No SDK, DOM scraping or automatic URL collection.
const pending = new Set<HTMLImageElement>();
export function emitPixel(url: string) {
  if (!url.startsWith('https://www.facebook.com/tr?')) return;
  const image = new Image(1, 1);
  image.referrerPolicy = 'no-referrer';
  image.onload = image.onerror = () => pending.delete(image);
  pending.add(image);
  image.src = url;
}

// D-028: measurement is on by default and nothing is asked on the landing page, so no banner can
// sit on top of the age buttons. The only place it is shown or changed is the privacy page.
export function AdMeasurement() {
  const path = usePathname();
  const [choice, setChoice] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const landed = useRef(false);

  async function save(body: { allowed: boolean; landing?: boolean; auto?: boolean; refresh?: boolean }, quiet = false) {
    if (!quiet) { setBusy(true); setError(false); }
    try {
      const fbclid = body.landing ? new URLSearchParams(window.location.search).get('fbclid') : null;
      const response = await fetch('/api/ads/preferences', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, fbclid }) });
      if (!response.ok) throw new Error('Preference unavailable');
      const data = await response.json();
      setChoice(data.choice); if (!quiet) setOpen(false);
      if (data.pixel) emitPixel(data.pixel);
    } catch { if (!quiet) setError(true); } finally { if (!quiet) setBusy(false); }
  }

  useEffect(() => {
    if (path !== '/' && path !== '/privacy') return;
    let live = true;
    fetch('/api/ads/preferences', { cache: 'no-store' }).then(r => r.json()).then(data => {
      if (!live) return;
      setEnabled(data.enabled); setChoice(data.choice);
      if (!data.enabled || path !== '/' || data.choice === false || landed.current) return;
      landed.current = true;
      // No stored choice: switch it on (the server refuses if she has turned it off).
      // Already on: only refresh the click this visit came from.
      void save(data.choice === null ? { allowed: true, landing: true, auto: true } : { allowed: true, landing: true, refresh: true }, true);
    }).catch(() => undefined);
    return () => { live = false; };
    // Route changes only; a change of choice is her own action on the privacy page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  if (!enabled || path !== '/privacy') return null;
  // With no stored choice it is on by default: it starts on her next visit to the landing page.
  const on = choice !== false;
  return <>
    {!open && <button type="button" data-ev="ad_measurement_change" onClick={() => setOpen(true)} style={{ display: 'block', margin: '0 auto 24px', textDecoration: 'underline' }}>Ad measurement: {on ? 'on' : 'off'} · change</button>}
    {open && <section aria-label="Ad measurement choice" style={{ position: 'fixed', zIndex: 100, bottom: 12, left: 12, right: 12, margin: 'auto', maxWidth: 480, padding: 16, background: '#fff', color: '#32152b', border: '1px solid #ead9e2', borderRadius: 16, boxShadow: '0 4px 24px #32152b22', fontSize: 13 }}>
      <p style={{ margin: '0 0 10px' }}>Ad measurement is {on ? 'on' : 'off'}. When it is on, we share visits to our landing page and purchases with Meta to measure our ads. Your assessment answers and report stay private.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" data-ev="ad_measurement_on" disabled={busy} onClick={() => void save({ allowed: true })} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#c2185b', color: 'white' }}>{on ? 'Keep on' : 'Turn on'}</button>
        <button type="button" data-ev="ad_measurement_off" disabled={busy} onClick={() => void save({ allowed: false })} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #d5b9c8' }}>{on ? 'Turn off' : 'Keep off'}</button>
      </div>
      {error && <p role="status">Could not save your choice. Please try again.</p>}
    </section>}
  </>;
}

export function PurchasePixel({ orderId }: { orderId: string }) {
  useEffect(() => {
    // The server validates the paid order, original session and current consent,
    // then atomically allows at most one browser event. It returns no report data.
    fetch('/api/ads/purchase', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId }), keepalive: true })
      .then(r => r.ok ? r.json() : null).then(data => { if (data?.pixel) emitPixel(data.pixel); }).catch(() => undefined);
  }, [orderId]);
  return null;
}
