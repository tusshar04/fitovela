// Login by mobile number and one-time code, sent by SMS through 2Factor. With no
// provider key (development) the code is returned to the page so the flow can be tested.

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
  return Boolean(process.env.TWOFACTOR_API_KEY);
}

const RESEND_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;

/** Sends the code by SMS through 2Factor (the provider tarot uses). The key is part of the URL, so the URL is never logged. */
async function sendSms(phone: string, code: string): Promise<boolean> {
  const key = process.env.TWOFACTOR_API_KEY!;
  const template = process.env.TWOFACTOR_TEMPLATE;
  const url = `https://2factor.in/API/V1/${encodeURIComponent(key)}/SMS/${encodeURIComponent(`+91${phone}`)}/${code}${template ? `/${encodeURIComponent(template)}` : ''}`;
  try {
    const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
    const data = (await res.json().catch(() => null)) as { Status?: string } | null;
    if (res.ok && data?.Status === 'Success') return true;
    console.error(`sms failed: http ${res.status}, status ${data?.Status ?? 'unknown'}`);
  } catch (err) {
    console.error(`sms failed: ${(err as Error).name}`);
  }
  return false;
}

export type OtpRequest = { ok: true; devCode?: string } | { ok: false; reason: 'wait' | 'too_many' | 'unavailable' };

/** Creates a code and sends it. In development with no SMS provider the code is returned so the flow can be tested. */
export async function requestOtp(phone: string): Promise<OtpRequest> {
  const store = await getStore();
  const now = Date.now();
  const prev = await store.getOtp(phone);
  const sends = (prev?.sends ?? []).filter((t) => now - new Date(t).getTime() < 3_600_000);
  if (sends.length > 0 && now - new Date(sends[sends.length - 1]).getTime() < RESEND_SECONDS * 1000) return { ok: false, reason: 'wait' };
  if (sends.length >= MAX_SENDS_PER_HOUR) return { ok: false, reason: 'too_many' };
  if (!smsConfigured() && process.env.NODE_ENV === 'production') return { ok: false, reason: 'unavailable' };

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await store.saveOtp({ phone, codeHash: hashCode(phone, code), expiresAt: new Date(now + OTP_MINUTES * 60_000).toISOString(), attempts: 0, sends: [...sends, new Date(now).toISOString()] });
  if (!smsConfigured()) {
    console.log(`[dev] login code for ${phone}: ${code}`);
    return { ok: true, devCode: code };
  }
  return (await sendSms(phone, code)) ? { ok: true } : { ok: false, reason: 'unavailable' };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const store = await getStore();
  const rec = await store.getOtp(phone);
  if (!rec) return false;
  if (!rec.codeHash) return false;
  // The record is kept (without a usable code) so the hourly send limit still counts.
  const spent = { ...rec, codeHash: '', attempts: 0 };
  if (new Date(rec.expiresAt).getTime() < Date.now() || rec.attempts >= MAX_ATTEMPTS) {
    await store.saveOtp(spent);
    return false;
  }
  const a = Buffer.from(rec.codeHash);
  const b = Buffer.from(hashCode(phone, code));
  if (a.length === b.length && timingSafeEqual(a, b)) {
    await store.saveOtp(spent);
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
