import type { AdAttribution, AdConsent, MetaDelivery } from '@/domain/meta';
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
  /** When she last opened the paywall. The launch price runs from here. */
  offerStartedAt?: string;
}

export interface Order {
  /** Explicit advertising consent and generic checkout attribution only. */
  adAttribution?: AdAttribution;
  id: string;
  sessionId: string;
  tier: TierId;
  amountRupees: number;
  status: 'created' | 'paid';
  provider: 'demo' | 'razorpay' | 'cashfree';
  email: string;
  phone: string;
  createdAt: string;
  paidAt?: string;
  /** Unguessable token for the private plan link. Set when the order is created; the link works only once the order is paid. */
  planToken?: string;
  /** The payment provider's order and payment ids. */
  providerOrderId?: string;
  providerPaymentId?: string;
  plan?: Plan;
  /** Absent on orders made before tracks existed: treat as 'standard'. */
  track?: Track;
  /** Intensive orders only: the weekly check-ins. */
  checkins?: Checkin[];
  /** Set when a check-in raised a stop sign and the order was moved to the standard plan. */
  movedToStandard?: { at: string; reason: 'checkin' };
  /** Her weight when she bought, for the first weekly check-in. */
  startKg?: number;
}

export interface OtpRecord {
  phone: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  /** When codes were sent to this number in the last hour, for the resend and hourly limits. */
  sends?: string[];
}

export type PaidOrderSummary = Pick<Order, 'id' | 'sessionId' | 'tier' | 'amountRupees' | 'status' | 'provider' | 'paidAt' | 'createdAt'>;

export interface EventRecord {
  name: string;
  sessionId?: string;
  /** A random number the browser keeps for one visit. It links what she did before she tapped her age to the session that follows. */
  visitId?: string;
  at: string;
  props?: Record<string, string | number | boolean>;
  /** 'browser' for behaviour events sent by the page; absent for events the server wrote itself. */
  source?: 'browser';
}

/** Operational records never contain assessment answers or private plan links. */
export interface DeliveryRecord {
  id: string;
  state: 'pending' | 'sending' | 'sent' | 'failed' | 'uncertain';
  attempt: string;
  updatedAt: string;
  order?: PaidOrderSummary;
}

export interface RefundRecord {
  id: string;
  orderId: string;
  amountRupees: number;
  processedAt: string;
}

/** One interface, two drivers: files on localhost, Firestore in production. */
export interface Store {
  getAdConsent(id: string): Promise<AdConsent | null>;
  saveAdConsent(consent: AdConsent): Promise<void>;
  refreshAdClick(id: string, fbclid: string | undefined, now: number): Promise<AdConsent | null>;
  claimMetaDelivery(id: string, now: string): Promise<MetaDelivery | null>;
  finishMetaDelivery(id: string, attempt: number, state: MetaDelivery['state'], now: string): Promise<void>;
  claimBrowserPurchase(id: string, consentId: string, now: string): Promise<MetaDelivery | null>;
  listPendingMetaDeliveries(): Promise<MetaDelivery[]>;
  getSession(id: string): Promise<Session | null>;
  saveSession(session: Session): Promise<void>;

  getOrder(id: string): Promise<Order | null>;
  saveOrder(order: Order): Promise<void>;
  /** Atomically preserves the first paid snapshot when browser and webhook race. */
  commitPaidOrder(order: Order): Promise<{ order: Order; created: boolean }>;
  /** Enriches a paid snapshot from a verified provider callback; never replaces an existing reference. */
  recordPaidPaymentReference(id: string, paymentId: string): Promise<Order | null>;
  listPaidOrders(start: string, end: string): Promise<PaidOrderSummary[]>;
  getOrderByPlanToken(token: string): Promise<Order | null>;
  listPaidOrdersByPhone(phone: string): Promise<Order[]>;

  getOtp(phone: string): Promise<OtpRecord | null>;
  saveOtp(record: OtpRecord): Promise<void>;
  deleteOtp(phone: string): Promise<void>;

  addEvent(event: EventRecord): Promise<void>;
  /** Stores a batch of browser events in one write. */
  addEvents(events: EventRecord[]): Promise<void>;
  claimDelivery(id: string, attempt: string, now: string): Promise<boolean>;
  finishDelivery(id: string, attempt: string, state: DeliveryRecord['state'], now: string): Promise<void>;
  listUncertainDeliveries(): Promise<DeliveryRecord[]>;
  listPendingOrderAlerts(): Promise<PaidOrderSummary[]>;
  saveRefund(refund: RefundRecord): Promise<void>;
  listRefunds(start: string, end: string): Promise<RefundRecord[]>;
}
