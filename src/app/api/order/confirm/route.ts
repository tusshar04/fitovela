import { NextResponse } from 'next/server';
import { setLoginCookie } from '@/server/auth';
import { fulfilOrder } from '@/server/fulfil';
import { siteOrigin } from '@/server/origin';
import { activeProvider, verifyPaymentSignature } from '@/server/payments';
import { currentSession } from '@/server/session';
import { getStore } from '@/server/store';

/** Called by the browser after checkout. Checks the payment, builds the plan and emails the private link. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: 'Your session has expired. Please start again.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const text = (k: string) => (typeof body?.[k] === 'string' ? (body[k] as string) : '');
  const store = await getStore();
  const order = await store.getOrder(text('orderId'));
  if (!order || order.sessionId !== session.id) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  let paymentId: string | undefined;
  if (order.status !== 'paid') {
    if (order.provider === 'razorpay') {
      // Paid only if Razorpay's signature matches the order we created.
      paymentId = text('razorpay_payment_id');
      if (!order.providerOrderId || text('razorpay_order_id') !== order.providerOrderId || !verifyPaymentSignature(order.providerOrderId, paymentId, text('razorpay_signature'))) {
        return NextResponse.json({ error: 'We could not confirm this payment. If money left your account, write to us and we will sort it out.' }, { status: 400 });
      }
    } else if (activeProvider() !== 'demo') {
      // The demo checkout exists only where no real provider is configured.
      return NextResponse.json({ error: 'Payments are not switched on yet.' }, { status: 503 });
    }
  }

  const result = await fulfilOrder(order, session, siteOrigin(req), paymentId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  await setLoginCookie(order.phone);
  return NextResponse.json({ planUrl: result.planUrl, email: order.email });
}
