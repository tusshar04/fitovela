// Payment checks: a plan is delivered only when these pass.

import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { activeProvider, cashfreeMode, cashfreeOrderId, fromCashfreeOrderId, readCashfreeState, verifyCashfreeWebhook, verifyPaymentSignature, verifyWebhookSignature } from '@/server/payments';

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

describe('cashfree', () => {
  const sign64 = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('base64');
  beforeEach(() => {
    process.env.CASHFREE_APP_ID = 'TEST_example_app_id';
    process.env.CASHFREE_SECRET_KEY = 'example-cashfree-secret';
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('is the provider when its keys are set, ahead of Razorpay', () => {
    expect(activeProvider()).toBe('cashfree');
    process.env.RAZORPAY_KEY_ID = 'rzp_test_example';
    process.env.RAZORPAY_KEY_SECRET = 'example-key-secret';
    expect(activeProvider()).toBe('cashfree');
    delete process.env.CASHFREE_SECRET_KEY;
    expect(activeProvider()).toBe('razorpay');
  });

  it('talks to production unless told to use the sandbox', () => {
    expect(cashfreeMode()).toBe('production');
    process.env.CASHFREE_ENV = 'sandbox';
    expect(cashfreeMode()).toBe('sandbox');
  });

  it('accepts a webhook only when the timestamp and exact body are signed with the secret key', () => {
    const body = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'fv_abc', order_amount: 399.0 } } });
    const ts = '1785401067911';
    const good = sign64('example-cashfree-secret', ts + body);
    expect(verifyCashfreeWebhook(body, ts, good)).toBe(true);
    expect(verifyCashfreeWebhook(`${body} `, ts, good)).toBe(false);
    expect(verifyCashfreeWebhook(body, '1785401067912', good)).toBe(false);
    expect(verifyCashfreeWebhook(body, ts, sign64('another-secret', ts + body))).toBe(false);
    expect(verifyCashfreeWebhook(body, null, good)).toBe(false);
    expect(verifyCashfreeWebhook(body, ts, null)).toBe(false);
    delete process.env.CASHFREE_SECRET_KEY;
    expect(verifyCashfreeWebhook(body, ts, sign64('', ts + body))).toBe(false);
  });

  it('counts an order as paid only when Cashfree says PAID, in rupees, for our amount', () => {
    const paid = { order_status: 'PAID', order_amount: 399, order_currency: 'INR' };
    const payments = [{ payment_status: 'FAILED', cf_payment_id: '1' }, { payment_status: 'SUCCESS', cf_payment_id: 4128924251 }];
    expect(readCashfreeState(paid, payments, 399)).toEqual({ state: 'paid', paymentId: '4128924251' });
    expect(readCashfreeState(paid, null, 399)).toEqual({ state: 'paid', paymentId: undefined });
    expect(readCashfreeState({ ...paid, order_amount: 199 }, payments, 399).state).toBe('unpaid');
    expect(readCashfreeState({ ...paid, order_currency: 'USD' }, payments, 399).state).toBe('unpaid');
    expect(readCashfreeState({ ...paid, order_status: 'ACTIVE' }, [{ payment_status: 'SUCCESS' }], 399).state).toBe('unpaid');
    expect(readCashfreeState({ ...paid, order_status: 'ACTIVE' }, [{ payment_status: 'PENDING' }], 399).state).toBe('pending');
    expect(readCashfreeState({ ...paid, order_status: 'ACTIVE' }, [{ payment_status: 'USER_DROPPED' }], 399).state).toBe('unpaid');
    expect(readCashfreeState(null, null, 399).state).toBe('unpaid');
  });

  it('maps order ids to Cashfree and back, and rejects ids it did not make', () => {
    expect(cashfreeOrderId('-tOzBPBNMhSydLhd')).toBe('fv_-tOzBPBNMhSydLhd');
    expect(fromCashfreeOrderId('fv_-tOzBPBNMhSydLhd')).toBe('-tOzBPBNMhSydLhd');
    expect(fromCashfreeOrderId('order_123')).toBeNull();
    expect(fromCashfreeOrderId('fv_')).toBeNull();
    expect(fromCashfreeOrderId(undefined)).toBeNull();
  });
});
