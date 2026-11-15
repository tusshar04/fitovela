// Checkout. Razorpay is not connected yet (founder's decision: later). Until it is,
// a demo checkout stands in, and it refuses to run in production.

export type PaymentProvider = 'demo' | 'razorpay';

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function activeProvider(): PaymentProvider | null {
  if (razorpayConfigured()) return 'razorpay';
  if (process.env.NODE_ENV !== 'production' || process.env.DEMO_CHECKOUT === '1') return 'demo';
  return null;
}
