import { NextResponse } from 'next/server';
import { buildAssessment } from '@/domain/assessment';
import { isComplete } from '@/domain/flow';
import { isTierId, priceFor } from '@/domain/offer';
import { activeProvider } from '@/server/payments';
import { currentSession, logEvent, newId, saveSession } from '@/server/session';
import { getStore, type Order } from '@/server/store';
import { cleanEmail, cleanPhone } from '@/server/validate';

/** Creates an order at the price that is live right now. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: 'Your session has expired. Please start again.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!isTierId(body?.tier)) return NextResponse.json({ error: 'Choose a plan.' }, { status: 400 });

  if (!isComplete(session.answers)) return NextResponse.json({ error: 'Please finish the assessment first.' }, { status: 409 });
  const assessment = buildAssessment(session.answers);
  if (!assessment) return NextResponse.json({ error: 'Please finish the assessment first.' }, { status: 409 });
  if (!assessment.eligibility.eligible) {
    return NextResponse.json({ error: 'This plan is not right for you without speaking to us first.' }, { status: 403 });
  }

  const email = cleanEmail(body?.email) ?? session.lead?.email ?? null;
  const phone = cleanPhone(body?.phone) ?? session.lead?.phone ?? null;
  if (!email) return NextResponse.json({ error: 'Enter the email address to send your plan to.', field: 'email' }, { status: 400 });
  if (!phone) return NextResponse.json({ error: 'Enter a 10-digit mobile number. You will use it to log in.', field: 'phone' }, { status: 400 });

  const provider = activeProvider();
  if (provider !== 'demo') {
    // Razorpay is not connected yet. Fail closed rather than hand out plans.
    return NextResponse.json({ error: 'Payments are not switched on yet.' }, { status: 503 });
  }

  session.lead = { email, phone, marketingOptIn: session.lead?.marketingOptIn ?? false, skipped: false, at: session.lead?.at ?? new Date().toISOString() };
  await saveSession(session);

  const order: Order = {
    id: newId(12),
    sessionId: session.id,
    tier: body.tier,
    amountRupees: priceFor(body.tier, session.offerStartedAt),
    status: 'created',
    provider,
    email,
    phone,
    createdAt: new Date().toISOString(),
  };
  const store = await getStore();
  await store.saveOrder(order);
  await logEvent('order_created', session.id, { tier: order.tier, amount: order.amountRupees });
  return NextResponse.json({ orderId: order.id, amountRupees: order.amountRupees, provider });
}
