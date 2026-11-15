import { NextResponse } from 'next/server';
import { fulfilOrder } from '@/server/fulfil';
import { siteOrigin } from '@/server/origin';
import { verifyWebhookSignature } from '@/server/payments';
import { getStore } from '@/server/store';

interface PaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  status?: string;
  notes?: Record<string, string>;
}

/**
 * Razorpay calls this when a payment is captured. It delivers the plan even if
 * the customer closed the page before the browser could confirm.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'))) return NextResponse.json({ error: 'Bad signature.' }, { status: 401 });

  let event: { event?: string; payload?: { payment?: { entity?: PaymentEntity } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad body.' }, { status: 400 });
  }
  // Other events (failed, refunds) need no action here: an unpaid order simply stays unpaid.
  if (event.event !== 'payment.captured' && event.event !== 'order.paid') return NextResponse.json({ ok: true, ignored: true });

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.notes?.orderId;
  if (!payment?.id || !payment.order_id || !orderId) return NextResponse.json({ ok: true, ignored: true });

  const store = await getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.provider !== 'razorpay' || order.providerOrderId !== payment.order_id) return NextResponse.json({ ok: true, ignored: true });
  if (payment.amount !== order.amountRupees * 100) {
    console.error(`razorpay webhook: amount mismatch on order ${order.id}`);
    return NextResponse.json({ error: 'Amount mismatch.' }, { status: 400 });
  }

  const session = await store.getSession(order.sessionId);
  if (!session) return NextResponse.json({ error: 'Session missing.' }, { status: 409 });
  const result = await fulfilOrder(order, session, siteOrigin(req), payment.id);
  // A 5xx makes Razorpay retry later.
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: 500 });
}
