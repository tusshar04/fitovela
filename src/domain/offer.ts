// Plan tiers and the launch-price window. The window starts again each time she opens
// the paywall (founder, 2026-11-15). If she stays on the page until the countdown ends,
// the server charges the regular price until she opens the page again.

export type TierId = 'w1' | 'w4' | 'w12';

export interface Tier {
  id: TierId;
  name: string;
  days: number;
  /** Rupees. */
  launch: number;
  regular: number;
  popular?: boolean;
}

// Founder's prices, 2026-11-15 (second change the same day): 199, 299 and 399. The
// 12-week plan is the one we want everyone to buy, so it costs only a little more than
// the shorter ones. The regular prices (charged only if she lets the 15-minute countdown run out on the page) were set by an AI
// agent at twice the launch price, rounded up to end in 99.
export const TIERS: Record<TierId, Tier> = {
  w1: { id: 'w1', name: '1-week trial', days: 7, launch: 199, regular: 399 },
  w4: { id: 'w4', name: '4-week plan', days: 28, launch: 299, regular: 599 },
  // The result is framed as a 12-week target, so the plan that covers it is the default.
  w12: { id: 'w12', name: '12-week plan', days: 84, launch: 399, regular: 799, popular: true },
};

export const TIER_ORDER: TierId[] = ['w1', 'w4', 'w12'];
export const DEFAULT_TIER: TierId = 'w12';

export const OFFER_WINDOW_MINUTES = 15;

export function offerEndsAt(offerStartedAt: string): Date {
  return new Date(new Date(offerStartedAt).getTime() + OFFER_WINDOW_MINUTES * 60_000);
}

export function isLaunchPriceLive(offerStartedAt: string | undefined, now: Date = new Date()): boolean {
  if (!offerStartedAt) return false;
  return now.getTime() < offerEndsAt(offerStartedAt).getTime();
}

/** Price in rupees the server will charge right now. */
export function priceFor(tier: TierId, offerStartedAt: string | undefined, now: Date = new Date()): number {
  const t = TIERS[tier];
  return isLaunchPriceLive(offerStartedAt, now) ? t.launch : t.regular;
}

export function perDay(rupees: number, days: number): number {
  return Math.round(rupees / days);
}

export function isTierId(v: unknown): v is TierId {
  return v === 'w1' || v === 'w4' || v === 'w12';
}
