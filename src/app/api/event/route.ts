import { NextResponse } from 'next/server';
import { currentSession, logEvent } from '@/server/session';

const ALLOWED = new Set(['scan_view', 'finding_view', 'analysing_view', 'lead_view', 'checkout_opened']);

/** Funnel steps that only the browser knows about. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name : '';
  if (!ALLOWED.has(name)) return NextResponse.json({ error: 'Unknown event.' }, { status: 400 });
  const session = await currentSession();
  await logEvent(name, session?.id);
  return NextResponse.json({ ok: true });
}
