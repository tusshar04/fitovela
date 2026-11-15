// Login by mobile number and one-time code. The SMS provider is not connected yet:
// in development the code is returned to the page so the flow can be tested.

import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getStore } from './store';

const AUTH_COOKIE = 'fv_auth';
const OTP_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const LOGIN_DAYS = 30;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production');
  return 'fitovela-local-development-only';
}

const hashCode = (phone: string, code: string) => createHash('sha256').update(`${phone}:${code}:${secret()}`).digest('hex');

export function smsConfigured(): boolean {
  return Boolean(process.env.SMS_PROVIDER);
}

/** Creates a code. Returns it only so the caller can show it in development. */
export async function requestOtp(phone: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const store = await getStore();
  await store.saveOtp({ phone, codeHash: hashCode(phone, code), expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000).toISOString(), attempts: 0 });
  if (!smsConfigured()) console.log(`[dev] login code for ${phone}: ${code}`);
  // TODO(launch): send by SMS through the chosen provider.
  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const store = await getStore();
  const rec = await store.getOtp(phone);
  if (!rec) return false;
  if (new Date(rec.expiresAt).getTime() < Date.now() || rec.attempts >= MAX_ATTEMPTS) {
    await store.deleteOtp(phone);
    return false;
  }
  const a = Buffer.from(rec.codeHash);
  const b = Buffer.from(hashCode(phone, code));
  if (a.length === b.length && timingSafeEqual(a, b)) {
    await store.deleteOtp(phone);
    return true;
  }
  await store.saveOtp({ ...rec, attempts: rec.attempts + 1 });
  return false;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export async function setLoginCookie(phone: string): Promise<void> {
  const exp = Date.now() + LOGIN_DAYS * 86_400_000;
  const payload = `${phone}.${exp}`;
  const jar = await cookies();
  jar.set(AUTH_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: LOGIN_DAYS * 86_400,
  });
}

export async function loggedInPhone(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(AUTH_COOKIE)?.value;
  if (!raw) return null;
  const [phone, exp, sig] = raw.split('.');
  if (!phone || !exp || !sig) return null;
  const expected = Buffer.from(sign(`${phone}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(exp) < Date.now()) return null;
  return phone;
}

export async function clearLoginCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}
