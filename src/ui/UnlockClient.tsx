'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { MEDICATION_ADVISORY } from '@/domain/eligibility';
import { perDay, type Tier, type TierId } from '@/domain/offer';
import { Plus, Shield, Tick } from './bits';

interface Props {
  offerEndsAt: string;
  tiers: Tier[];
  typeName: string;
  recap: string[];
  answerCount: number;
  weightKg: number;
  goalKg: number;
  bmi: number;
  targetKcal: number;
  goalDate: string | null;
  toLoseKg: number;
  planChanges: string[];
  medicationAdvisory: boolean;
  email: string;
  phone: string;
  provider: 'demo' | 'razorpay' | null;
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const FAQ = [
  ['Is this a medical diagnosis?', 'No. It is a nutrition plan based on a symptom assessment. Only a doctor and tests can diagnose a condition.'],
  ['I take metformin or thyroid tablets. Can I follow it?', 'Yes. The plan is regular home food. Show it to your doctor before you start and never change a dose because of it.'],
  ['Do I need special ingredients?', 'No powders or supplements. Everything is on a normal kirana shelf.'],
  ['How do I get my plan?', 'It opens on screen as soon as you pay and a link is sent to your email. You can come back any time by logging in with your mobile number and a one-time code.'],
  ['How do refunds work?', 'Write to us within 7 days of buying and we refund you in full.'],
];

export function UnlockClient(props: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<TierId>('w4');
  const [left, setLeft] = useState<number>(() => Math.max(0, new Date(props.offerEndsAt).getTime() - Date.now()));
  const [email, setEmail] = useState(props.email);
  const [phone, setPhone] = useState(props.phone);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<{ orderId: string; amountRupees: number } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(props.offerEndsAt).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [props.offerEndsAt]);

  const launchLive = left > 0;
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  const priceOf = (t: Tier) => (launchLive ? t.launch : t.regular);
  const tier = props.tiers.find((t) => t.id === selected)!;

