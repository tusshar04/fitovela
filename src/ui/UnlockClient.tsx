'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { track as trackEvent } from './track';
import { SUPPORT_EMAIL } from '@/domain/company';
import { MEDICATION_ADVISORY } from '@/domain/eligibility';
import { FIRST_MONTH_WEEKS, JOURNEY_FOOTNOTE, type JourneyStop } from '@/domain/journey';
import { DEFAULT_TIER, perDay, type Tier, type TierId } from '@/domain/offer';
import type { ReportTeaser } from '@/domain/teaser';
import { PROTEIN_LINE, PROTEIN_LINE_INTENSIVE } from '@/domain/typeContent';
import { STRENGTH_LABEL } from '@/domain/typing';
import { AREAS, AREA_LABEL } from '@/domain/types';
import { JourneyTimeline } from './JourneyCard';
import { Lock, Plus, Shield, Tick } from './bits';

interface Props {
  offerEndsAt: string;
  tiers: Tier[];
  /** Counts only. Her type and her score in each system stay out of this page until she pays (D-030). */
  teaser: ReportTeaser;
  recap: string[];
  answerCount: number;
  targetKcal: number;
  journey: JourneyStop[];
  planChanges: string[];
  /** Present only when the rules allow her to be offered the 800 to 1,000 kcal track. */
  intensive: { targetKcal: number; journey: JourneyStop[] } | null;
  medicationAdvisory: boolean;
  email: string;
  phone: string;
  provider: 'demo' | 'razorpay' | 'cashfree' | null;
  /** Set when she has just come back from the payment page without a completed payment. */
  payNotice: 'failed' | 'pending' | 'error' | null;
}

/** A coarse bar for the paywall. The exact share of markers matched would give her type away. */
const STRENGTH_METER = { early: '35%', clear: '65%', strong: '90%' } as const;

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const PAY_NOTICE = {
  failed: 'That payment did not go through. Please try again. If money left your account, write to us and we will sort it out.',
  pending: 'Your payment is still being confirmed by your bank. Your plan will be emailed to you as soon as it is. Please do not pay again.',
  error: `Your payment went through but we could not open your plan. Write to ${SUPPORT_EMAIL} and we will sort it out today.`,
} as const;

const CASHFREE_SDK = 'https://sdk.cashfree.com/js/v3/cashfree.js';

