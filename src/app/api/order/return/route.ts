import { NextResponse } from 'next/server';
import { setLoginCookie } from '@/server/auth';
import { fulfilOrder } from '@/server/fulfil';
import { siteOrigin } from '@/server/origin';
import { cashfreePaymentState } from '@/server/payments';
import { currentSession, logEvent } from '@/server/session';
import { getStore } from '@/server/store';

export const dynamic = 'force-dynamic';

/**
 * Cashfree sends her browser here when the payment ends, whether she paid or not.
 * Nothing in the address is trusted: we ask Cashfree whether the order is paid, and
 * only then build the plan and take her to it. Otherwise she goes back to the paywall
 * with a short message.
 */
export async function GET(req: Request) {
  const origin = siteOrigin(req);
  const to = (path: string) => NextResponse.redirect(new URL(path, origin), 303);

  const id = new URL(req.url).searchParams.get('order') ?? '';
  const store = await getStore();
  const order = id ? await store.getOrder(id) : null;
  if (!order || order.provider !== 'cashfree') return to('/unlock');
  const session = await store.getSession(order.sessionId);
  if (!session) return to('/unlock');

  let paymentId: string | undefined;
  if (order.status !== 'paid') {
    let state;
    try {
      state = await cashfreePaymentState(order);
    } catch (err) {
      // Cashfree could not be reached. The webhook still delivers the plan if she paid.
      console.error((err as Error).message);
      return to('/unlock?pay=pending');
    }
    if (state.state !== 'paid') {
      await logEvent(state.state === 'pending' ? 'payment_pending' : 'payment_not_completed', session.id, { tier: order.tier });
      return to(`/unlock?pay=${state.state === 'pending' ? 'pending' : 'failed'}`);
    }
    paymentId = state.paymentId;
  }

  const result = await fulfilOrder(order, session, origin, paymentId);
  if (!result.ok) return to('/unlock?pay=error');
  // Log her in only on the browser that started this order.
  const current = await currentSession();
  if (current?.id === session.id) await setLoginCookie(order.phone);
  return to(`${result.planUrl}?new=1`);
}
