import { timingSafeEqual } from 'node:crypto';

export function authorizedOps(req: Request): boolean {
  const secret = process.env.OPS_REPORT_SECRET;
  if (!secret || secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(req.headers.get('authorization') ?? '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
