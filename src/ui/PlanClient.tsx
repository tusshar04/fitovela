'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { MovementPlan } from '@/domain/energy';
import { CHECKIN_SIGNS, type CheckinSign } from '@/domain/intensive';
import type { GroceryItem, Plan, PlanDish } from '@/domain/plan/generator';
import { Check, Lock, Logo, SwapIcon } from './bits';

const DAY_NAMES = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

const STRENGTH_MOVES = ['Squats, 3 sets of 12', 'Wall or knee push-ups, 3 sets of 10', 'Glute bridges, 3 sets of 15', 'Plank, 3 holds of 20 seconds'];

/** Today's movement. Walk days come first in the week; strength falls on days 1, 3 and 5; the last day is rest. DRAFT, pending the doctor's review. */
function MovementCard({ movement, dayOfWeek }: { movement: MovementPlan; dayOfWeek: number }) {
  const walkToday = dayOfWeek <= movement.walkDays;
  const strengthDays = [1, 3, 5].slice(0, movement.strengthDays);
  const strengthToday = strengthDays.includes(dayOfWeek);
  return (
    <div className="plum stack" style={{ margin: '14px 20px 0', gap: 8, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--yellow)' }}>TODAY&apos;S MOVEMENT</div>
      {walkToday ? <div style={{ fontSize: 16, fontWeight: 800 }}>{movement.walkMinutes}-minute brisk walk</div> : null}
      {walkToday ? (
        <div className="dim" style={{ fontSize: 13 }}>
          Fast enough that you can talk but not sing. Split it into two walks if that is easier.
        </div>
      ) : null}
      {strengthToday ? (
        <>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{movement.strengthMinutes} minutes of strength</div>
          <div className="dim stack" style={{ fontSize: 13, gap: 2 }}>
            {STRENGTH_MOVES.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </>
      ) : null}
      {!walkToday && !strengthToday ? (
        <>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Rest day</div>
          <div className="dim" style={{ fontSize: 13 }}>
            {movement.walkDays === 0 ? 'Keep up the activity you already do.' : 'A gentle stroll or stretching is enough today.'}
          </div>
        </>
      ) : null}
      <div className="dim" style={{ fontSize: 12 }}>
        About {movement.kcalPerDay} kcal a day on average across the week. Stop and see a doctor if you feel chest pain, dizziness or joint pain.
      </div>
    </div>
  );
}

function formatQty(g: GroceryItem): string {
  if (g.unit === 'g' && g.qty >= 1000) return `${Math.round(g.qty / 100) / 10} kg`;
  if (g.unit === 'ml' && g.qty >= 1000) return `${Math.round(g.qty / 100) / 10} litre`;
  if (g.unit === 'pc') return `${Math.round(g.qty)}`;
  return `${Math.round(g.qty)} ${g.unit}`;
}

interface PlanProps {
  plan: Plan;
  /** Weeks in the plan she bought. On the intensive track `plan` holds only the weeks that are open. */
  totalWeeks: number;
  token: string;
  tierName: string;
  typeName: string;
  justBought: boolean;
  email: string;
  emailSent: boolean;
  /** Set while she is on the intensive plan and check-ins are still due. */
  intensive: { lastKg: number | null } | null;
  movedToStandard: boolean;
}

/** The weekly check-in that opens the next week of an intensive plan. */
function CheckinCard({ token, week, lastKg }: { token: string; week: number; lastKg: number | null }) {
  const router = useRouter();
  const [weight, setWeight] = useState('');
  const [signs, setSigns] = useState<CheckinSign[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(id: CheckinSign) {
    setSigns((prev) => {
      if (id === 'none') return prev.includes('none') ? [] : ['none'];
      const rest = prev.filter((x) => x !== 'none');
      return rest.includes(id) ? rest.filter((x) => x !== id) : [...rest, id];
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/plan/checkin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, weightKg: Number(weight), signs }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setWeight('');
      setSigns([]);
      router.refresh();
    } catch {
      setError('Could not reach us. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="outline stack" style={{ margin: '14px 20px 0', gap: 12 }} onSubmit={submit} noValidate>
      <div className="stack" style={{ gap: 4 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--pink)' }}>WEEK {week} CHECK-IN</span>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.012em' }}>Finished week {week}? Check in to open week {week + 1}</span>
        <span className="small">On the intensive plan each new week opens after this short check-in. Answer honestly: it is there to keep you safe.</span>
      </div>
      <div className="field">
        <label htmlFor="ci-weight">Your weight today (kg){lastKg ? `, last time ${lastKg}` : ''}</label>
        <input id="ci-weight" className="input" inputMode="decimal" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>This week, did you have any of these?</span>
        {CHECKIN_SIGNS.map((sgn) => {
          const on = signs.includes(sgn.id);
          return (
            <button key={sgn.id} type="button" className={`opt${on ? ' on' : ''}`} style={{ minHeight: 48, fontSize: 14.5 }} aria-pressed={on} onClick={() => toggle(sgn.id)}>
              <span>{sgn.label}</span>
              <span className="mark">
                <Check />
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" className="btn" disabled={busy || !weight || signs.length === 0}>
        Submit check-in
      </button>
    </form>
  );
}

export function PlanClient({ plan, totalWeeks, token, tierName, typeName, justBought, email, emailSent, intensive, movedToStandard }: PlanProps) {
  const [day, setDay] = useState(1);
  const [view, setView] = useState<'day' | 'groceries'>('day');
  // Which option is showing for each meal: 0 is the planned dish, 1 and 2 are the swaps.
  const [choice, setChoice] = useState<Record<string, number>>({});
  const storageKey = `fv-swaps-${token}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setChoice(JSON.parse(raw) as Record<string, number>);
    } catch {
      /* swaps simply start fresh */
    }
  }, [storageKey]);

  function swap(key: string, options: number) {
    setChoice((prev) => {
      const next = { ...prev, [key]: ((prev[key] ?? 0) + 1) % options };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* not saved; still works for this visit */
      }
      return next;
    });
  }

  const openWeeks = Math.ceil(plan.days.length / 7);
  const week = Math.ceil(day / 7);
  const weekDays = plan.days.slice((week - 1) * 7, week * 7);
  const today = plan.days[day - 1];
  // The latest journey stop she has reached.
  const thisWeek = (plan.journey ?? []).filter((s) => s.week <= week).pop();

  const shown = today.meals.map((m) => {
    const options: PlanDish[] = [m.dish, ...m.swaps];
    const idx = (choice[`${day}-${m.slot}`] ?? 0) % options.length;
    return { meal: m, dish: options[idx], options: options.length, swapped: idx !== 0 };
  });
  const kcal = shown.reduce((n, s) => n + s.dish.kcal + s.meal.addOns.reduce((x, a) => x + a.kcal, 0), 0);
  const protein = shown.reduce((n, s) => n + s.dish.protein + s.meal.addOns.reduce((x, a) => x + a.protein, 0), 0);

  return (
    <main className="screen">
      <header className="row between" style={{ padding: '18px 20px 0', alignItems: 'flex-end', gap: 12 }}>
        <div className="stack" style={{ gap: 6 }}>
          <Logo href="/my-plans" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
            {plan.track === 'intensive' ? 'Intensive · ' : ''}
            {tierName} · {typeName}
          </span>
        </div>
        <span className="tag-yellow">Week {week}</span>
      </header>

      {justBought ? (
        <div className="banner" style={{ margin: '14px 20px 0' }}>
          {emailSent
            ? `Your plan is ready. A link to this page is on its way to ${email}. To come back later, log in with your mobile number.`
            : `Your plan is ready. Email sending is not connected yet, so nothing was sent to ${email}. To come back later, log in with your mobile number.`}
        </div>
      ) : null}

      {movedToStandard ? (
        <div className="advice stack" style={{ margin: '14px 20px 0', gap: 6 }}>
          <b style={{ fontSize: 15 }}>{plan.track === 'intensive' ? 'Your intensive plan has stopped' : 'You are now on the standard plan'}</b>
          <span>
            Your last check-in showed a sign that the intensive plan is too strict for you right now.{' '}
            {plan.track === 'intensive' ? 'Do not continue it. Add a full extra meal each day and write to us for your standard plan.' : 'Your plan now has more food each day. Nothing else changes.'} If you feel faint, your heart races, you have strong
            belly pain or you cannot keep food down, see a doctor today.
          </span>
        </div>
      ) : null}

      {totalWeeks > 1 ? (
        <div className="weeks" style={{ padding: '14px 20px 0' }}>
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) =>
            w <= openWeeks ? (
              <button key={w} type="button" className={w === week ? 'on' : ''} aria-pressed={w === week} onClick={() => setDay((w - 1) * 7 + 1)}>
                Week {w}
              </button>
            ) : (
              <button key={w} type="button" disabled aria-label={`Week ${w}, opens after your check-in`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, opacity: 0.55 }}>
                <Lock size={11} />
                Week {w}
              </button>
            ),
          )}
        </div>
      ) : null}

      {view === 'day' ? (
        <>
          {thisWeek ? (
            <div className="soft stack" style={{ margin: '14px 20px 0', gap: 2, padding: '12px 16px' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--pink)' }}>
                {thisWeek.week === week ? 'THIS WEEK' : `SINCE WEEK ${thisWeek.week}`} · {thisWeek.title.toUpperCase()}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{thisWeek.lines[0]}</span>
            </div>
          ) : null}
          <div style={{ padding: '14px 20px 0' }}>
            <h1 style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.02em' }}>
              Today&apos;s <span className="accent">plate</span>
            </h1>
          </div>
          <div className="days" style={{ padding: '12px 20px 0' }}>
            {weekDays.map((d, i) => (
              <button key={d.day} type="button" className={`daybtn${d.day === day ? ' on' : ''}`} aria-pressed={d.day === day} aria-label={`Day ${d.day}`} onClick={() => setDay(d.day)}>
                <small>{DAY_NAMES[i].split(' ')[0]}</small>
                <b>{d.day}</b>
              </button>
            ))}
          </div>
          <div className="strip" style={{ margin: '14px 20px 0' }}>
            <div>
              <b>{kcal.toLocaleString('en-IN')}</b>
              <small>kcal</small>
            </div>
            <div>
              <b>{protein} g</b>
              <small>protein</small>
            </div>
            <div>
              <b>{today.meals.length}</b>
              <small>meals</small>
            </div>
          </div>
          <div className="stack" style={{ padding: '14px 20px 0', gap: 10 }}>
            {shown.map(({ meal, dish, options, swapped }) => (
              <div key={meal.slot} className={`meal${meal.label === 'Snack' ? ' snack' : ''}`}>
                <div className="row between" style={{ gap: 10 }}>
                  <span className="when">
                    {meal.label} · {meal.time} · {dish.kcal} kcal
                  </span>
                  {options > 1 ? (
                    <button type="button" className="swap" onClick={() => swap(`${day}-${meal.slot}`, options)} aria-label={`Swap ${meal.label.toLowerCase()}`}>
                      <SwapIcon />
                      <span>{swapped ? 'Swap again' : 'Swap'}</span>
                    </button>
                  ) : null}
                </div>
                <span className="dish">{dish.name}</span>
                <span className="portion">{dish.portion}</span>
                {meal.addOns.map((a) => (
                  <span key={a.id} className="extra">
                    + {a.label} ({a.kcal} kcal)
                  </span>
                ))}
              </div>
            ))}
          </div>
          {plan.movement ? <MovementCard movement={plan.movement} dayOfWeek={((day - 1) % 7) + 1} /> : null}
          {intensive && openWeeks < totalWeeks && week === openWeeks ? <CheckinCard token={token} week={openWeeks} lastKg={intensive.lastKg} /> : null}
          <div className="stack" style={{ padding: '14px 20px 0', gap: 8 }}>
            {plan.notes.map((n, i) => (
              <div key={n} className={i === 0 && plan.notes.length > 1 ? 'advice' : 'soft small'} style={{ borderRadius: 14 }}>
                {n}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ padding: '14px 20px 0' }}>
          <h1 style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Week {week} <span className="accent">groceries</span>
          </h1>
          <p className="small" style={{ marginTop: 6 }}>
            For one person, for the dishes planned this week. Swaps are not included.
          </p>
          <div style={{ marginTop: 10 }}>
            {(plan.groceries[week - 1] ?? []).map((g) => (
              <div key={`${g.item}-${g.unit}`} className="groc">
                <span>{g.item}</span>
                <span>{formatQty(g)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="small" style={{ padding: '18px 20px 16px' }}>
        Fitovela offers nutrition guidance. It does not diagnose or treat any medical condition. Calories and portions are approximate.
      </p>

      <nav className="botnav">
        <button type="button" className={view === 'day' ? 'on' : ''} aria-pressed={view === 'day'} onClick={() => setView('day')}>
          <span>Meals</span>
        </button>
        <button type="button" className={view === 'groceries' ? 'on' : ''} aria-pressed={view === 'groceries'} onClick={() => setView('groceries')}>
          <span>Groceries</span>
        </button>
      </nav>
    </main>
  );
}
