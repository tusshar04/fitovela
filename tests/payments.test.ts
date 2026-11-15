// Razorpay signatures: a plan is delivered only when these match.

import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { activeProvider, verifyPaymentSignature, verifyWebhookSignature } from '@/server/payments';

const sign = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex');
const saved = { ...process.env };

describe('razorpay signatures', () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_example';
    process.env.RAZORPAY_KEY_SECRET = 'example-key-secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'example-webhook-secret';
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('accepts a payment only with the signature for that order and payment', () => {
    const good = sign('example-key-secret', 'order_A|pay_1');
    expect(verifyPaymentSignature('order_A', 'pay_1', good)).toBe(true);
    expect(verifyPaymentSignature('order_B', 'pay_1', good)).toBe(false);
    expect(verifyPaymentSignature('order_A', 'pay_2', good)).toBe(false);
    expect(verifyPaymentSignature('order_A', 'pay_1', sign('wrong-secret', 'order_A|pay_1'))).toBe(false);
    expect(verifyPaymentSignature('order_A', 'pay_1', '')).toBe(false);
  });

  it('accepts a webhook only when the body is signed with the webhook secret', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(verifyWebhookSignature(body, sign('example-webhook-secret', body))).toBe(true);
    expect(verifyWebhookSignature(`${body} `, sign('example-webhook-secret', body))).toBe(false);
    expect(verifyWebhookSignature(body, sign('example-key-secret', body))).toBe(false);
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });

  it('refuses everything when the secrets are missing', () => {
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    expect(verifyPaymentSignature('order_A', 'pay_1', sign('', 'order_A|pay_1'))).toBe(false);
    expect(verifyWebhookSignature('{}', sign('', '{}'))).toBe(false);
  });

  it('uses Razorpay when keys are set, and has no checkout at all in production without them', () => {
    expect(activeProvider()).toBe('razorpay');
    delete process.env.RAZORPAY_KEY_ID;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    expect(activeProvider()).toBeNull();
  });
});
