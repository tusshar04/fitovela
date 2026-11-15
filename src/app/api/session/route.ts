import { NextResponse } from 'next/server';
import { getStore, type Session } from '@/server/store';
import { logEvent, newId, setSessionCookie } from '@/server/session';
import { asCategory, asHook, isAgeBand, sanitizeAd } from '@/server/validate';

/** Starts a session when she taps her age on the landing page. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !isAgeBand(body.ageBand)) return NextResponse.json({ error: 'Pick your age to begin.' }, { status: 400 });

  const now = new Date().toISOString();
  const session: Session = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    hook: asHook(body.hook),
    category: asCategory(body.category),
    ageBand: body.ageBand,
    ad: sanitizeAd(body.ad),
    answers: {},
  };
  const store = await getStore();
  await store.saveSession(session);
  await setSessionCookie(session.id);
  await logEvent('age_selected', session.id, { ageBand: session.ageBand, hook: session.hook, category: session.category });
  return NextResponse.json({ ok: true });
}
