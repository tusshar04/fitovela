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

export function AdMeasurement() {
  const path = usePathname();
  const [choice, setChoice] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const landed = useRef(false);

  async function save(allowed: boolean, landing = false, refresh = false) {
    setBusy(true); setError(false);
    try {
      const fbclid = landing ? new URLSearchParams(window.location.search).get('fbclid') : null;
      const response = await fetch('/api/ads/preferences', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ allowed, landing, fbclid, refresh }) });
      if (!response.ok) throw new Error('Preference unavailable');
      const data = await response.json();
      setChoice(data.choice); setOpen(false);
      if (data.pixel) emitPixel(data.pixel);
    } catch { setError(true); } finally { setBusy(false); }
  }

  useEffect(() => {
    if (path !== '/' && path !== '/privacy') return;
    let live = true;
    fetch('/api/ads/preferences', { cache: 'no-store' }).then(r => r.json()).then(data => {
      if (!live) return;
      setEnabled(data.enabled); setChoice(data.choice);
      if (data.enabled && path === '/' && data.choice === null) setOpen(true);
      if (data.enabled && path === '/' && data.choice === true && !landed.current) { landed.current = true; void save(true, true, true); }
    }).catch(() => undefined);
    return () => { live = false; };
    // Route changes only; preferences are explicit user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  if (!enabled || (path !== '/' && path !== '/privacy')) return null;
  return <>
    {path === '/privacy' && !open && <button type="button" onClick={() => setOpen(true)} style={{ display: 'block', margin: '0 auto 24px', textDecoration: 'underline' }}>Ad measurement: {choice ? 'on' : 'off'} · change</button>}
    {open && <section aria-label="Ad measurement choice" style={{ position: 'fixed', zIndex: 100, bottom: 12, left: 12, right: 12, margin: 'auto', maxWidth: 480, padding: 16, background: '#fff', color: '#32152b', border: '1px solid #ead9e2', borderRadius: 16, boxShadow: '0 4px 24px #32152b22', fontSize: 13 }}>
      <p style={{ margin: '0 0 10px' }}>Allow ad measurement? We share visits and purchases with Meta to measure our ads. Your assessment answers and report stay private. <a href="/privacy" style={{ textDecoration: 'underline' }}>Privacy details</a></p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" disabled={busy} onClick={() => { landed.current = true; void save(true, path === '/'); }} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#c2185b', color: 'white' }}>Allow</button>
        <button type="button" disabled={busy} onClick={() => void save(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #d5b9c8' }}>No thanks</button>
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
