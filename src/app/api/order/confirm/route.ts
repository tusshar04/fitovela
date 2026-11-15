import { NextResponse } from 'next/server';
import { buildAssessment } from '@/domain/assessment';
import { TIERS } from '@/domain/offer';
import { sendEmail } from '@/server/email';
import { activeProvider } from '@/server/payments';
import { buildPlan } from '@/server/plans';
import { reviewerAddress } from '@/server/reviewAuth';
import { setLoginCookie } from '@/server/auth';
import { currentSession, logEvent, newId } from '@/server/session';
import { getStore } from '@/server/store';

/** Marks the order paid, builds the plan and emails the private link. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: 'Your session has expired. Please start again.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
  const store = await getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.sessionId !== session.id) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  if (order.status === 'paid' && order.planToken) return NextResponse.json({ planUrl: `/plan/${order.planToken}`, email: order.email });

  // Only the demo provider can be confirmed from the browser. A real provider must be
  // verified by signature on the server before anything is marked paid.
  if (order.provider !== 'demo' || activeProvider() !== 'demo') {
    return NextResponse.json({ error: 'Payments are not switched on yet.' }, { status: 503 });
  }

  const assessment = buildAssessment(session.answers);
  if (!assessment || !assessment.eligibility.eligible) return NextResponse.json({ error: 'This plan cannot be created.' }, { status: 409 });

  const tier = TIERS[order.tier];
  const intensive = order.track === 'intensive';
  if (intensive && assessment.intensive.blocks.length > 0) return NextResponse.json({ error: 'This plan cannot be created.' }, { status: 409 });

  order.plan = buildPlan(order, assessment, intensive ? 'intensive' : 'standard');
  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  order.planToken = newId(24);
  order.startKg = assessment.metrics.weightKg;
  // An intensive plan stays closed until a clinician has reviewed her answers.
  if (intensive) order.review = { status: 'pending', requestedAt: order.paidAt };
  await store.saveOrder(order);
  await logEvent('payment_confirmed', session.id, { tier: order.tier, amount: order.amountRupees, provider: order.provider, track: order.track ?? 'standard' });

  const origin = new URL(req.url).origin;
  const planUrl = `/plan/${order.planToken}`;
  const footer = ['', `To come back later, go to ${origin}/login and enter your mobile number ending ${order.phone.slice(-4)}.`, '', 'Fitovela offers nutrition guidance. It does not diagnose or treat any medical condition.'];
  if (intensive) {
    await sendEmail({
      to: order.email,
      subject: 'Your Fitovela intensive plan is with our clinician',
      text: ['Thank you. Your intensive plan is built.', '', 'Before it opens, a clinician reviews your answers. This usually takes less than 24 hours. We will email you as soon as it is done.', '', `You can check here: ${origin}${planUrl}`, ...footer].join('\n'),
    });
    await sendEmail({
      to: reviewerAddress(),
      subject: 'Fitovela: an intensive plan is waiting for your review',
      text: ['A customer has bought the intensive (800 to 1,000 kcal) plan.', '', `Review it here: ${origin}/review`].join('\n'),
    });
  } else {
    await sendEmail({
      to: order.email,
      subject: `Your Fitovela ${tier.name} is ready`,
      text: ['Your plan is ready.', '', `Open it here: ${origin}${planUrl}`, ...footer].join('\n'),
    });
  }

  await setLoginCookie(order.phone);
  return NextResponse.json({ planUrl, email: order.email });
}