/** Adds a script to the page once and resolves when it has loaded. */
function loadScript(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === '1') return resolve();
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => {
      script.dataset.loaded = '1';
      resolve();
    });
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error('script did not load'));
    });
    if (!existing) {
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

const FAQ = [
  ['Is this a medical diagnosis?', 'No. It is a nutrition plan based on a symptom assessment. Only a doctor and tests can diagnose a condition.'],
  ['I take metformin or thyroid tablets. Can I follow it?', 'Yes. The plan is regular home food. Show it to your doctor before you start and never change a dose because of it.'],
  ['Do I need special ingredients?', 'No powders or supplements. Everything is on a normal kirana shelf.'],
  ['How do I get my report and plan?', 'Both open on screen as soon as you pay and a link is sent to your email. You can come back any time by logging in with your mobile number and a one-time code.'],
  ['How do refunds work?', `Write to ${SUPPORT_EMAIL} within 7 days of buying and we refund you in full.`],
];

function errorCode(message: string): string {
  if (/intensive/i.test(message)) return 'other';
  if (/still being confirmed/i.test(message)) return 'payment_pending';
  if (/went through but/i.test(message)) return 'plan_not_opened';
  if (/did not go through|not charged/i.test(message)) return 'payment_failed';
  if (/email/i.test(message)) return 'email';
  if (/mobile|phone/i.test(message)) return 'phone';
  if (/payment page did not/i.test(message)) return 'payment_page';
  if (/could not reach/i.test(message)) return 'network';
  return 'other';
}

export function UnlockClient(props: Props) {
  const router = useRouter();
  const { teaser } = props;
  const [selected, setSelected] = useState<TierId>(DEFAULT_TIER);
  const [track, setTrack] = useState<'standard' | 'intensive'>('standard');
  const onIntensive = track === 'intensive' && props.intensive !== null;
  const kcal = (onIntensive ? props.intensive!.targetKcal : props.targetKcal).toLocaleString('en-IN');
  const journey = onIntensive ? props.intensive!.journey : props.journey;
  // The intensive day is three light meals and a snack, so lines about five meals do not apply to it.
  const planChanges = onIntensive ? props.planChanges.filter((l) => !/\bfive\b/i.test(l)).map((l) => (l === PROTEIN_LINE ? PROTEIN_LINE_INTENSIVE : l)) : props.planChanges;
  const [left, setLeft] = useState<number>(() => Math.max(0, new Date(props.offerEndsAt).getTime() - Date.now()));
  const [email, setEmail] = useState(props.email);
  const [phone, setPhone] = useState(props.phone);
  const [error, setError] = useState<string>(props.payNotice ? PAY_NOTICE[props.payNotice] : '');
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<{ orderId: string; amountRupees: number } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Behaviour log only: which price she picked, when the launch price ran out, and any message she was shown.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    trackEvent('tier_select', { tier: selected, plan: track });
  }, [selected, track]);
  useEffect(() => {
    // A short code, never the message: some messages name a health reason.
    if (error) trackEvent('checkout_error', { code: errorCode(error), tier: selected });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);
  const expired = left <= 0;
  useEffect(() => {
    if (expired) trackEvent('offer_expired');
  }, [expired]);

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(props.offerEndsAt).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [props.offerEndsAt]);

  // Fetch Cashfree's checkout script while she reads the page, so the pay button opens it at once.
  useEffect(() => {
    if (props.provider === 'cashfree') loadScript(CASHFREE_SDK).catch(() => {});
  }, [props.provider]);

  // If she presses Back on the payment page, the browser can restore this page as she left it,
  // with the button still disabled. Give it back to her.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  // Coming back from a payment that did not finish: bring the message and the pay button into view.
  useEffect(() => {
    if (props.payNotice) formRef.current?.scrollIntoView({ block: 'center' });
  }, [props.payNotice]);

  const launchLive = left > 0;
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  const priceOf = (t: Tier) => (launchLive ? t.launch : t.regular);
  const tier = props.tiers.find((t) => t.id === selected)!;

  async function startCheckout() {
    trackEvent('checkout_tap', { tier: selected, plan: onIntensive ? 'intensive' : 'standard', launch: launchLive, has_email: email.trim().length > 0, has_phone: phone.trim().length > 0 }, true);
    setBusy(true);
    setError('');
    // Stays true once the payment page is taking over, so the button cannot be tapped twice.
    let leaving = false;
    try {
      const res = await fetch('/api/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tier: selected, email, phone, track: onIntensive ? 'intensive' : 'standard' }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; orderId?: string; amountRupees?: number; provider?: string; checkout?: Record<string, unknown> };
      if (!res.ok || !data.orderId) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        formRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      fetch('/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'checkout_opened' }) }).catch(() => {});
      if (data.provider === 'cashfree' && data.checkout) leaving = await openCashfree(data.checkout);
      else if (data.checkout) await openRazorpay(data.orderId, data.checkout);
      else setCheckout({ orderId: data.orderId, amountRupees: data.amountRupees ?? priceOf(tier) });
    } catch {
      setError('Could not reach us. Check your connection and try again.');
    } finally {
      if (!leaving) setBusy(false);
    }
  }

  /**
   * Hands the page to Cashfree's checkout. Her mobile number and email went to Cashfree with
   * the order, so she is asked only how she wants to pay. Cashfree brings her back to
   * /api/order/return, which checks the payment and opens her plan.
   */
  async function openCashfree(options: Record<string, unknown>): Promise<boolean> {
    type CashfreeFactory = (o: { mode: string }) => { checkout: (o: { paymentSessionId: string; redirectTarget: string }) => Promise<unknown> };
    const w = window as unknown as { Cashfree?: CashfreeFactory };
    if (!w.Cashfree) await loadScript(CASHFREE_SDK).catch(() => undefined);
    if (!w.Cashfree || typeof options.paymentSessionId !== 'string') {
      setError('The payment page did not load. Check your connection and try again.');
      return false;
    }
    void w
      .Cashfree({ mode: options.mode === 'sandbox' ? 'sandbox' : 'production' })
      .checkout({ paymentSessionId: options.paymentSessionId, redirectTarget: '_self' })
      .catch(() => {
        setError('The payment page did not open. Please try again.');
        setBusy(false);
      });
    return true;
  }

  /** Loads Razorpay's checkout and opens it. Its handler runs only after a successful payment. */
  async function openRazorpay(orderId: string, options: Record<string, unknown>) {
    type RazorpayCtor = new (o: Record<string, unknown>) => { open: () => void; on: (event: string, cb: () => void) => void };
    const w = window as unknown as { Razorpay?: RazorpayCtor };
    if (!w.Razorpay) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('checkout did not load'));
        document.head.appendChild(script);
      }).catch(() => undefined);
    }
    if (!w.Razorpay) {
      setError('The payment page did not load. Check your connection and try again.');
      return;
    }
    const rzp = new w.Razorpay({
      ...options,
      handler: (response: Record<string, string>) => {
        void confirm({ orderId, ...response });
      },
    });
    rzp.on('payment.failed', () => setError('That payment did not go through. You have not been charged. Please try again.'));
    rzp.open();
  }

  async function confirmDemo() {
    if (!checkout) return;
    await confirm({ orderId: checkout.orderId });
  }

  async function confirm(body: Record<string, string>) {
    setBusy(true);
    try {
      const res = await fetch('/api/order/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; planUrl?: string };
      if (!res.ok || !data.planUrl) {
        setError(data.error ?? 'Payment could not be completed.');
        setCheckout(null);
        return;
      }
      router.push(`${data.planUrl}?new=1`);
    } catch {
      setError('Could not reach us. Check your connection and try again.');
      setCheckout(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <div className="timer" data-sec="timer_bar">
        <div className="stack">
          <span className="dim" style={{ fontSize: 11, fontWeight: 500, color: '#D9C9DB' }}>
            {launchLive ? 'Launch price held for' : 'Launch price has ended'}
          </span>
          <span className="clock">{launchLive ? `${mm}:${ss}` : 'Regular price'}</span>
        </div>
        <button type="button" data-ev="timer_get_plan" onClick={() => formRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}>
          Unlock now
        </button>
      </div>

      <section data-sec="locked_report" className="stack" style={{ padding: '20px 22px 0', gap: 14 }}>
        <div className="stack" style={{ alignItems: 'center', gap: 4 }}>
          <div className="eyebrow">Your assessment report</div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--faint)' }}>
            Age {teaser.age} · {props.answerCount} answers analysed
          </div>
        </div>
        <div className="plum stack" style={{ padding: 22, gap: 16 }}>
          <div className="stack" style={{ gap: 8 }}>
            <div className="row between" style={{ gap: 12 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--yellow)' }}>YOUR SYMPTOMS MATCH</span>
              <span className="lock-pill">
                <Lock size={12} />
                <span>Locked</span>
              </span>
            </div>
            {/* A stand-in, not her type: the real name is not sent to this page. */}
            <div aria-hidden className="blur" style={{ fontSize: 29, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.028em' }}>
              Hidden until you unlock
            </div>
          </div>
          {teaser.strength ? (
            <div className="match">
              <div className="row between" style={{ gap: 12 }}>
                <span className="dim" style={{ fontSize: 13, fontWeight: 500 }}>
                  How strongly your answers match
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)' }}>{STRENGTH_LABEL[teaser.strength]}</span>
              </div>
              <div className="meter">
                <i style={{ width: STRENGTH_METER[teaser.strength] }} />
              </div>
            </div>
          ) : null}
          <p style={{ fontSize: 14, lineHeight: 1.55, color: '#E6D9E8' }}>
            {teaser.signs > 0 ? (
              <>
                We found <b style={{ color: '#fff' }}>{teaser.signs === 1 ? '1 sign' : `${teaser.signs} signs`}</b> in your answers
                {teaser.flagged > 0 ? `, and ${teaser.flagged} of the 4 systems we checked ${teaser.flagged === 1 ? 'stands' : 'stand'} out` : ''}.
              </>
            ) : (
              <>We checked your answers against 4 systems.</>
            )}{' '}
            Your report names your type and tells you what is holding your weight.
          </p>
        </div>
        <div className="locked-card">
          <div className="head">
            <h2 style={{ fontSize: 16.5, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.012em' }}>Inside your report</h2>
            <span className="lock-pill">
              <Lock size={12} />
              <span>Locked</span>
            </span>
          </div>
          <div className="rows">
            {[...AREAS.map((area) => [AREA_LABEL[area], 'Your score']), ['What it means for you', 'Three findings'], ['Your diet for this type', 'Every meal planned']].map(([k, v]) => (
              <div key={k} className="locked-row">
                <b>{k}</b>
                <span aria-hidden>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-sec="hero" className="stack" style={{ padding: '26px 22px 0', alignItems: 'center', gap: 12 }}>
        <h1 className="h1 big">
          Unlock your report and <span className="accent">diet plan</span>
        </h1>
        <div className="outline stack" style={{ alignSelf: 'stretch', marginTop: 6, gap: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--faint)' }}>BUILT FROM YOUR {props.answerCount} ANSWERS</div>
          {props.recap.map((line) => (
            <div key={line} className="line-item" style={{ fontSize: 14.5 }}>
              <Tick small />
              <span>{line}</span>
            </div>
          ))}
        </div>
      </section>

      <section data-sec="first_weeks" className="sec" style={{ padding: '30px 22px 0' }}>
        <h2 className="h2">
          Your first <span className="accent">{FIRST_MONTH_WEEKS} weeks</span>
        </h2>
        <JourneyTimeline stops={journey} />
        <p className="small">{JOURNEY_FOOTNOTE}</p>
      </section>

      <section data-sec="choose_plan" className="stack" style={{ padding: '30px 22px 0', gap: 12 }}>
        <h2 className="h2">Choose your plan</h2>
        {props.intensive ? (
          <div className="stack" style={{ gap: 10 }}>
            <div className="step-label">1 · How strict</div>
            {(
              [
                { id: 'standard', name: 'Standard', kcal: props.targetKcal, line: 'Opens as soon as you pay.' },
                { id: 'intensive', name: 'Intensive', kcal: props.intensive.targetKcal, line: 'Stricter and faster: three light meals and a snack. A short check-in each week opens the next week. 12 weeks at most.' },
              ] as const
            ).map((t) => {
              const on = track === t.id;
              return (
                <button key={t.id} type="button" className={`tier${on ? ' on' : ''}`} style={{ padding: '14px 16px', alignItems: 'flex-start' }} aria-pressed={on} data-ev={`plan:${t.id}`} onClick={() => setTrack(t.id)}>
                  <span className="radio" style={{ marginTop: 2 }}>
                    <i />
                  </span>
                  <span className="stack" style={{ flex: 1, gap: 3 }}>
                    <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
                        {t.name} · {t.kcal.toLocaleString('en-IN')} kcal a day
                      </span>
                    </span>
                    <span style={{ fontSize: 13, lineHeight: 1.45, fontWeight: 500, color: 'var(--muted)' }}>{t.line}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <section data-sec="prices" className="stack" style={{ padding: '14px 22px 0', gap: 10 }}>
        {props.intensive ? <div className="step-label">2 · How long</div> : null}
        {props.tiers.map((t) => {
          const on = t.id === selected;
          const price = priceOf(t);
          const button = (
            <button key={t.id} type="button" className={`tier${on ? ' on' : ''}${t.popular ? ' pop' : ''}`} aria-pressed={on} data-ev={`tier:${t.id}`} onClick={() => setSelected(t.id)}>
              <span className="radio">
                <i />
              </span>
              <span className="stack" style={{ flex: 1, gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>{t.name}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--muted)' }}>
                  {launchLive ? <span className="strike">{rupees(t.regular)}</span> : null} {rupees(price)}
                </span>
              </span>
              <span className="day">
                <b>{rupees(perDay(price, t.days))}</b>
                <small>per day</small>
              </span>
            </button>
          );
          return t.popular ? (
            <div key={t.id} className="stack">
              <div className="pop-band">MOST POPULAR · BEST VALUE</div>
              {button}
            </div>
          ) : (
            button
          );
        })}
      </section>

      <section ref={formRef} data-sec="pay_form" className="stack" style={{ padding: '20px 22px 0', gap: 12 }}>
        <div className="field">
          <label htmlFor="pay-email">Email for your report and plan</label>
          <input id="pay-email" className="input" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pay-phone">Mobile number, for logging in</label>
          <div className="row" style={{ gap: 8 }}>
            <div className="prefix">+91</div>
            <input id="pay-phone" className="input" type="tel" autoComplete="tel-national" inputMode="numeric" placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className="btn" data-ev="pay_main" disabled={busy || props.provider === null} onClick={startCheckout}>
          Get my report and plan · {rupees(priceOf(tier))}
        </button>
        <div className="center" style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--muted)' }}>
          {props.provider === null ? 'Payments are not switched on yet.' : 'One-time payment. No auto-renewal.'}
        </div>
        <div className="guarantee">
          <Shield style={{ flex: 'none', color: 'var(--green)' }} />
          <div className="stack" style={{ gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>7-day money-back guarantee</span>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>If the plan does not fit your kitchen, write to us for a full refund.</span>
          </div>
        </div>
      </section>

      <section data-sec="what_you_get" className="stack" style={{ padding: '36px 22px 0', gap: 14 }}>
        <h2 className="h2">What you get</h2>
        <div className="grid3">
          {[
            ['/img/dosa.jpg', 'Dosa with sambar and chutney', 'Breakfast'],
            ['/img/thali.jpg', 'Thali with rotis, dal and sabzi', 'Lunch'],
            ['/img/palak.jpg', 'Bowl of palak paneer', 'Dinner'],
          ].map(([src, alt, label]) => (
            <div key={label} className="stack" style={{ gap: 6 }}>
              <img className="photo-sq" src={src} alt={alt} />
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--faint)' }}>{label.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div className="stack" style={{ gap: 12, marginTop: 4 }}>
          {['Your full report: your type, your score in each of the 4 systems and what it means for you', onIntensive ? `Every day planned: 3 light meals and a snack, about ${kcal} kcal` : `Every day planned: 5 meals, about ${kcal} kcal, in your own cuisine`, ...(onIntensive ? ['A short check-in each week before the next week opens'] : []), 'Two swaps for every single meal', 'A grocery list for each week', 'Your basic movement plan', 'Sent to your email, with a login to come back any time', ...planChanges].map((line) => (
            <div key={line} className="line-item top" style={{ fontSize: 15 }}>
              <Tick />
              <span>{line}</span>
            </div>
          ))}
        </div>
        {props.medicationAdvisory ? <div className="advice">{MEDICATION_ADVISORY}</div> : null}
      </section>

      <section data-sec="faq" className="stack" style={{ padding: '36px 22px 0' }}>
        <h2 className="h2" style={{ marginBottom: 6 }}>
          Questions
        </h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className="faq">
            <summary>
              <span>{q}</span>
              <Plus style={{ flex: 'none' }} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>

      <section data-sec="closing" className="plum stack grow" style={{ marginTop: 36, borderRadius: 0, padding: '30px 22px 26px', gap: 14 }}>
        <div className="stack center" style={{ gap: 4 }}>
          <div style={{ fontSize: 24, lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.022em' }}>
            {tier.name} for <span style={{ color: 'var(--yellow)' }}>{rupees(priceOf(tier))}</span>
          </div>
          <div className="dim" style={{ fontSize: 13.5, fontWeight: 600 }}>
            One-time payment. No auto-renewal.
          </div>
        </div>
        <button type="button" className="btn" style={{ boxShadow: 'none' }} data-ev="pay_bottom" disabled={busy || props.provider === null} onClick={startCheckout}>
          Get my report and plan
        </button>
        <p className="dim center" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          Fitovela offers nutrition guidance. It does not diagnose or treat any medical condition. Results vary from person to person. If you take medication, speak to your doctor first.
        </p>
        <p className="dim center" style={{ fontSize: 11.5 }}>
          <a href="/terms" style={{ color: 'inherit' }}>Terms</a> · <a href="/privacy" style={{ color: 'inherit' }}>Privacy</a> · <a href="/refund" style={{ color: 'inherit' }}>Refunds</a> · <a href="/contact" style={{ color: 'inherit' }}>Contact</a>
        </p>
        <p className="dim center" style={{ fontSize: 11.5 }}>
          Already bought a plan? <a href="/login" style={{ color: 'inherit' }}>Log in</a>
        </p>
      </section>

      {checkout ? (
        <div className="sheet-back" role="dialog" aria-modal="true" aria-label="Demo checkout">
          <div className="sheet">
            <h2 className="h2">Demo checkout</h2>
            <div className="demo-note">This is a test payment. No money moves. The payment gateway is not connected yet.</div>
            <div className="row between" style={{ fontSize: 16, fontWeight: 700 }}>
              <span>{tier.name}</span>
              <span>{rupees(checkout.amountRupees)}</span>
            </div>
            <button type="button" className="btn" disabled={busy} onClick={confirmDemo}>
              Pay {rupees(checkout.amountRupees)} (demo)
            </button>
            <button type="button" className="link-btn" disabled={busy} onClick={() => setCheckout(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
