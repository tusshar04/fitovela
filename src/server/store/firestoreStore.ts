// Production driver. Same project conventions as tarot: the project id comes from
// GOOGLE_CLOUD_PROJECT and credentials from the Cloud Run service account.
// NOTE: not yet exercised against a real Firestore database; test before launch.

import { Firestore } from '@google-cloud/firestore';
import type { EventRecord, Order, OtpRecord, Session, Store } from './types';

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
  getSession: (id) => get<Session>('sessions', id),
  async saveSession(s) {
    await firestore().collection('sessions').doc(s.id).set(s);
  },

  getOrder: (id) => get<Order>('orders', id),
  async saveOrder(o) {
    await firestore().collection('orders').doc(o.id).set(o);
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
};
