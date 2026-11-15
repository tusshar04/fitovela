import { NextResponse } from 'next/server';
import { buildAssessment } from '@/domain/assessment';
import { checkinFlag, cleanSigns, weeksOpen, type Checkin } from '@/domain/intensive';
import { sendEmail } from '@/server/email';
import { buildPlan } from '@/server/plans';
import { logEvent } from '@/server/session';
import { getStore } from '@/server/store';

/** The weekly check-in on an intensive plan. The private plan token is the credential. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const token = typeof body?.token === 'string' ? body.token : '';
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });

  const store = await getStore();
  const order = await store.getOrderByPlanToken(token);
  if (!order || order.status !== 'paid' || !order.plan || order.track !== 'intensive') {
    return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
  }
  if (order.plan.track !== 'intensive' || order.movedToStandard) return NextResponse.json({ error: 'Your plan no longer needs a check-in.' }, { status: 409 });

  const totalWeeks = Math.ceil(order.plan.days.length / 7);
  const checkins = order.checkins ?? [];
  const week = weeksOpen(checkins, totalWeeks);
  if (week >= totalWeeks) return NextResponse.json({ error: 'All your weeks are already open.' }, { status: 409 });

  const weightKg = Math.round(Number(body?.weightKg) * 10) / 10;
  if (!(weightKg >= 30 && weightKg <= 250)) return NextResponse.json({ error: 'Enter your weight today in kilograms.', field: 'weight' }, { status: 400 });
  const signs = cleanSigns(body?.signs);
  if (!signs) return NextResponse.json({ error: 'Tick what you noticed this week, or "None of these".', field: 'signs' }, { status: 400 });

  const previousKg = checkins.length > 0 ? checkins[checkins.length - 1].weightKg : (order.startKg ?? weightKg);
  const flagged = checkinFlag(previousKg, weightKg, signs, week);
  const checkin: Checkin = { week, weightKg, signs, at: new Date().toISOString(), flagged };
  order.checkins = [...checkins, checkin];

  // A stop sign ends the intensive plan on the spot: she gets the standard plan, with more food each day.
  if (flagged) {
    order.movedToStandard = { at: checkin.at, reason: 'checkin' };
    const session = await store.getSession(order.sessionId);
    const assessment = session ? buildAssessment(session.answers) : null;
    if (assessment) order.plan = buildPlan(order, assessment, 'standard');
  }
  await store.saveOrder(order);
  await logEvent('checkin', order.sessionId, { week, flagged });

  if (flagged) {
    await sendEmail({
      to: order.email,
      subject: 'Your Fitovela plan has changed to the standard plan',
      text: [
        'Your weekly check-in showed a sign that the intensive plan is too strict for you right now.',
        '',
        'You are now on the standard plan, with more food each day. Nothing else changes.',
        '',
        'If you feel faint, your heart races, you have strong belly pain or you cannot keep food down, see a doctor today.',
        '',
        `Open your plan: ${new URL(req.url).origin}/plan/${token}`,
        '',
        'Fitovela offers nutrition guidance. It does not diagnose or treat any medical condition.',
      ].join('\n'),
    });
  }
  return NextResponse.json({ ok: true, flagged });
}
