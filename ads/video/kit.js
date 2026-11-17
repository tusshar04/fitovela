// Shared engine for the text videos. Nothing plays by itself: window.seek(seconds) draws
// that moment, and render.mjs calls it once per frame.
//
// In the page:
//   data-en / data-hi          the text in each caption language (?lang=en or ?lang=hi)
//   data-in="2.5"              appears at 2.5 s, sliding from data-dx / data-dy (default 40 px below)
//   data-out="6"               gone by 6 s
//   data-s="0.9"               starts at this scale
//   data-wipe="1.2"            a bar that draws itself from the left at 1.2 s (a strike-through)
//   data-dim="1.2"             fades to half strength at 1.2 s
//   window.DURATION            length in seconds;  window.extra(t)  anything else a page needs

(() => {
  const LANG = new URLSearchParams(location.search).get('lang') === 'hi' ? 'hi' : 'en';
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const lerp = (a, b, p) => a + (b - a) * p;
  window.kit = { LANG, clamp, prog, ease, lerp };

  for (const el of document.querySelectorAll('[data-en]')) el.innerHTML = (LANG === 'hi' && el.dataset.hi) || el.dataset.en;

  const num = (v, fallback) => (v === undefined ? fallback : Number(v));
  const items = [...document.querySelectorAll('[data-in]')].map((el) => ({
    el,
    a: Number(el.dataset.in),
    b: el.dataset.out === undefined ? null : Number(el.dataset.out),
    dx: num(el.dataset.dx, 0),
    dy: num(el.dataset.dy, 40),
    s: num(el.dataset.s, 1),
    dur: num(el.dataset.dur, 0.5),
  }));
  const wipes = [...document.querySelectorAll('[data-wipe]')].map((el) => ({ el, a: Number(el.dataset.wipe) }));
  const dims = [...document.querySelectorAll('[data-dim]')].map((el) => ({ el, a: Number(el.dataset.dim) }));

  window.seek = (t) => {
    for (const it of items) {
      const p = ease(prog(t, it.a, it.a + it.dur));
      const o = it.b === null ? 0 : ease(prog(t, it.b - 0.3, it.b));
      it.el.style.visibility = p === 0 || o === 1 ? 'hidden' : 'visible';
      it.el.style.opacity = String(p * (1 - o));
      it.el.style.transform = `translate(${(1 - p) * it.dx}px, ${(1 - p) * it.dy - o * 30}px) scale(${lerp(it.s, 1, p)})`;
    }
    for (const w of wipes) w.el.style.transform = `scaleX(${ease(prog(t, w.a, w.a + 0.35))})`;
    for (const d of dims) d.el.style.opacity = String(lerp(1, 0.45, prog(t, d.a, d.a + 0.35)));
    if (window.extra) window.extra(t);
    // Two animation frames, so the picture is painted before it is photographed.
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))));
  };

  window.ready = (async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    await window.seek(0);
    return true;
  })();
})();
