import { NextResponse } from 'next/server';
import { checkinFlag, cleanSigns, weeksOpen, type Checkin } from '@/domain/intensive';
import { sendEmail } from '@/server/email';
import { reviewerAddress } from '@/server/reviewAuth';
import { logEvent } from '@/server/session';
import { getStore } from '@/server/store';

/** The weekly check-in on an intensive plan. The private plan token is the credential. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const token = typeof body?.token === 'string' ? body.token : '';
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });

  const store = await getStore();
  const order = await store.getOrderByPlanToken(token);
  if (!order || order.status !== 'paid' || !order.plan || order.track !== 'intensive' || !order.review) {
    return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
  }
  if (order.review.status !== 'approved') return NextResponse.json({ error: 'Your plan is not open for a check-in right now.' }, { status: 409 });

  const totalWeeks = Math.ceil(order.plan.days.length / 7);
  const checkins = order.checkins ?? [];
  if (weeksOpen(checkins, totalWeeks) >= totalWeeks) return NextResponse.json({ error: 'All your weeks are already open.' }, { status: 409 });

  const weightKg = Math.round(Number(body?.weightKg) * 10) / 10;
  if (!(weightKg >= 30 && weightKg <= 250)) return NextResponse.json({ error: 'Enter your weight today in kilograms.', field: 'weight' }, { status: 400 });
  const signs = cleanSigns(body?.signs);
  if (!signs) return NextResponse.json({ error: 'Tick what you noticed this week, or "None of these".', field: 'signs' }, { status: 400 });

  const previousKg = checkins.length > 0 ? checkins[checkins.length - 1].weightKg : (order.startKg ?? weightKg);
  const flagged = checkinFlag(previousKg, weightKg, signs);
  const checkin: Checkin = { week: weeksOpen(checkins, totalWeeks), weightKg, signs, at: new Date().toISOString(), flagged };
  order.checkins = [...checkins, checkin];
  if (flagged) order.review = { ...order.review, status: 'paused' };
  await store.saveOrder(order);
  await logEvent('checkin', order.sessionId, { week: checkin.week, flagged });

  if (flagged) {
    await sendEmail({
      to: reviewerAddress(),
      subject: 'Fitovela: an intensive plan was paused by a weekly check-in',
      text: ['A weekly check-in raised a stop sign and the plan is paused.', '', `Review it here: ${new URL(req.url).origin}/review`].join('\n'),
    });
  }
  return NextResponse.json({ ok: true, flagged });
}
