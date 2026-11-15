// Checkout through Razorpay. With no keys set, a demo checkout stands in during
// development; it refuses to run in production.

import { createHmac, timingSafeEqual } from 'node:crypto';

export type PaymentProvider = 'demo' | 'razorpay';

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function activeProvider(): PaymentProvider | null {
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
