import { NextResponse } from 'next/server';
import { buildAssessment } from '@/domain/assessment';
import { TIERS } from '@/domain/offer';
import { generatePlan } from '@/domain/plan/generator';
import { sendEmail } from '@/server/email';
import { activeProvider } from '@/server/payments';
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
  order.plan = generatePlan({
    seed: order.id,
    days: tier.days,
    targetKcal: assessment.energy.targetKcal,
    typeId: assessment.result.type,
    cuisines: assessment.cuisines,
    diet: assessment.diet,
    avoid: assessment.avoid,
    weekOneLighterOn: assessment.weekOneLighterOn,
    medicationAdvisory: assessment.eligibility.medicationAdvisory,
    movement: assessment.energy.movement,
  });
  order.plan.journey = assessment.journey;
  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  order.planToken = newId(24);
  await store.saveOrder(order);
  await logEvent('payment_confirmed', session.id, { tier: order.tier, amount: order.amountRupees, provider: order.provider });

  const origin = new URL(req.url).origin;
  const planUrl = `/plan/${order.planToken}`;
  await sendEmail({
    to: order.email,
    subject: `Your Fitovela ${tier.name} is ready`,
    text: [
      'Your plan is ready.',
      '',
      `Open it here: ${origin}${planUrl}`,
      '',
      `To come back later, go to ${origin}/login and enter your mobile number ending ${order.phone.slice(-4)}.`,
      '',
      'Fitovela offers nutrition guidance. It does not diagnose or treat any medical condition.',
    ].join('\n'),
  });

  await setLoginCookie(order.phone);
  return NextResponse.json({ planUrl, email: order.email });
}
