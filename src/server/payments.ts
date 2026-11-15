// Checkout through Cashfree (the founder's choice, 2026-11-15). The older Razorpay
// code stays, unused unless its keys are set. With no keys at all, a demo checkout
// stands in during development; it refuses to run in production.

import { createHmac, timingSafeEqual } from 'node:crypto';

export type PaymentProvider = 'demo' | 'razorpay' | 'cashfree';

export function cashfreeConfigured(): boolean {
  return Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
}

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function activeProvider(): PaymentProvider | null {
  if (cashfreeConfigured()) return 'cashfree';
  if (razorpayConfigured()) return 'razorpay';
  if (process.env.NODE_ENV !== 'production' || process.env.DEMO_CHECKOUT === '1') return 'demo';
  return null;
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

/** Creates the Razorpay order the checkout pays against. Amount is in rupees here and paise on the wire. */
export async function createRazorpayOrder(input: { amountRupees: number; receipt: string; notes: Record<string, string> }): Promise<RazorpayOrder> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch(`${process.env.RAZORPAY_API_BASE_URL || 'https://api.razorpay.com'}/v1/orders`, {
    method: 'POST',
    headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
    body: JSON.stringify({ amount: input.amountRupees * 100, currency: 'INR', receipt: input.receipt.slice(0, 40), notes: input.notes }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => null)) as { id?: string; amount?: number; currency?: string } | null;
  if (!res.ok || !data?.id || data.amount !== input.amountRupees * 100) throw new Error(`razorpay order failed: http ${res.status}`);
  return { id: data.id, amount: data.amount, currency: data.currency ?? 'INR' };
}

/** The signature Razorpay hands the browser after a successful payment. */
export function verifyPaymentSignature(providerOrderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !providerOrderId || !paymentId || !signature) return false;
  return same(signature, createHmac('sha256', secret).update(`${providerOrderId}|${paymentId}`).digest('hex'));
}

/** The signature on a webhook call, over the exact bytes of the body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return same(signature, createHmac('sha256', secret).update(rawBody).digest('hex'));
}

// ---------------------------------------------------------------- Cashfree
//
// How a payment runs:
//   1. /api/order creates our order and a Cashfree order carrying her mobile number and
//      email, so Cashfree's page does not ask for them again.
//   2. The browser hands Cashfree's payment_session_id to their checkout, which takes
//      over the page.
//   3. Cashfree sends her back to /api/order/return, and separately calls
//      /api/webhooks/cashfree. Whichever arrives first delivers the plan.
// A plan is delivered only when Cashfree itself says the order is PAID for our amount
// (asked over its API), or a webhook signed with our secret key says so.

/** The API version these calls and the webhook payload were written against. */
const CASHFREE_API_VERSION = '2026-01-01';

export function cashfreeMode(): 'sandbox' | 'production' {
  return process.env.CASHFREE_ENV === 'sandbox' ? 'sandbox' : 'production';
}

function cashfreeBase(): string {
  if (process.env.CASHFREE_API_BASE_URL) return process.env.CASHFREE_API_BASE_URL.replace(/\/$/, '');
  return cashfreeMode() === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
}

/** Our order id as Cashfree knows it. The prefix keeps it starting with a letter. */
export function cashfreeOrderId(orderId: string): string {
  return `fv_${orderId}`;
}

export function fromCashfreeOrderId(id: unknown): string | null {
  return typeof id === 'string' && id.startsWith('fv_') && id.length > 3 ? id.slice(3) : null;
}

async function cashfreeCall(path: string, init?: { method: 'POST'; body: unknown }): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${cashfreeBase()}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      'x-client-id': process.env.CASHFREE_APP_ID ?? '',
      'x-client-secret': process.env.CASHFREE_SECRET_KEY ?? '',
      'x-api-version': CASHFREE_API_VERSION,
      accept: 'application/json',
      ...(init ? { 'content-type': 'application/json' } : {}),
    },
    body: init ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

export interface CashfreeOrderInput {
  orderId: string;
  amountRupees: number;
  phone: string;
  email: string;
  /** Where Cashfree sends her browser when the payment ends, paid or not. */
  returnUrl: string;
  /** Where Cashfree's server reports the payment. */
  notifyUrl: string;
  note: string;
  tags: Record<string, string>;
}

/** Creates the Cashfree order and returns the session id its checkout opens with. */
export async function createCashfreeOrder(input: CashfreeOrderInput): Promise<{ paymentSessionId: string }> {
  const { status, data } = await cashfreeCall('/orders', {
    method: 'POST',
    body: {
      order_id: cashfreeOrderId(input.orderId),
      order_amount: input.amountRupees,
      order_currency: 'INR',
      // Passing these is what saves her typing them again on Cashfree's page.
      customer_details: { customer_id: `fv${input.phone}`, customer_phone: input.phone, customer_email: input.email },
      order_meta: { return_url: input.returnUrl, notify_url: input.notifyUrl },
      order_note: input.note,
      order_tags: input.tags,
    },
  });
  const d = data as { payment_session_id?: unknown; order_amount?: unknown } | null;
  if (status !== 200 || typeof d?.payment_session_id !== 'string' || !d.payment_session_id || Number(d.order_amount) !== input.amountRupees) {
    throw new Error(`cashfree order failed: http ${status}`);
  }
  return { paymentSessionId: d.payment_session_id };
}

export type CashfreePaymentState = { state: 'paid'; paymentId?: string } | { state: 'pending' } | { state: 'unpaid' };

/**
 * Reads Cashfree's answer for one order. Paid only when the order is PAID, in rupees,
 * for exactly the amount we asked. Kept free of network calls so it can be tested.
 */
export function readCashfreeState(order: unknown, payments: unknown, amountRupees: number): CashfreePaymentState {
  const o = order as { order_status?: unknown; order_amount?: unknown; order_currency?: unknown } | null;
  const list = Array.isArray(payments) ? (payments as { payment_status?: unknown; cf_payment_id?: unknown }[]) : [];
  if (o?.order_status === 'PAID' && o.order_currency === 'INR' && Number(o.order_amount) === amountRupees) {
    const paid = list.find((p) => p?.payment_status === 'SUCCESS');
    return { state: 'paid', paymentId: paid?.cf_payment_id != null ? String(paid.cf_payment_id) : undefined };
  }
  // A UPI payment can sit with the bank for a while before it succeeds or fails.
  if (list.some((p) => p?.payment_status === 'PENDING')) return { state: 'pending' };
  return { state: 'unpaid' };
}

/** Asks Cashfree whether this order has been paid. Throws if Cashfree cannot be reached. */
export async function cashfreePaymentState(order: { id: string; amountRupees: number }): Promise<CashfreePaymentState> {
  const id = encodeURIComponent(cashfreeOrderId(order.id));
  const o = await cashfreeCall(`/orders/${id}`);
  if (o.status !== 200) throw new Error(`cashfree order lookup failed: http ${o.status}`);
  // The payments list adds the payment reference and tells a pending payment from none.
  const p = await cashfreeCall(`/orders/${id}/payments`).catch(() => ({ status: 0, data: null }));
  return readCashfreeState(o.data, p.status === 200 ? p.data : null, order.amountRupees);
}

/** Cashfree signs each webhook: base64 of HMAC-SHA256 over the timestamp header followed by the exact body. */
export function verifyCashfreeWebhook(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!secret || !timestamp || !signature) return false;
  return same(signature, createHmac('sha256', secret).update(timestamp + rawBody).digest('base64'));
}
