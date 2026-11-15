import { NextResponse } from 'next/server';
import { loginReviewer } from '@/server/reviewAuth';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!code || code.length > 200 || !(await loginReviewer(code))) {
    return NextResponse.json({ error: 'That code is not right.' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
