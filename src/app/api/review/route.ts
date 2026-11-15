import { NextResponse } from 'next/server';
import { buildAssessment } from '@/domain/assessment';
import { sendEmail } from '@/server/email';
import { buildPlan } from '@/server/plans';
import { reviewerAllowed } from '@/server/reviewAuth';
import { logEvent } from '@/server/session';
import { getStore } from '@/server/store';

type Action = 'approve' | 'standard' | 'resume';
const isAction = (v: unknown): v is Action => v === 'approve' || v === 'standard' || v === 'resume';

/**
 * The clinician's decision on an intensive order.
 * approve: open the plan. standard: move her to the standard plan. resume: reopen a paused plan.
 */
export async function POST(req: Request) {
  if (!(await reviewerAllowed())) return NextResponse.json({ error: 'Not allowed.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 600) : '';
  if (!isAction(body?.action)) return NextResponse.json({ error: 'Choose a decision.' }, { status: 400 });
  const action = body.action;

  const store = await getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.track !== 'intensive' || order.status !== 'paid' || !order.review || !order.planToken) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const status = order.review.status;
  if (action === 'approve' && status !== 'pending') return NextResponse.json({ error: 'This order is not waiting for a first review.' }, { status: 409 });
  if (action === 'resume' && status !== 'paused') return NextResponse.json({ error: 'This plan is not paused.' }, { status: 409 });
  if (action === 'standard' && status === 'declined') return NextResponse.json({ error: 'This order is already on the standard plan.' }, { status: 409 });

  const now = new Date().toISOString();
  const origin = new URL(req.url).origin;
  const planLink = `${origin}/plan/${order.planToken}`;
  let subject: string;
  let lines: string[];

  if (action === 'standard') {
    const session = await store.getSession(order.sessionId);
    const assessment = session ? buildAssessment(session.answers) : null;
    if (!assessment) return NextResponse.json({ error: 'Her answers could not be loaded, so the standard plan was not built.' }, { status: 409 });
    order.plan = buildPlan(order, assessment, 'standard');
    order.review = { ...order.review, status: 'declined', decidedAt: now, note: note || undefined };
    subject = 'Your Fitovela plan is ready';
    lines = ['Our clinician reviewed your answers and has put you on the standard plan instead of the intensive one.', ...(note ? ['', `Her note: ${note}`] : []), '', `Open your plan: ${planLink}`];
  } else {
    order.review = { ...order.review, status: 'approved', decidedAt: now, note: note || order.review.note };
    if (action === 'resume') order.checkins = (order.checkins ?? []).map((c) => (c.flagged ? { ...c, cleared: true } : c));
    subject = action === 'approve' ? 'Your Fitovela intensive plan is open' : 'Your Fitovela plan is open again';
    lines = [action === 'approve' ? 'Our clinician has reviewed your answers and your intensive plan is open.' : 'Our clinician has looked at your check-in and your plan is open again.', ...(note ? ['', `Her note: ${note}`] : []), '', `Open your plan: ${planLink}`];
  }

  await store.saveOrder(order);
  await logEvent('review_decision', order.sessionId, { action });
  await sendEmail({ to: order.email, subject, text: [...lines, '', 'Fitovela offers nutrition guidance. It does not diagnose or treat any medical condition.'].join('\n') });
  return NextResponse.json({ ok: true, status: order.review.status });
}
