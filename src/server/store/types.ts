import type { Answers, AgeBand, Category, Hook } from '@/domain/types';
import type { Track } from '@/domain/energy';
import type { Checkin } from '@/domain/intensive';
import type { TierId } from '@/domain/offer';
import type { Plan } from '@/domain/plan/generator';

export interface Lead {
  email?: string;
  phone?: string;
  marketingOptIn: boolean;
  skipped: boolean;
  at: string;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  hook: Hook;
  category: Category;
  ageBand: AgeBand;
  /** Ad parameters captured on landing (utm_*, fbclid). */
  ad: Record<string, string>;
  answers: Answers;
  lead?: Lead;
  /** When she first saw the paywall. The launch price runs from here. */
  offerStartedAt?: string;
}

/**
 * Clinician review of an intensive order.
 * pending: paid, plan not yet visible. approved: plan open. declined: moved to the
 * standard plan. paused: a weekly check-in raised a stop sign; no further weeks open.
 */
export interface Review {
  status: 'pending' | 'approved' | 'declined' | 'paused';
  requestedAt: string;
  decidedAt?: string;
  /** The clinician's note to the customer, shown on her plan. */
  note?: string;
}

export interface Order {
  id: string;
  sessionId: string;
  tier: TierId;
  amountRupees: number;
  status: 'created' | 'paid';
  provider: 'demo' | 'razorpay';
  email: string;
  phone: string;
  createdAt: string;
  paidAt?: string;
  /** Unguessable token for the private plan link. */
  planToken?: string;
  plan?: Plan;
  /** Absent on orders made before tracks existed: treat as 'standard'. */
  track?: Track;
  /** Intensive orders only. */
  review?: Review;
  checkins?: Checkin[];
  /** Her weight when she bought, for the first weekly check-in. */
  startKg?: number;
}

export interface OtpRecord {
  phone: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
}

export interface EventRecord {
  name: string;
  sessionId?: string;
  at: string;
  props?: Record<string, string | number | boolean>;
}

/** One interface, two drivers: files on localhost, Firestore in production. */
export interface Store {
  getSession(id: string): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;

  getOrder(id: string): Promise<Order | null>;
  saveOrder(order: Order): Promise<void>;
  getOrderByPlanToken(token: string): Promise<Order | null>;
  listPaidOrdersByPhone(phone: string): Promise<Order[]>;
  /** Paid orders on the intensive track, newest first, for the clinician's review page. */
  listIntensiveOrders(): Promise<Order[]>;

  getOtp(phone: string): Promise<OtpRecord | null>;
  saveOtp(record: OtpRecord): Promise<void>;
  deleteOtp(phone: string): Promise<void>;

  addEvent(event: EventRecord): Promise<void>;
}
