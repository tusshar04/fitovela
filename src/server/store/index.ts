import { fileStore } from './fileStore';
import type { Store } from './types';

let cached: Store | null = null;

/** STORE_DRIVER=firestore in production; files under .data/ everywhere else. */
export async function getStore(): Promise<Store> {
  if (cached) return cached;
  if (process.env.STORE_DRIVER === 'firestore') {
    const mod = await import('./firestoreStore');
    cached = mod.firestoreStore;
  } else {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_FILE_STORE !== '1') {
      throw new Error('File store is for local development. Set STORE_DRIVER=firestore in production.');
    }
    cached = fileStore;
  }
  return cached;
}

export type { Store, Session, Order, Lead, EventRecord, OtpRecord, Review } from './types';
