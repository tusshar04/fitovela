import { NextResponse } from 'next/server';
import { requestOtp, smsConfigured } from '@/server/auth';
import { cleanPhone } from '@/server/validate';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const phone = cleanPhone(body?.phone);
  if (!phone) return NextResponse.json({ error: 'Enter a 10-digit mobile number.' }, { status: 400 });

  const code = await requestOtp(phone);
  // Until an SMS provider is connected, development shows the code on the page.
  const devCode = !smsConfigured() && process.env.NODE_ENV !== 'production' ? code : undefined;
  return NextResponse.json({ ok: true, devCode });
}
