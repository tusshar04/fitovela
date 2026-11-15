// Access to the clinician's review page. Set REVIEW_KEY to a long random code and
// give it to the reviewer. With no key set the page is open in development and
// does not exist in production.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'fv_review';
const HOURS = 12;

const sign = (key: string, exp: string) => createHmac('sha256', key).update(`review.${exp}`).digest('base64url');

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export type ReviewAccess = 'open' | 'granted' | 'login' | 'off';

export async function reviewAccess(): Promise<ReviewAccess> {
  const key = process.env.REVIEW_KEY;
  if (!key) return process.env.NODE_ENV === 'production' ? 'off' : 'open';
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return 'login';
  const [exp, sig] = raw.split('.');
  if (!exp || !sig || Number(exp) < Date.now() || !same(sig, sign(key, exp))) return 'login';
  return 'granted';
}

export async function reviewerAllowed(): Promise<boolean> {
  const access = await reviewAccess();
  return access === 'open' || access === 'granted';
}

export async function loginReviewer(code: string): Promise<boolean> {
  const key = process.env.REVIEW_KEY;
  if (!key || !same(code, key)) return false;
  const exp = String(Date.now() + HOURS * 3_600_000);
  const jar = await cookies();
  jar.set(COOKIE, `${exp}.${sign(key, exp)}`, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: HOURS * 3600 });
  return true;
}

/** Tell the reviewer something needs her. Goes to REVIEW_EMAIL; in development it lands in the outbox. */
export function reviewerAddress(): string {
  return process.env.REVIEW_EMAIL || 'reviewer@fitovela.invalid';
}
