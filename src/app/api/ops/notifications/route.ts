import { NextResponse } from 'next/server';
import { authorizedOps } from '@/server/opsAuth';
import { retryOrderAlerts } from '@/server/slack';

export async function POST(req: Request) {
  if (!authorizedOps(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const checked = await retryOrderAlerts();
    return NextResponse.json({ checked });
  } catch {
    console.error('order notification recovery failed');
    return NextResponse.json({ error: 'Recovery failed' }, { status: 503 });
  }
}
