// Takes the screenshots the video is built from, out of the real app.
// Start the app first (npx next dev -p 3001 -H 127.0.0.1), then: node ads/video/capture.mjs
// It walks one synthetic visit: a made-up woman whose answers match insulin-resistant PCOS.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './cdp.mjs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:3001';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'shots');
mkdirSync(OUT, { recursive: true });

const page = await openPage({ width: 390, height: 720, scale: 2.5, mobile: true });
const save = async (name, { ext = 'png', ...opts } = {}) => {
  writeFileSync(join(OUT, `${name}.${ext}`), await page.shot(opts));
  console.log(`shots/${name}.${ext}`);
};
const post = (path, body) =>
  page.run(`fetch(${JSON.stringify(path)}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: ${JSON.stringify(JSON.stringify(body))} }).then((r) => r.status)`);
// The Next.js development badge is not part of the product.
const goto = async (url) => {
  await page.goto(url);
  await page.run(`(() => { const s = document.createElement('style'); s.textContent = 'nextjs-portal { display: none !important; }'; document.head.appendChild(s); })()`);
};
const tap = (selector, text) =>
  page.run(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.includes(${JSON.stringify(text)})); if (!el) throw new Error('not found: ' + ${JSON.stringify(text)}); el.click(); })()`);

try {
  await goto(`${BASE}/?h=a&c=pcos`);
  await post('/api/session', { ageBand: '18-29', hook: 'a', category: 'pcos' });
  await post('/api/session/answers', { answers: { struggle: 'eat_little', cycle: 'skip' } });

  // The hormone question, then the "reading your answers" screen that follows it.
  await goto(`${BASE}/quiz`);
  await page.sleep(800);
  await tap('.opt', 'Acne on the chin');
  await tap('.opt', 'Hair thinning');
  await page.sleep(200);
  await tap('.btn', 'Continue');
  await page.sleep(700);
  await save('scan');

  // The insulin question, before and after each tick.
  await tap('.btn', 'Next question');
  await page.sleep(600);
  await save('q0');
  await tap('.opt', 'Sugar cravings after meals');
  await page.sleep(350);
  await save('q1');
  await tap('.opt', 'Hungry again within two hours');
  await page.sleep(350);
  await save('q2');
  await tap('.opt', 'Weight sits mostly on my belly');
  await page.sleep(350);
  await save('q3');

  // The rest of her answers, straight through the API.
  await post('/api/session/answers', {
    answers: {
      hormone_signs: ['acne', 'hair_thin'],
      insulin_signs: ['cravings', 'hungry', 'belly'],
      cravings_time: 'within_hour',
      family: 'yes',
      inflam_signs: ['none'],
      thyroid_signs: ['none'],
      thyroid_dx: 'no',
      stress: ['none'],
      metrics: { age: 29, heightCm: 162, weightKg: 72, goalKg: 64 },
      activity: 'sedentary',
      safety: ['none'],
      meds: ['none'],
      cuisine: ['south', 'north'],
      diet: 'veg',
      avoid: ['none'],
    },
  });

  // "Building your report": frames taken as fast as possible while the ring fills, until the next screen appears.
  await goto(`${BASE}/quiz`);
  let frames = 0;
  while (frames < 60 && !(await page.run(`Boolean(document.querySelector('#lead-email'))`))) {
    await save(`build${String(frames).padStart(2, '0')}`, { format: 'jpeg', quality: 92, ext: 'jpg' });
    frames += 1;
  }
  writeFileSync(join(OUT, 'build.js'), `window.BUILD_FRAMES = ${frames};\n`);

  // The report and the paywall, whole pages.
  // NOTE (FTV-035, 2026-11-18): /result now sends a woman who can buy to /unlock, so this
  // 'result' frame saves the paywall. A new capture of the report needs a paid plan's
  // /plan/<token>/report page.
  await post('/api/session/lead', { skip: true });
  await goto(`${BASE}/result`);
  await page.sleep(1200);
  await save('result', { full: true });
  await goto(`${BASE}/unlock`);
  await page.sleep(1200);
  await save('unlock', { full: true });
} finally {
  await page.close();
}
