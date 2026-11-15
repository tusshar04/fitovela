import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { getStore, type Session } from './store';

export const SESSION_COOKIE = 'fv_sid';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function newId(bytes = 16): string {
  return randomBytes(bytes).toString('base64url');
}

export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const store = await getStore();
  return store.getSession(id);
}

export async function setSessionCookie(id: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: THIRTY_DAYS,
  });
}

export async function saveSession(session: Session): Promise<void> {
  const store = await getStore();
  session.updatedAt = new Date().toISOString();
  await store.saveSession(session);
}

export async function logEvent(name: string, sessionId?: string, props?: Record<string, string | number | boolean>): Promise<void> {
  try {
    const store = await getStore();
    await store.addEvent({ name, sessionId, at: new Date().toISOString(), props });
  } catch (err) {
    console.error('event log failed', name, err);
  }
}
