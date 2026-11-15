import { NextResponse } from 'next/server';
import { setLoginCookie, verifyOtp } from '@/server/auth';
import { cleanPhone } from '@/server/validate';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const phone = cleanPhone(body?.phone);
  const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
  if (!phone || code.length !== 6) return NextResponse.json({ error: 'Enter the 6-digit code.' }, { status: 400 });

  if (!(await verifyOtp(phone, code))) return NextResponse.json({ error: 'That code is wrong or has expired. Request a new one.' }, { status: 401 });
  await setLoginCookie(phone);
  return NextResponse.json({ ok: true });
}