  async function startCheckout() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tier: selected, email, phone }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; orderId?: string; amountRupees?: number };
      if (!res.ok || !data.orderId) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        formRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      fetch('/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'checkout_opened' }) }).catch(() => {});
      setCheckout({ orderId: data.orderId, amountRupees: data.amountRupees ?? priceOf(tier) });
    } catch {
      setError('Could not reach us. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDemo() {
    if (!checkout) return;
    setBusy(true);
    try {
      const res = await fetch('/api/order/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: checkout.orderId }) });
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
      <div className="timer">
        <div className="stack">
          <span className="dim" style={{ fontSize: 11.5, fontWeight: 600, color: '#DCCBDD' }}>
            {launchLive ? 'Launch price held for' : 'Launch price has ended'}
          </span>
          <span className="clock">{launchLive ? `${mm}:${ss}` : 'Regular price'}</span>
        </div>
        <button type="button" onClick={() => formRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })}>
          GET MY PLAN
        </button>
      </div>

      <section style={{ margin: '16px 20px 0', border: '2px solid var(--line)', borderRadius: 22, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div style={{ height: 40, background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>Now</div>
        <div style={{ height: 40, background: 'var(--tint)', color: 'var(--pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>Your goal</div>
        <div className="stack" style={{ padding: 16, gap: 12, borderRight: '2px solid var(--line)' }}>
          <div className="stack" style={{ gap: 2 }}>
            <span className="small" style={{ fontWeight: 700 }}>Weight</span>
            <span style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800 }}>{props.weightKg} kg</span>
          </div>
          <div className="stack" style={{ gap: 2 }}>
            <span className="small" style={{ fontWeight: 700 }}>BMI</span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{props.bmi}</span>
          </div>
        </div>
        <div className="stack" style={{ padding: 16, gap: 12 }}>
          <div className="stack" style={{ gap: 2 }}>
            <span className="small" style={{ fontWeight: 700 }}>Weight</span>
            <span style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800, color: 'var(--pink)' }}>{props.toLoseKg > 0 ? `${props.goalKg} kg` : 'Hold steady'}</span>
          </div>
          <div className="stack" style={{ gap: 2 }}>
            <span className="small" style={{ fontWeight: 700 }}>{props.goalDate ? 'Estimated by' : 'Daily calories'}</span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{props.goalDate ? longDate(props.goalDate) : `${props.targetKcal} kcal`}</span>
          </div>
        </div>
      </section>

      <section className="stack" style={{ padding: '24px 20px 0', alignItems: 'center', gap: 8 }}>
        <h1 className="h1 big">
          Unlock the diet for <span className="accent">your type</span>
        </h1>
        <div className="signal" style={{ height: 32 }}>
          <i />
          <span>Your result: {props.typeName}</span>
        </div>
        <div className="soft stack" style={{ alignSelf: 'stretch', marginTop: 6, gap: 9, padding: '14px 16px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>Built from your {props.answerCount} answers</div>
          {props.recap.map((line) => (
            <div key={line} className="line-item" style={{ fontSize: 14, fontWeight: 600 }}>
              <Tick small />
              <span>{line}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stack" style={{ padding: '18px 20px 0', gap: 10 }}>
        {props.tiers.map((t) => {
          const on = t.id === selected;
          const price = priceOf(t);
          const button = (
            <button key={t.id} type="button" className={`tier${on ? ' on' : ''}${t.popular ? ' pop' : ''}`} aria-pressed={on} onClick={() => setSelected(t.id)}>
              <span className="radio">
                <i />
              </span>
              <span className="stack" style={{ flex: 1, gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>{t.name}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>
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
              <div className="pop-band">MOST POPULAR</div>
              {button}
            </div>
          ) : (
            button
          );
        })}
      </section>

      <section ref={formRef} className="stack" style={{ padding: '18px 20px 0', gap: 12 }}>
        <div className="field">
          <label htmlFor="pay-email">Email for your plan</label>
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
        <button type="button" className="btn" disabled={busy || props.provider === null} onClick={startCheckout}>
          Get my plan · {rupees(priceOf(tier))}
        </button>
        <div className="center" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>
          {props.provider === null ? 'Payments are not switched on yet.' : 'One-time payment. No auto-renewal.'}
        </div>
        <div className="guarantee">
          <Shield style={{ flex: 'none', color: 'var(--green)' }} />
          <div className="stack" style={{ gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>7-day money-back guarantee</span>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>If the plan does not fit your kitchen, write to us for a full refund.</span>
          </div>
        </div>
      </section>

      <section className="stack" style={{ padding: '32px 20px 0', gap: 14 }}>
        <h2 className="h2">What you get</h2>
        <div className="grid3">
          {[
            ['/img/dosa.jpg', 'Dosa with sambar and chutney', 'Breakfast'],
            ['/img/thali.jpg', 'Thali with rotis, dal and sabzi', 'Lunch'],
            ['/img/palak.jpg', 'Bowl of palak paneer', 'Dinner'],
          ].map(([src, alt, label]) => (
            <div key={label} className="stack" style={{ gap: 6 }}>
              <img className="photo-sq" src={src} alt={alt} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--pink)' }}>{label.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div className="stack" style={{ gap: 12, marginTop: 4 }}>
          {[`Every day planned: 5 meals, about ${props.targetKcal} kcal, in your own cuisine`, 'Two swaps for every single meal', 'A grocery list for each week', 'Sent to your email, with a login to come back any time', ...props.planChanges].map((line) => (
            <div key={line} className="line-item top" style={{ fontSize: 15 }}>
              <Tick />
              <span>{line}</span>
            </div>
          ))}
        </div>
        {props.medicationAdvisory ? <div className="advice">{MEDICATION_ADVISORY}</div> : null}
      </section>

      <section className="stack" style={{ padding: '32px 20px 0' }}>
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

      <section className="plum stack grow" style={{ marginTop: 32, borderRadius: 0, padding: '28px 20px 24px', gap: 14 }}>
        <div className="stack center" style={{ gap: 4 }}>
          <div style={{ fontSize: 26, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {tier.name} for <span style={{ color: 'var(--yellow)' }}>{rupees(priceOf(tier))}</span>
          </div>
          <div className="dim" style={{ fontSize: 13.5, fontWeight: 600 }}>
            One-time payment. No auto-renewal.
          </div>
        </div>
        <button type="button" className="btn" style={{ boxShadow: 'none' }} disabled={busy || props.provider === null} onClick={startCheckout}>
          Get my plan
        </button>
        <p className="dim center" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          Fitovela offers nutrition guidance. It does not diagnose or treat any medical condition. Results vary from person to person. If you take medication, speak to your doctor first.
        </p>
      </section>

      {checkout ? (
        <div className="sheet-back" role="dialog" aria-modal="true" aria-label="Demo checkout">
          <div className="sheet">
            <h2 className="h2">Demo checkout</h2>
            <div className="demo-note">This is a test payment. No money moves. Razorpay is not connected yet.</div>
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
