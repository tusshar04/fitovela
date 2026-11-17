// Local development driver: JSON files under .data/. Not for production.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { paidSummary } from './paidSummary';
import type { DeliveryRecord, EventRecord, Order, OtpRecord, RefundRecord, Session, Store } from './types';

const ROOT = path.join(process.cwd(), '.data');
const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

function file(collection: string, id: string): string {
  if (!SAFE_ID.test(id)) throw new Error('Invalid id');
  return path.join(ROOT, collection, `${id}.json`);
}

async function read<T>(collection: string, id: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file(collection, id), 'utf8')) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT' || (err as Error).message === 'Invalid id') return null;
    throw err;
  }
}

async function write(collection: string, id: string, value: unknown): Promise<void> {
  const target = file(collection, id);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, target);
}

// Local driver runs in one process. Production uses Firestore transactions.
let queue: Promise<unknown> = Promise.resolve();
function atomic<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function list<T>(collection: string): Promise<T[]> {
  try {
    const names = await fs.readdir(path.join(ROOT, collection));
    const out: T[] = [];
    for (const n of names.filter((x) => x.endsWith('.json'))) {
      out.push(JSON.parse(await fs.readFile(path.join(ROOT, collection, n), 'utf8')) as T);
    }
    return out;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

export const fileStore: Store = {
  getSession: (id) => read<Session>('sessions', id),
  saveSession: (s) => write('sessions', s.id, s),

  getOrder: (id) => read<Order>('orders', id),
  saveOrder: (o) => write('orders', o.id, o),
  commitPaidOrder: (order) => atomic(async () => {
    const current = await read<Order>('orders', order.id);
    if (current?.status === 'paid' && current.plan) return { order: current, created: false };
    if (!current) throw new Error('Order missing during fulfilment');
    const deliveryId = `order-${order.id}`;
    await write('deliveries', deliveryId, { id: deliveryId, state: 'pending', attempt: '', updatedAt: order.paidAt, order: paidSummary(order) });
    await write('orders', order.id, order);
    return { order, created: true };
  }),
  async listPaidOrders(start, end) {
    return (await list<Order>('orders')).filter(o => o.status === 'paid' && o.provider !== 'demo' && o.paidAt && o.paidAt >= start && o.paidAt < end);
  },
  async getOrderByPlanToken(token) {
    return (await list<Order>('orders')).find((o) => o.planToken === token) ?? null;
  },
  async listPaidOrdersByPhone(phone) {
    return (await list<Order>('orders')).filter((o) => o.phone === phone && o.status === 'paid').sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));
  },

  getOtp: (phone) => read<OtpRecord>('otps', phone),
  saveOtp: (r) => write('otps', r.phone, r),
  async deleteOtp(phone) {
    try {
      await fs.unlink(file('otps', phone));
    } catch {
      /* already gone */
    }
  },

  async addEvent(event: EventRecord) {
    await fs.mkdir(ROOT, { recursive: true });
    await fs.appendFile(path.join(ROOT, 'events.ndjson'), `${JSON.stringify(event)}\n`);
  },
  claimDelivery: (id, attempt, now) => atomic(async () => {
    const current = await read<DeliveryRecord>('deliveries', id);
    if (current && current.state !== 'failed' && current.state !== 'pending') return false;
    await write('deliveries', id, { ...current, id, attempt, state: 'sending', updatedAt: now });
    return true;
  }),
  finishDelivery: (id, attempt, state, now) => atomic(async () => {
    const current = await read<DeliveryRecord>('deliveries', id);
    if (current?.attempt === attempt) await write('deliveries', id, { ...current, state, updatedAt: now });
  }),
  async listUncertainDeliveries() {
    return (await list<DeliveryRecord>('deliveries')).filter(d => d.state === 'sending' || d.state === 'uncertain');
  },
  async listPendingOrderAlerts() {
    return (await list<DeliveryRecord>('deliveries')).filter(d => d.order && ['pending', 'failed'].includes(d.state)).slice(0, 25).map(d => d.order!);
  },
  saveRefund: (refund) => atomic(async () => {
    if (!(await read<RefundRecord>('refunds', refund.id))) await write('refunds', refund.id, refund);
  }),
  async listRefunds(start, end) {
    return (await list<RefundRecord>('refunds')).filter(r => r.processedAt >= start && r.processedAt < end);
  },
};
