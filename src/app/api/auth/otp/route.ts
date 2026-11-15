import { NextResponse } from 'next/server';
import { requestOtp } from '@/server/auth';
import { cleanPhone } from '@/server/validate';

const MESSAGE = {
  wait: 'We just sent you a code. Wait a minute before asking for another.',
  too_many: 'Too many codes requested for this number. Try again in an hour.',
  unavailable: 'We could not send the code just now. Please try again in a few minutes.',
} as const;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const phone = cleanPhone(body?.phone);
  if (!phone) return NextResponse.json({ error: 'Enter a 10-digit mobile number.' }, { status: 400 });

  const result = await requestOtp(phone);
  if (!result.ok) return NextResponse.json({ error: MESSAGE[result.reason] }, { status: result.reason === 'unavailable' ? 503 : 429 });
  return NextResponse.json({ ok: true, devCode: result.devCode });
}
