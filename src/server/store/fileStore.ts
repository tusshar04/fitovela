// Local development driver: JSON files under .data/. Not for production.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { EventRecord, Order, OtpRecord, Session, Store } from './types';

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
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, target);
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
  async getOrderByPlanToken(token) {
    return (await list<Order>('orders')).find((o) => o.planToken === token) ?? null;
  },
  async listPaidOrdersByPhone(phone) {
    return (await list<Order>('orders')).filter((o) => o.phone === phone && o.status === 'paid').sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));
  },

  async listIntensiveOrders() {
    return (await list<Order>('orders')).filter((o) => o.track === 'intensive' && o.status === 'paid').sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));
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
};
