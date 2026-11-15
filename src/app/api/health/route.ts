import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ ok: true, release: process.env.APP_GIT_SHA ?? 'dev' });
}
