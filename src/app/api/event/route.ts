import { NextResponse } from 'next/server';
import { CLIENT_EVENTS, MAX_BODY, allowEvents, parseClientBatch } from '@/server/events';
import { currentSession, logEvent } from '@/server/session';
import { getStore } from '@/server/store';

const LEGACY = new Set(['scan_view', 'finding_view', 'analysing_view', 'lead_view', 'checkout_opened']);

/**
 * Behaviour events from the browser. Two shapes are accepted:
 * a batch `{ vid, sent, events: [{ n, t, p }] }` from the tracker, and the older single `{ name }`.
 * The reply never depends on what was stored, so a failed write cannot break the page.
 */
export async function POST(req: Request) {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  const text = await req.text().catch(() => '');
  if (text.length === 0 || text.length > MAX_BODY) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const session = await currentSession();
  const now = Date.now();
  const batch = parseClientBatch(body, { now, sessionId: session?.id, userAgent: req.headers.get('user-agent') });

  if (!batch) {
    const name = typeof (body as Record<string, unknown> | null)?.name === 'string' ? ((body as Record<string, unknown>).name as string) : '';
    if (!LEGACY.has(name) || !CLIENT_EVENTS.has(name)) return NextResponse.json({ error: 'Unknown event.' }, { status: 400 });
    await logEvent(name, session?.id);
    return NextResponse.json({ ok: true });
  }

  if (batch.events.length === 0) return NextResponse.json({ ok: true, stored: 0 });
  // Two brakes: one per visitor, and a looser one per address in case many visitors share it.
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const who = session?.id ?? batch.visitId ?? ip;
  if (!allowEvents(`v:${who}`, batch.events.length, now) || !allowEvents(`ip:${ip}`, batch.events.length, now, 4000)) {
    return NextResponse.json({ ok: true, stored: 0 }, { status: 429 });
  }
  try {
    const store = await getStore();
    await store.addEvents(batch.events);
  } catch (err) {
    console.error('event batch failed', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ ok: true, stored: 0 });
  }
  return NextResponse.json({ ok: true, stored: batch.events.length });
}
