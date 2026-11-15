import { NextResponse } from 'next/server';
import { currentSession, logEvent, saveSession } from '@/server/session';
import { sanitizeAnswers } from '@/server/validate';

/** Merges one or more answers into the session. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: 'Your session has expired. Please start again.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { answers?: unknown } | null;
  const clean = sanitizeAnswers(body?.answers);
  const ids = Object.keys(clean);
  if (ids.length === 0) return NextResponse.json({ error: 'That answer was not recognised.' }, { status: 400 });

  session.answers = { ...session.answers, ...clean };
  await saveSession(session);
  for (const id of ids) await logEvent('question_answered', session.id, { question: id });
  return NextResponse.json({ ok: true });
}
