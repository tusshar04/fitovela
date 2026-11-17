// Sends behaviour events to our own server in small batches. See src/server/events.ts for
// what is accepted. Never pass an answer, a typed value or a contact detail to track().

type Props = Record<string, string | number | boolean | undefined | null>;
interface Queued { n: string; t: number; p?: Record<string, string | number | boolean> }

const queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let memoryId = '';

/** A random number kept for this browser tab only. It is not a cookie and says nothing about her. */
export function visitId(): string {
  if (memoryId) return memoryId;
  try {
    const saved = window.sessionStorage.getItem('fv_vid');
    if (saved) return (memoryId = saved);
  } catch {}
  const bytes = new Uint8Array(12);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  memoryId = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  try {
    window.sessionStorage.setItem('fv_vid', memoryId);
  } catch {}
  return memoryId;
}

/** Sends what is queued. `leaving` uses sendBeacon, which survives the page closing. */
export function flush(leaving = false): void {
  try {
    send(leaving);
  } catch {}
}

function send(leaving: boolean): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0 || typeof window === 'undefined') return;
  const events = queue.splice(0, 40);
  const body = JSON.stringify({ vid: visitId(), sent: Date.now(), events });
  try {
    if (leaving && typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/event', new Blob([body], { type: 'application/json' }))) {
      if (queue.length > 0) send(true);
      return;
    }
  } catch {}
  fetch('/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  if (queue.length > 0) send(leaving);
}

/** Never throws: a failure to record must not stop a button from doing its job. */
export function track(name: string, props?: Props, now = false): void {
  if (typeof window === 'undefined') return;
  try {
    let p: Record<string, string | number | boolean> | undefined;
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined || v === null || v === '') continue;
        (p ??= {})[k] = v;
      }
    }
    if (queue.length > 400) queue.splice(0, queue.length - 400);
    queue.push({ n: name, t: Date.now(), ...(p ? { p } : {}) });
    if (now || queue.length >= 20) flush();
    else if (!timer) timer = setTimeout(() => flush(), 1500);
  } catch {}
}

/** Private links carry a token in the address; store the shape of the path, not the token. */
export function safePath(pathname: string): string {
  return (
    pathname
      .split('/')
      .map((seg, i, all) => (seg.length > 20 || (all[1] === 'plan' && i === 2) ? ':id' : seg))
      .join('/')
      .slice(0, 60) || '/'
  );
}
