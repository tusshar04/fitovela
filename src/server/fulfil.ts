// Turns a paid order into a delivered plan. Called when her browser comes back from
// the payment page and from the provider's webhook, so it must be safe to run twice.

import { buildAssessment } from '@/domain/assessment';
import { TIERS } from '@/domain/offer';
import { sendEmail } from './email';
import { buildPlan } from './plans';
import { logEvent } from './session';
import { getStore, type Order, type Session } from './store';

export type Fulfilment = { ok: true; planUrl: string } | { ok: false; error: string };

export async function fulfilOrder(order: Order, session: Session, origin: string, providerPaymentId?: string): Promise<Fulfilment> {
  if (!order.planToken) return { ok: false, error: 'This order cannot be completed.' };
  const planUrl = `/plan/${order.planToken}`;
  if (order.status === 'paid' && order.plan) return { ok: true, planUrl };
  // Her browser and the webhook usually arrive within a second of each other. Looking
  // again here means the second one almost always finds the plan already delivered and
  // does not send the email twice. (It is not a lock: a rare double email is harmless.)
  const latest = await (await getStore()).getOrder(order.id);
  if (latest?.status === 'paid' && latest.plan) return { ok: true, planUrl };

  const assessment = buildAssessment(session.answers);
  if (!assessment || !assessment.eligibility.eligible) return { ok: false, error: 'This plan cannot be created.' };
  const intensive = order.track === 'intensive';
  if (intensive && assessment.intensive.blocks.length > 0) return { ok: false, error: 'This plan cannot be created.' };

  // The plan is seeded by the order id, so a second run builds the same plan.
  order.plan = buildPlan(order, assessment, intensive ? 'intensive' : 'standard');
  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  order.startKg = assessment.metrics.weightKg;
  if (providerPaymentId) order.providerPaymentId = providerPaymentId;
  const store = await getStore();
  await store.saveOrder(order);
  await logEvent('payment_confirmed', session.id, { tier: order.tier, amount: order.amountRupees, provider: order.provider, track: order.track ?? 'standard' });

  const tier = TIERS[order.tier];
  await sendEmail({
    to: order.email,
    subject: `Your Fitovela ${intensive ? 'intensive ' : ''}${tier.name} is ready`,
    text: [
      'Your plan is ready.',
      '',
      `Open it here: ${origin}${planUrl}`,
      ...(intensive ? ['', 'Week 1 is open now. Each new week opens after a short check-in.'] : []),
      '',
      `To come back later, go to ${origin}/login and enter your mobile number ending ${order.phone.slice(-4)}.`,
      '',
      'Fitovela offers nutrition guidance. It does not diagnose or treat any medical condition.',
    ].join('\n'),
  });
  return { ok: true, planUrl };
}
