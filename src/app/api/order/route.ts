import { NextResponse } from 'next/server';
import { buildAssessment } from '@/domain/assessment';
import { isComplete } from '@/domain/flow';
import { INTENSIVE_BLOCK_LABEL, intensiveBreakDue } from '@/domain/intensive';
import { TIERS } from '@/domain/offer';
import { isTierId, priceFor } from '@/domain/offer';
import { siteOrigin } from '@/server/origin';
import { activeProvider, cashfreeMode, cashfreeOrderId, createCashfreeOrder, createRazorpayOrder } from '@/server/payments';
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

  // The intensive track is offered only to women the rules allow, and never straight after 12 weeks of it.
  const track = body?.track === 'intensive' ? 'intensive' : 'standard';
  if (track === 'intensive') {
    const blocks = assessment.intensive.blocks;
    if (blocks.length > 0) {
      return NextResponse.json({ error: `The intensive plan is not available to you: ${INTENSIVE_BLOCK_LABEL[blocks[0]]}.` }, { status: 403 });
    }
    const earlier = (await (await getStore()).listPaidOrdersByPhone(phone)).filter((o) => o.track === 'intensive' && !o.movedToStandard && o.paidAt);
    if (intensiveBreakDue(earlier.map((o) => ({ days: TIERS[o.tier].days, paidAt: o.paidAt! })))) {
      return NextResponse.json({ error: 'You have just finished 12 weeks on the intensive plan. Take the standard plan for at least 4 weeks before another round.' }, { status: 403 });
    }
  }

  const provider = activeProvider();
  if (!provider) return NextResponse.json({ error: 'Payments are not switched on yet.' }, { status: 503 });

  session.lead = { email, phone, marketingOptIn: session.lead?.marketingOptIn ?? false, skipped: false, at: session.lead?.at ?? new Date().toISOString() };
  await saveSession(session);

  const order: Order = {
    id: newId(12),
    sessionId: session.id,
    tier: body.tier,
    track,
    amountRupees: priceFor(body.tier, session.offerStartedAt),
    status: 'created',
    provider,
    email,
    phone,
    createdAt: new Date().toISOString(),
    // Fixed now, so the browser confirmation and the webhook deliver the same link.
    planToken: newId(24),
  };
  let checkout: Record<string, unknown> | undefined;
  if (provider === 'cashfree') {
    try {
      const origin = siteOrigin(req);
      const cf = await createCashfreeOrder({
        orderId: order.id,
        amountRupees: order.amountRupees,
        phone,
        email,
        returnUrl: `${origin}/api/order/return?order=${encodeURIComponent(order.id)}`,
        notifyUrl: `${origin}/api/webhooks/cashfree`,
        note: `Fitovela ${TIERS[order.tier].name}`,
        tags: { tier: order.tier, track },
      });
      order.providerOrderId = cashfreeOrderId(order.id);
      checkout = { paymentSessionId: cf.paymentSessionId, mode: cashfreeMode() };
    } catch (err) {
      console.error((err as Error).message);
      return NextResponse.json({ error: 'We could not start the payment. Please try again in a minute.' }, { status: 502 });
    }
  } else if (provider === 'razorpay') {
    try {
      const rp = await createRazorpayOrder({ amountRupees: order.amountRupees, receipt: order.id, notes: { orderId: order.id, tier: order.tier, track } });
      order.providerOrderId = rp.id;
      checkout = {
        key: process.env.RAZORPAY_KEY_ID,
        order_id: rp.id,
        amount: rp.amount,
        currency: rp.currency,
        name: 'Fitovela',
        description: `${TIERS[order.tier].name}${track === 'intensive' ? ' (intensive)' : ''}`,
        prefill: { email, contact: `+91${phone}` },
        theme: { color: '#C2185B' },
      };
    } catch (err) {
      console.error((err as Error).message);
      return NextResponse.json({ error: 'We could not start the payment. Please try again in a minute.' }, { status: 502 });
    }
  }

  const store = await getStore();
  await store.saveOrder(order);
  await logEvent('order_created', session.id, { tier: order.tier, amount: order.amountRupees, track });
  return NextResponse.json({ orderId: order.id, amountRupees: order.amountRupees, provider, checkout });
}
