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

// Founder's prices, 2026-11-20 (D-031): 499 for 4 weeks and 999 for 12 weeks; the
// 1-week trial is no longer sold. At 199-399 every sale lost money on ad cost, and the
// cheapest option drew buyers to a week too short to show any result. The 12-week plan
// stays the default and the one we steer everyone to. The regular prices (charged only if
// she lets the 15-minute countdown run out on the page) are twice the launch price.
export const TIERS: Record<TierId, Tier> = {
  // Retired: kept so orders bought before 2026-11-20 still show their plan name and length.
  w1: { id: 'w1', name: '1-week trial', days: 7, launch: 199, regular: 399 },
  w4: { id: 'w4', name: '4-week plan', days: 28, launch: 499, regular: 999 },
  // The result is framed as a 12-week target, so the plan that covers it is the default.
  w12: { id: 'w12', name: '12-week plan', days: 84, launch: 999, regular: 1999, popular: true },
};

/** The plans on sale, in the order the paywall shows them. */
export const TIER_ORDER: TierId[] = ['w4', 'w12'];
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

/** True only for a plan that is on sale now; a retired plan cannot be bought. */
export function isTierOnSale(v: unknown): v is TierId {
  return typeof v === 'string' && (TIER_ORDER as string[]).includes(v);
}
