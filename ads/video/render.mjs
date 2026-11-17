// Turns video.html into MP4 files, one per caption language.
//   node ads/video/render.mjs                 both languages -> out/fitovela-quiz-en.mp4, -hi.mp4
//   node ads/video/render.mjs en              one language
//   node ads/video/render.mjs en --stills 1,4,8.5   PNG stills at those seconds, for checking
// Needs Google Chrome and ffmpeg. The screenshots in shots/ come from capture.mjs.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const FPS = 30;
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const stillsAt = args.includes('--stills') ? args[args.indexOf('--stills') + 1].split(',').map(Number) : null;
const langs = args.filter((a) => a === 'en' || a === 'hi');

for (const lang of langs.length ? langs : ['en', 'hi']) {
  const page = await openPage({ width: 1080, height: 1920 });
  try {
    await page.goto(`file://${HERE}/video.html?lang=${lang}`);
    await page.run('window.ready');
    const seconds = await page.run('window.DURATION');

    if (stillsAt) {
      mkdirSync(join(OUT, 'stills'), { recursive: true });
      for (const t of stillsAt) {
        await page.run(`window.seek(${t})`);
        const file = join(OUT, 'stills', `${lang}-${t.toFixed(2)}.png`);
        writeFileSync(file, await page.shot());
        console.log(file);
      }
      continue;
    }

    const file = join(OUT, `fitovela-quiz-${lang}.mp4`);
    const ffmpeg = spawn(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    const done = new Promise((resolve, reject) => ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))));

    const frames = Math.round(seconds * FPS);
    for (let f = 0; f < frames; f += 1) {
      await page.run(`window.seek(${f / FPS})`);
      const png = await page.shot();
      if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
      if (f % 90 === 0) console.log(`${lang}: ${Math.round((f / frames) * 100)}%`);
    }
    ffmpeg.stdin.end();
    await done;
    console.log(file);
  } finally {
    await page.close();
  }
}
