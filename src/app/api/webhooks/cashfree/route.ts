import { NextResponse } from 'next/server';
import { fulfilOrder } from '@/server/fulfil';
import { siteOrigin } from '@/server/origin';
import { cashfreeConfigured, fromCashfreeOrderId, verifyCashfreeWebhook } from '@/server/payments';
import { getStore } from '@/server/store';
import { cashfreeRefundRecord } from '@/server/refunds';

interface CashfreeEvent {
  type?: string;
  data?: {
    order?: { order_id?: string; order_amount?: number; order_currency?: string };
    payment?: { cf_payment_id?: string | number; payment_status?: string };
    refund?: Record<string, unknown>;
  };
}

/**
 * Cashfree calls this when a payment succeeds. It delivers the plan even if she
 * never comes back to the site, for example after paying in her UPI app.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!cashfreeConfigured()) return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  if (!verifyCashfreeWebhook(raw, req.headers.get('x-webhook-timestamp'), req.headers.get('x-webhook-signature'))) {
    return NextResponse.json({ error: 'Bad signature.' }, { status: 401 });
  }


  let event: CashfreeEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad body.' }, { status: 400 });
  }
  if (event.type === 'REFUND_STATUS_WEBHOOK' && event.data?.refund) {
    const refund = event.data.refund;
    const id = fromCashfreeOrderId(refund.order_id);
    const store = await getStore();
    const order = id ? await store.getOrder(id) : null;
    if (!order) return NextResponse.json({ ok: true, ignored: true });
    try {
      const record = cashfreeRefundRecord(refund, order);
      if (record) await store.saveRefund(record);
      return NextResponse.json({ ok: true });
    } catch {
      // Retry if the paid snapshot has not arrived yet. Never log raw payloads.
      return NextResponse.json({ error: 'Refund could not be reconciled.' }, { status: 409 });
    }
  }
  // Failed and dropped payments need no action here: an unpaid order simply stays unpaid.
  const payment = event.data?.payment;
  if (event.type !== 'PAYMENT_SUCCESS_WEBHOOK' || payment?.payment_status !== 'SUCCESS') return NextResponse.json({ ok: true, ignored: true });

  // Orders we did not create (Cashfree's test webhook, for one) are acknowledged and ignored.
  const orderId = fromCashfreeOrderId(event.data?.order?.order_id);
  const store = await getStore();
  const order = orderId ? await store.getOrder(orderId) : null;
  if (!order || order.provider !== 'cashfree') return NextResponse.json({ ok: true, ignored: true });
  if (event.data?.order?.order_currency !== 'INR' || Number(event.data.order.order_amount) !== order.amountRupees) {
    console.error(`cashfree webhook: amount mismatch on order ${order.id}`);
    return NextResponse.json({ error: 'Amount mismatch.' }, { status: 400 });
  }

  const session = await store.getSession(order.sessionId);
  if (!session) return NextResponse.json({ error: 'Session missing.' }, { status: 409 });
  const result = await fulfilOrder(order, session, siteOrigin(req), payment.cf_payment_id != null ? String(payment.cf_payment_id) : undefined);
  // Anything but a 200 makes Cashfree try again later.
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: 500 });
}
