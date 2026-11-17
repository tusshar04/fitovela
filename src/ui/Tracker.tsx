'use client';

// Records how each page is used: views, time on page, scroll depth, sections seen, taps
// (including taps on things that are not buttons), form fields touched, load speed and
// script errors. It runs on every page from the root layout.
//
// What it never records: what she types, which answer she picks, or any text from the
// assessment, her plan or her account. On those pages a tap is described by the kind of
// element only. Answers are already saved with her session by the server.

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { flush, safePath, track } from './track';

/** Pages whose button text is the same for everyone, so it is safe to store as a label. */
const TEXT_OK = new Set(['/', '/result', '/unlock', '/privacy', '/terms', '/refund', '/contact']);
const ENGAGED_AT = [3, 10, 20, 30, 60, 120, 300];
const SCROLL_AT = [25, 50, 75, 90, 100];
const INTERACTIVE = 'a,button,summary,input,select,textarea,label,[role="button"],[data-ev]';

/** Class names that say something about her (a selected option, a result level) are never stored. */
const STATE_CLASS = new Set(['on', 'bad', 'now', 'done', 'low', 'moderate', 'high', 'pop']);

function describe(el: Element, bare = false): string {
  if (bare) return el.tagName.toLowerCase();
  const classes = (typeof el.className === 'string' ? el.className : '')
    .split(/\s+/)
    .filter((c) => c && !STATE_CLASS.has(c) && !c.startsWith('__'))
    .slice(0, 2);
  return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${classes.length ? `.${classes.join('.')}` : ''}`.slice(0, 60);
}

function section(el: Element): string | undefined {
  return el.closest('[data-sec]')?.getAttribute('data-sec') ?? undefined;
}

function label(el: Element, path: string): string | undefined {
  const named = el.getAttribute('data-ev') ?? el.getAttribute('aria-label');
  if (named) return named;
  if (!TEXT_OK.has(path)) return undefined;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return undefined;
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60) || undefined;
}

function fieldName(el: Element): string {
  return (el.id || el.getAttribute('name') || el.getAttribute('type') || el.tagName.toLowerCase()).slice(0, 40);
}

interface PageState {
  path: string;
  startedAt: number;
  visibleSec: number;
  maxScroll: number;
  taps: number;
  dead: number;
  fields: number;
  errors: number;
  exits: number;
  lastExitSec: number;
  touched: boolean;
  engaged: Set<number>;
  scrolled: Set<number>;
  sections: Set<string>;
}

function newPage(path: string): PageState {
  return { path, startedAt: Date.now(), visibleSec: 0, maxScroll: 0, taps: 0, dead: 0, fields: 0, errors: 0, exits: 0, lastExitSec: -1, touched: false, engaged: new Set(), scrolled: new Set(), sections: new Set() };
}

export function Tracker() {
  const pathname = usePathname();
  const page = useRef<PageState | null>(null);
  const views = useRef(0);

  // One page view per screen, and a closing "page_exit" for the screen she left.
  useEffect(() => {
    try {
      const path = safePath(pathname ?? '/');
      const prev = page.current;
      if (prev && prev.path !== path) sendExit(prev, 'next');
      page.current = newPage(path);
      views.current += 1;
      const q = new URLSearchParams(window.location.search);
      const param = (k: string) => {
        const v = q.get(k);
        return v && /^[\w.-]{1,40}$/.test(v) ? v : undefined;
      };
      let ref: string | undefined;
      try {
        ref = views.current === 1 && document.referrer ? new URL(document.referrer).hostname : undefined;
      } catch {}
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const conn = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
      track('page_view', {
        path,
        n: views.current,
        ref,
        ad: param('utm_content'),
        src: param('utm_source'),
        hook: path === '/' ? param('h') : undefined,
        fb: q.has('fbclid') ? true : undefined,
        vw: window.innerWidth,
        vh: window.innerHeight,
        dpr: window.devicePixelRatio,
        conn: conn?.effectiveType,
        save: conn?.saveData || undefined,
        lang: navigator.language,
        nav: views.current === 1 ? nav?.type : 'spa',
        vis: document.visibilityState === 'visible',
      }, true);
    } catch {}
  }, [pathname]);

  useEffect(() => {
    const cur = () => page.current;
    const safe = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => {
      try {
        fn(...a);
      } catch {}
    };

    const touch = (kind: string) => {
      const p = cur();
      if (!p || p.touched) return;
      p.touched = true;
      track('first_touch', { path: p.path, kind, ms: Date.now() - p.startedAt });
    };

    // Time actually spent looking at the page (the clock stops while the tab is hidden).
    const tick = setInterval(safe(() => {
      const p = cur();
      if (!p || document.visibilityState !== 'visible') return;
      p.visibleSec += 1;
      if (ENGAGED_AT.includes(p.visibleSec) && !p.engaged.has(p.visibleSec)) {
        p.engaged.add(p.visibleSec);
        track('engaged', { path: p.path, s: p.visibleSec });
      }
    }), 1000);

    const onScroll = safe(() => {
      const p = cur();
      // The quiz scrolls itself to the top on every question; only her own scrolling counts.
      if (!p || !p.touched) return;
      const doc = document.documentElement;
      const total = Math.max(doc.scrollHeight, document.body.scrollHeight);
      if (total <= window.innerHeight + 40) return;
      const pct = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / total) * 100));
      if (pct > p.maxScroll) p.maxScroll = pct;
      for (const mark of SCROLL_AT) {
        if (pct >= mark && !p.scrolled.has(mark)) {
          p.scrolled.add(mark);
          track('scroll', { path: p.path, pct: mark, s: p.visibleSec });
        }
      }
    });

    let recent: { t: number; x: number; y: number }[] = [];
    let rageUntil = 0;
    const onClick = safe((e: MouseEvent) => {
      const p = cur();
      const target = e.target instanceof Element ? e.target : null;
      if (!p || !target) return;
      touch('tap');
      const hit = target.closest(INTERACTIVE);
      // Where on the page she tapped would give away which answer she chose, so on the assessment,
      // plan and account pages the position is dropped unless the element has a fixed name.
      const open = TEXT_OK.has(p.path);
      // Off the landing page, some blocks appear only for certain answers, so a tap that
      // misses every button is stored by its tag alone.
      const bare = p.path !== '/';
      const total = Math.max(document.documentElement.scrollHeight, 1);
      const y = open || hit?.hasAttribute('data-ev') ? Math.round((e.pageY / total) * 100) : undefined;

      const now = Date.now();
      recent = [...recent.filter((r) => now - r.t < 900), { t: now, x: e.clientX, y: e.clientY }];
      if (recent.length >= 3 && now > rageUntil && recent.every((r) => Math.abs(r.x - e.clientX) < 40 && Math.abs(r.y - e.clientY) < 40)) {
        rageUntil = now + 2000;
        track('rage_tap', { path: p.path, el: describe(hit ?? target, bare), sec: section(target), y });
      }

      if (!hit) {
        if (p.dead >= 30) return;
        p.dead += 1;
        track('tap_dead', { path: p.path, el: describe(target, bare), sec: section(target), y, s: p.visibleSec });
        return;
      }
      if (p.taps >= 80) return;
      p.taps += 1;
      let href: string | undefined;
      if (hit instanceof HTMLAnchorElement && hit.href) {
        try {
          const u = new URL(hit.href);
          href = u.origin === window.location.origin ? safePath(u.pathname) : u.hostname;
        } catch {}
      }
      const pressed = y === undefined ? null : hit.getAttribute('aria-pressed');
      track('tap', { path: p.path, el: describe(hit), label: label(hit, p.path), sec: section(hit), href, y, s: p.visibleSec, was_on: pressed === null ? undefined : pressed === 'true' });
    });

    const isField = (t: EventTarget | null): t is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
      t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
    const onFocusIn = safe((e: FocusEvent) => {
      const p = cur();
      if (!p || !isField(e.target) || p.fields >= 60) return;
      p.fields += 1;
      track('field_focus', { path: p.path, field: fieldName(e.target), s: p.visibleSec });
    });
    const onFocusOut = safe((e: FocusEvent) => {
      const p = cur();
      if (!p || !isField(e.target) || p.fields >= 60) return;
      p.fields += 1;
      const t = e.target;
      const filled = t instanceof HTMLInputElement && (t.type === 'checkbox' || t.type === 'radio') ? t.checked : t.value.length > 0;
      track('field_blur', { path: p.path, field: fieldName(t), filled, s: p.visibleSec });
    });

    const onToggle = safe((e: Event) => {
      const p = cur();
      const d = e.target;
      if (!p || !(d instanceof HTMLDetailsElement)) return;
      const summary = d.querySelector('summary');
      track('toggle', { path: p.path, el: describe(d), label: d.getAttribute('data-ev') ?? (summary ? label(summary, p.path) : undefined), sec: section(d), open: d.open });
    });

    const onError = safe((e: ErrorEvent) => {
      const p = cur();
      if (!p || p.errors >= 5) return;
      p.errors += 1;
      track('js_error', { path: p.path, msg: String(e.message ?? '').slice(0, 80), at: `${(e.filename ?? '').split('/').pop()?.split('?')[0] ?? ''}:${e.lineno ?? 0}` }, true);
    });
    const onRejection = safe((e: PromiseRejectionEvent) => {
      const p = cur();
      if (!p || p.errors >= 5) return;
      p.errors += 1;
      const reason = e.reason instanceof Error ? e.reason.message : String(e.reason ?? '');
      track('js_error', { path: p.path, msg: reason.slice(0, 80), at: 'promise' }, true);
    });

    const onHidden = safe(() => {
      const p = cur();
      if (p && document.visibilityState === 'hidden') sendExit(p, 'hidden');
    });
    const onPageHide = safe(() => {
      const p = cur();
      if (p) sendExit(p, 'leave');
    });

    // Sections: an element marked data-sec counts as seen once 40% of it is on screen, or, for a
    // section taller than the screen, once it fills half the screen.
    const seen = new WeakSet<Element>();
    const io = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(safe((entries: IntersectionObserverEntry[]) => {
          const p = cur();
          if (!p) return;
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            if (entry.intersectionRatio < 0.4 && entry.intersectionRect.height < window.innerHeight * 0.5) continue;
            const name = entry.target.getAttribute('data-sec');
            if (!name || p.sections.has(name)) continue;
            p.sections.add(name);
            track('section_view', { path: p.path, sec: name, s: p.visibleSec });
          }
        }), { threshold: [0.05, 0.1, 0.15, 0.2, 0.3, 0.4] })
      : null;
    const scan = safe(() => {
      if (!io) return;
      document.querySelectorAll('[data-sec]').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    });
    let scanTimer: ReturnType<typeof setTimeout> | null = null;
    const mo = typeof MutationObserver === 'function'
      ? new MutationObserver(() => {
          if (scanTimer) return;
          scanTimer = setTimeout(() => {
            scanTimer = null;
            scan();
          }, 300);
        })
      : null;
    scan();
    mo?.observe(document.body, { childList: true, subtree: true });

    // How fast the first page arrived, once it has settled.
    let lcp = 0;
    let po: PerformanceObserver | null = null;
    try {
      po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) lcp = Math.max(lcp, entry.startTime);
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    const perfTimer = setTimeout(safe(() => {
      const p = cur();
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!p || !nav) return;
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime;
      track('perf', {
        path: p.path,
        ttfb: Math.round(nav.responseStart),
        fcp: fcp ? Math.round(fcp) : undefined,
        lcp: lcp ? Math.round(lcp) : undefined,
        dcl: Math.round(nav.domContentLoadedEventEnd),
        load: nav.loadEventEnd ? Math.round(nav.loadEventEnd) : undefined,
        kb: nav.transferSize ? Math.round(nav.transferSize / 1024) : undefined,
      });
    }), 4000);

    const onPointer = safe(() => touch('touch'));
    const onWheel = safe(() => touch('wheel'));
    const onKey = safe(() => touch('key'));
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerdown', onPointer, { capture: true, passive: true });
    document.addEventListener('touchstart', onPointer, { capture: true, passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('toggle', onToggle, true);
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      clearInterval(tick);
      clearTimeout(perfTimer);
      if (scanTimer) clearTimeout(scanTimer);
      io?.disconnect();
      mo?.disconnect();
      po?.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('touchstart', onPointer, true);
      window.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('toggle', onToggle, true);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}

/** The closing record for a page: how long she looked, how far she scrolled, how much she tapped. */
function sendExit(p: PageState, why: 'next' | 'hidden' | 'leave'): void {
  try {
    if (p.exits >= 6 || p.lastExitSec === p.visibleSec) {
      flush(why !== 'next');
      return;
    }
    p.exits += 1;
    p.lastExitSec = p.visibleSec;
    track('page_exit', { path: p.path, why, s: p.visibleSec, max: p.maxScroll, taps: p.taps, dead: p.dead, touched: p.touched });
    flush(why !== 'next');
  } catch {}
}
