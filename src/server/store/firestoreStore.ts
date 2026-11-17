// Production driver. Same project conventions as tarot: the project id comes from
// GOOGLE_CLOUD_PROJECT and credentials from the Cloud Run service account.
// NOTE: not yet exercised against a real Firestore database; test before launch.

import { Firestore } from '@google-cloud/firestore';
import { canClaimMeta, refreshedAdClick } from '@/domain/meta';
import type { AdConsent, MetaDelivery } from '@/domain/meta';
import { purchaseDelivery } from '../metaEvents';
import { paidSummary } from './paidSummary';
import type { DeliveryRecord, EventRecord, Order, PaidOrderSummary, OtpRecord, RefundRecord, Session, Store } from './types';

let db: Firestore | null = null;

function firestore(): Firestore {
  if (!db) {
    db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
      ignoreUndefinedProperties: true,
    });
  }
  return db;
}

async function get<T>(collection: string, id: string): Promise<T | null> {
  const snap = await firestore().collection(collection).doc(id).get();
  return snap.exists ? (snap.data() as T) : null;
}

export const firestoreStore: Store = {
  getAdConsent: id => get<AdConsent>('adConsents', id),
  async saveAdConsent(c) { await firestore().collection('adConsents').doc(c.id).set(c); },
  async refreshAdClick(id, fbclid, now) {
    const ref = firestore().collection('adConsents').doc(id);
    return firestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      const c = refreshedAdClick(snap.exists ? snap.data() as AdConsent : null, fbclid, now);
      if (c) tx.set(ref, c);
      return c;
    });
  },
  async claimMetaDelivery(id, now) {
    const ref = firestore().collection('metaDeliveries').doc(id);
    return firestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      const d = snap.data() as MetaDelivery | undefined;
      if (!d || !canClaimMeta(d, Date.parse(now))) return null;
      const claimed: MetaDelivery = { ...d, state: 'sending', attempts: d.attempts + 1, updatedAt: now };
      tx.set(ref, claimed);
      return claimed;
    });
  },
  async finishMetaDelivery(id, attempt, state, now) {
    const ref = firestore().collection('metaDeliveries').doc(id);
    await firestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.data()?.attempts === attempt) tx.update(ref, { state, updatedAt: now });
    });
  },
  async claimBrowserPurchase(id, consentId, now) {
    const ref = firestore().collection('metaDeliveries').doc(id);
    return firestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      const d = snap.data() as MetaDelivery | undefined;
      if (!d || d.consentId !== consentId || d.browserSentAt || d.state === 'stopped' || Date.parse(now) - d.event.event_time * 1000 > 86400000) return null;
      tx.update(ref, { browserSentAt: now });
      return d;
    });
  },
  async listPendingMetaDeliveries() {
    // Only the last day can be retried; old/exhausted rows cannot starve new purchases.
    const snap = await firestore().collection('metaDeliveries').where('event.event_time', '>=', Math.floor(Date.now() / 1000) - 86400).get();
    return snap.docs.map(d => d.data() as MetaDelivery).filter(d => canClaimMeta(d, Date.now())).slice(0, 10);
  },
  getSession: (id) => get<Session>('sessions', id),
  async saveSession(s) {
    await firestore().collection('sessions').doc(s.id).set(s);
  },

  getOrder: (id) => get<Order>('orders', id),
  async saveOrder(o) {
    await firestore().collection('orders').doc(o.id).set(o);
  },
  async commitPaidOrder(order) {
    const ref = firestore().collection('orders').doc(order.id);
    return firestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      const current = snap.data() as Order | undefined;
      if (current?.status === 'paid' && current.plan) {
        if (!current.providerPaymentId && order.providerPaymentId) {
          current.providerPaymentId = order.providerPaymentId;
          tx.update(ref, { providerPaymentId: order.providerPaymentId });
        }
        return { order: current, created: false };
      }
      if (!current) throw new Error('Order missing during fulfilment');
      tx.set(ref, order);
      const meta = purchaseDelivery(order);
      if (meta) tx.create(firestore().collection('metaDeliveries').doc(meta.id), meta);
      const id = `order-${order.id}`;
      tx.create(firestore().collection('deliveries').doc(id), { id, state: 'pending', attempt: '', updatedAt: order.paidAt, order: paidSummary(order) });
      return { order, created: true };
    });
  },
  async recordPaidPaymentReference(id, paymentId) {
    const ref = firestore().collection('orders').doc(id);
    return firestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      const order = snap.exists ? snap.data() as Order : null;
      if (order?.status === 'paid' && !order.providerPaymentId) {
        tx.update(ref, { providerPaymentId: paymentId });
        order.providerPaymentId = paymentId;
      }
      return order;
    });
  },
  async listPaidOrders(start, end) {
    const snap = await firestore().collection('orders').where('paidAt', '>=', start).where('paidAt', '<', end)
      .select('id', 'sessionId', 'tier', 'amountRupees', 'status', 'provider', 'paidAt', 'createdAt').get();
    return snap.docs.map(d => d.data() as PaidOrderSummary).filter(o => o.status === 'paid' && o.provider !== 'demo');
  },
  async getOrderByPlanToken(token) {
    const snap = await firestore().collection('orders').where('planToken', '==', token).limit(1).get();
    return snap.empty ? null : (snap.docs[0].data() as Order);
  },
  async listPaidOrdersByPhone(phone) {
    const snap = await firestore().collection('orders').where('phone', '==', phone).where('status', '==', 'paid').get();
    return snap.docs.map((d) => d.data() as Order).sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));
  },

  getOtp: (phone) => get<OtpRecord>('otps', phone),
  async saveOtp(r) {
    await firestore().collection('otps').doc(r.phone).set(r);
  },
  async deleteOtp(phone) {
    await firestore().collection('otps').doc(phone).delete();
  },

  async addEvent(event: EventRecord) {
    await firestore().collection('events').add(event);
  },
  async addEvents(events: EventRecord[]) {
    if (events.length === 0) return;
    const batch = firestore().batch();
    for (const e of events) batch.create(firestore().collection('events').doc(), e);
    await batch.commit();
  },
  async claimDelivery(id, attempt, now) {
    const ref = firestore().collection('deliveries').doc(id);
    return firestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      const current = snap.data() as DeliveryRecord | undefined;
      // A stale in-flight attempt is uncertain, not safe to resend: Slack has no
      // idempotency key. Operators can reconcile it instead of duplicating alerts.
      if (current && current.state !== 'failed' && current.state !== 'pending') return false;
      tx.set(ref, { ...current, id, attempt, state: 'sending', updatedAt: now });
      return true;
    });
  },
  async finishDelivery(id, attempt, state, now) {
    const ref = firestore().collection('deliveries').doc(id);
    await firestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.data()?.attempt === attempt) tx.update(ref, { state, updatedAt: now });
    });
  },
  async listUncertainDeliveries() {
    const snap = await firestore().collection('deliveries').where('state', 'in', ['sending', 'uncertain']).get();
    return snap.docs.map(d => d.data() as DeliveryRecord);
  },
  async listPendingOrderAlerts() {
    const snap = await firestore().collection('deliveries').where('state', 'in', ['pending', 'failed']).limit(10).get();
    return snap.docs.map(d => (d.data() as DeliveryRecord).order).filter((o): o is PaidOrderSummary => Boolean(o));
  },
  async saveRefund(refund) {
    const ref = firestore().collection('refunds').doc(refund.id);
    await firestore().runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) tx.create(ref, refund);
    });
  },
  async listRefunds(start, end) {
    const snap = await firestore().collection('refunds').where('processedAt', '>=', start).where('processedAt', '<', end).get();
    return snap.docs.map(d => d.data() as RefundRecord);
  },
};
