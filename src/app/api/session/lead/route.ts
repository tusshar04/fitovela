import { NextResponse } from 'next/server';
import { currentSession, logEvent, saveSession } from '@/server/session';
import { cleanEmail, cleanPhone } from '@/server/validate';

/** Saves her email (for the report and plan) and mobile number (her login), or records a skip. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: 'Your session has expired. Please start again.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const at = new Date().toISOString();

  if (body?.skip === true) {
    session.lead = { marketingOptIn: false, skipped: true, at };
    await saveSession(session);
    await logEvent('lead_skipped', session.id);
    return NextResponse.json({ ok: true });
  }

  const email = cleanEmail(body?.email);
  const phone = cleanPhone(body?.phone);
  if (!email) return NextResponse.json({ error: 'Enter a valid email address.', field: 'email' }, { status: 400 });
  if (!phone) return NextResponse.json({ error: 'Enter a 10-digit mobile number.', field: 'phone' }, { status: 400 });

  session.lead = { email, phone, marketingOptIn: body?.marketingOptIn === true, skipped: false, at };
  await saveSession(session);
  await logEvent('lead_captured', session.id, { marketingOptIn: session.lead.marketingOptIn });
  return NextResponse.json({ ok: true });
}
