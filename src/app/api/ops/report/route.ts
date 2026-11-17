import { NextResponse } from 'next/server';
import { authorizedOps } from '@/server/opsAuth';
import { sendHourlyReport } from '@/server/reporting';

export async function POST(req: Request) {
  if (!authorizedOps(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await sendHourlyReport();
    return NextResponse.json({ result }, { status: result === 'failed' || result === 'uncertain' ? 502 : 200 });
  } catch {
    console.error('hourly report failed');
    return NextResponse.json({ error: 'Report failed' }, { status: 503 });
  }
}
