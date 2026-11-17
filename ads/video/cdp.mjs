// A very small Chrome DevTools client: starts headless Chrome with a throwaway
// profile and drives one page. No dependencies; needs Node 22+ and Google Chrome.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openPage({ width, height, scale = 1, mobile = false, port = 9333 }) {
  const profile = mkdtempSync(join(tmpdir(), 'fitovela-ads-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 50 && !target; i += 1) {
    await sleep(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) {
    chrome.kill();
    throw new Error('Chrome did not start');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let nextId = 0;
  const waiting = new Map();
  const listeners = new Set();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const l of listeners) l(msg);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      nextId += 1;
      waiting.set(nextId, { resolve, reject });
      ws.send(JSON.stringify({ id: nextId, method, params }));
    });

  const once = (method) =>
    new Promise((resolve) => {
      const l = (msg) => {
        if (msg.method === method) {
          listeners.delete(l);
          resolve(msg.params);
        }
      };
      listeners.add(l);
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });

  return {
    send,
    sleep,
    async goto(url) {
      const loaded = once('Page.loadEventFired');
      await send('Page.navigate', { url });
      await loaded;
    },
    /** Runs an expression in the page and returns its value; promises are awaited. */
    async run(expression) {
      const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
      return res.result.value;
    },
    /** PNG of the viewport, or of the whole page when full is true. */
    async shot({ full = false, format = 'png', quality } = {}) {
      const params = { format, ...(quality ? { quality } : {}) };
      if (full) {
        // Make the window as tall as the page, so bars pinned to the screen edge sit at the very top or bottom.
        const { cssContentSize } = await send('Page.getLayoutMetrics');
        const tall = Math.ceil(cssContentSize.height);
        await send('Emulation.setDeviceMetricsOverride', { width, height: tall, deviceScaleFactor: scale, mobile });
        await sleep(400);
        const { data } = await send('Page.captureScreenshot', params);
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
        return Buffer.from(data, 'base64');
      }
      const { data } = await send('Page.captureScreenshot', params);
      return Buffer.from(data, 'base64');
    },
    async close() {
      ws.close();
      chrome.kill();
      await sleep(300);
      rmSync(profile, { recursive: true, force: true });
    },
  };
}
