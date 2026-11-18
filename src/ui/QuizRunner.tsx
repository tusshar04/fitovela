'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { bmi } from '@/domain/energy';
import { adaptation, buildSteps, firstUnanswered, stepBefore, type Step } from '@/domain/flow';
import { MARKERS, SECTIONS, optionLabel, type Question } from '@/domain/questions';
import { areaCounts, markersFrom } from '@/domain/scoring';
import { asList, isMetrics, type Answers, type AnswerValue, type Metrics } from '@/domain/types';
import { Bars, Check, ChevronLeft, Lock, Logo, Ring, Spark, Tick } from './bits';
import { track } from './track';

const CUISINE_PHOTOS: Record<string, string> = {
  south: '/img/leaf.jpg',
  north: '/img/thali.jpg',
  punjabi: '/img/paneer.jpg',
  gujarati: '/img/thali2.jpg',
};

const SIGNAL_NOUN: Record<string, string> = { pcos: 'hormone', insulin: 'insulin', inflammation: 'inflammation', thyroid: 'thyroid', stress: 'stress' };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** How long the "reading your answers" screen stays before it moves on by itself. */
const SCAN_MS = 2500;


export function QuizRunner({ initialAnswers }: { initialAnswers: Answers }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [key, setKey] = useState<string | null>(() => firstUnanswered(initialAnswers));
  const [phase, setPhase] = useState<'steps' | 'analysing' | 'lead'>(() => (firstUnanswered(initialAnswers) ? 'steps' : 'analysing'));
  const [draft, setDraft] = useState<string[]>([]);
  const [saveError, setSaveError] = useState('');

  const steps = useMemo(() => buildSteps(answers), [answers]);
  const step: Step | undefined = steps.find((s) => s.key === key);
  const questionList = steps.flatMap((s) => (s.kind === 'question' ? [s.question] : []));

  // Load the stored answer into the draft whenever the question changes.
  useEffect(() => {
    if (step?.kind === 'question') {
      setDraft(asList(answers[step.question.id]));
      // Which question she is looking at (never her answer). The gap to the next event is her time on it.
      track('question_view', { q: step.question.id, n: questionList.findIndex((x) => x.id === step.question.id) + 1, of: questionList.length, again: answers[step.question.id] !== undefined });
    }
    if (step?.kind === 'scan') track('scan_view');
    if (step?.kind === 'finding') track('finding_view');
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // The "reading your answers" screen shows a spinner, so she waits for it; a button there was
  // never tapped by someone who thought the site was still working. It moves on by itself.
  useEffect(() => {
    if (phase !== 'steps' || step?.kind !== 'scan') return;
    const timer = setTimeout(() => goNext(answers), SCAN_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, phase]);

  useEffect(() => {
    if (phase === 'analysing') track('analysing_view');
    if (phase === 'lead') track('lead_view');
    window.scrollTo(0, 0);
  }, [phase]);

  function persist(id: string, value: AnswerValue): Answers {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    setSaveError('');
    fetch('/api/session/answers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answers: { [id]: value } }) })
      .then((res) => {
        if (res.status === 401) router.push('/');
        else if (!res.ok) setSaveError('That answer did not save. Check your connection and try again.');
        if (!res.ok) track('save_error', { q: id, status: res.status });
      })
      .catch(() => {
        track('save_error', { q: id, status: 0 });
        setSaveError('That answer did not save. Check your connection and try again.');
      });
    return next;
  }

  function goNext(from: Answers) {
    const list = buildSteps(from);
    const idx = list.findIndex((s) => s.key === key);
    const next = list[idx + 1];
    if (next) setKey(next.key);
    else setPhase('analysing');
  }

  function goBack() {
    const idx = steps.findIndex((s) => s.key === key);
    track('question_back', { q: step?.kind === 'question' ? step.question.id : step?.kind, n: idx + 1 });
    const before = stepBefore(steps, key);
    if (before === null) router.push('/');
    else setKey(before);
  }

  if (phase === 'analysing') return <Analysing answers={answers} onDone={() => setPhase('lead')} />;
  if (phase === 'lead') return <LeadForm onDone={() => router.push('/result')} />;
  if (!step) return null;

  const header = (countText: string) => (
    <header className="hdr">
      <button type="button" className="icon-btn" aria-label="Back" onClick={goBack}>
        <ChevronLeft />
      </button>
      <Logo />
      <div className="count">{countText}</div>
    </header>
  );

  if (step.kind === 'scan') {
    const counts = areaCounts(markersFrom(answers));
    const { skipped, added } = adaptation(answers);
    const struggle = typeof answers.struggle === 'string' ? optionLabel('struggle', answers.struggle) : null;
    return (
      <main className="screen">
        {header('')}
        <div className="pad grow" style={{ paddingTop: 22 }}>
          <svg className="spin" style={{ alignSelf: 'center' }} width="92" height="92" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#FCE7EF" strokeWidth="10" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#C2185B" strokeWidth="10" strokeLinecap="round" strokeDasharray="90 174" />
          </svg>
          <h1 className="h1" style={{ marginTop: 20, fontSize: 28 }}>
            Got it. <span className="accent">Reading your answers</span>
          </h1>
          <p className="sub" style={{ marginTop: 8 }}>
            Your next questions depend on what you just told us.
          </p>
          <div className="soft stack" style={{ marginTop: 20, gap: 12 }}>
            {struggle ? (
              <div className="line-item">
                <Tick />
                <span>Noted: “{struggle}”</span>
              </div>
            ) : null}
            <div className="line-item">
              <Tick />
              <span>{counts.pcos > 0 ? `${plural(counts.pcos, 'hormone signal')} noted` : 'No hormone signals so far'}</span>
            </div>
            <div className="line-item" style={{ color: 'var(--pink-dark)' }}>
              <svg className="spin" style={{ flex: 'none', animationDuration: '0.9s' }} width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="9" fill="none" stroke="#F1C9D8" strokeWidth="3.5" />
                <circle cx="12" cy="12" r="9" fill="none" stroke="#C2185B" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="18 40" />
              </svg>
              <span>Choosing your next questions</span>
            </div>
          </div>
          <div className="plum stack" style={{ marginTop: 12, padding: 16, gap: 4 }}>
            {skipped > 0 ? <span style={{ fontSize: 15, fontWeight: 800 }}>Skipping {plural(skipped, 'question')} that {skipped === 1 ? 'does' : 'do'} not apply to you</span> : null}
            {added > 0 ? <span style={{ fontSize: 15, fontWeight: 800 }}>Adding {plural(added, 'follow-up question')} from your answers</span> : null}
            {skipped === 0 && added === 0 ? <span style={{ fontSize: 15, fontWeight: 800 }}>Your questions are now set for your answers</span> : null}
            <span className="dim" style={{ fontSize: 13, fontWeight: 500 }}>
              {plural(questionList.length, 'question')} in your assessment.
            </span>
          </div>
        </div>
      </main>
    );
  }

  if (step.kind === 'finding') {
    const counts = areaCounts(markersFrom(answers));
    const answered = questionList.filter((q) => answers[q.id] !== undefined).length;
    const remaining = questionList.length - answered;
    const strong = counts.pcos >= 2 || counts.insulin >= 2;
    const names = [counts.pcos >= 2 ? 'PCOS' : null, counts.insulin >= 2 ? 'insulin resistance' : null].filter(Boolean).join(' and ');
    return (
      <main className="screen">
        {header(`${answered}/${questionList.length}`)}
        <div className="pad grow" style={{ paddingTop: 6 }}>
          <img src="/img/yoga.jpg" alt="Woman sitting calmly with folded hands" style={{ display: 'block', width: '100%', height: 150, objectFit: 'cover', objectPosition: 'center 22%', borderRadius: 22 }} />
          <div className="eyebrow" style={{ marginTop: 18 }}>
            What we see so far
          </div>
          <h1 className="h1" style={{ marginTop: 6, fontSize: 28 }}>
            It was never your <span className="accent">willpower.</span>
          </h1>
          <section className="plum stack" style={{ marginTop: 16, gap: 14 }}>
            <div className="dim" style={{ fontSize: 13, fontWeight: 700 }}>
              Signals found in your answers so far
            </div>
            {[
              { name: 'Hormones', n: counts.pcos },
              { name: 'Insulin', n: counts.insulin },
            ].map((r) => (
              <div key={r.name} className="row" style={{ gap: 10 }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{r.name}</span>
                <Bars filled={Math.min(5, r.n)} tone="on" label={`${r.n} signals`} />
                <span style={{ width: 96, textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: 'var(--yellow)' }}>{plural(r.n, 'signal')}</span>
              </div>
            ))}
            {[
              { name: 'Inflammation', status: 'Checking next' },
              { name: 'Thyroid', status: 'Pending' },
            ].map((r) => (
              <div key={r.name} className="row" style={{ gap: 10 }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{r.name}</span>
                <Bars filled={0} tone="on" label="Not checked yet" />
                <span className="dim" style={{ width: 96, textAlign: 'right', fontSize: 12.5, fontWeight: 700 }}>
                  {r.status}
                </span>
              </div>
            ))}
          </section>
          <p className="sub" style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55 }}>
            {strong
              ? `Your answers show signs linked to ${names}. That can make the body hold on to weight even when you eat carefully.`
              : 'Your hormone and insulin signs are low so far. Two more areas to check before we know what is holding your weight.'}{' '}
            {plural(remaining, 'more question')} and your report is ready.
          </p>
          <button type="button" className="btn push" onClick={() => goNext(answers)}>
            Keep going
          </button>
        </div>
      </main>
    );
  }

  // A question.
  const q = step.question;
  const index = questionList.findIndex((x) => x.id === q.id) + 1;
  const sectionIndex = SECTIONS.findIndex((s) => s.id === q.section);
  const because = q.because ? q.because(answers) : null;
  const noted = q.noted && draft[0] ? q.noted[draft[0]] : null;

  const markerOptions = q.options?.filter((o) => o.marker) ?? [];
  const signalCount = markerOptions.filter((o) => draft.includes(o.id)).length;
  const noun = markerOptions[0]?.marker ? SIGNAL_NOUN[MARKERS[markerOptions[0].marker].area] : null;

  function toggle(optId: string) {
    const opt = q.options?.find((o) => o.id === optId);
    if (!opt) return;
    if (q.kind === 'single') {
      if (q.noted) {
        setDraft([optId]);
      } else {
        setDraft([optId]);
        const next = persist(q.id, optId);
        setTimeout(() => goNext(next), 180);
      }
      return;
    }
    let next: string[];
    if (opt.exclusive) next = draft.includes(optId) ? [] : [optId];
    else {
      const exclusiveIds = q.options?.filter((o) => o.exclusive).map((o) => o.id) ?? [];
      next = draft.filter((x) => !exclusiveIds.includes(x));
      next = next.includes(optId) ? next.filter((x) => x !== optId) : [...next, optId];
      if (q.max && next.length > q.max) next = next.slice(-q.max);
    }
    setDraft(next);
  }

  function submit() {
    if (draft.length === 0) return;
    const value: AnswerValue = q.kind === 'single' ? draft[0] : draft;
    goNext(persist(q.id, value));
  }

  return (
    <main className="screen">
      {header(`${index}/${questionList.length}`)}
      <div className="tabs" style={{ gridTemplateColumns: `repeat(${SECTIONS.length}, minmax(0, 1fr))` }}>
        {SECTIONS.map((s, i) => (
          <div key={s.id} className={`tab${i < sectionIndex ? ' done' : i === sectionIndex ? ' now' : ''}`}>
            <i />
            <b>{s.label}</b>
          </div>
        ))}
      </div>

      <div className="pad grow" style={{ paddingTop: 18 }}>
        {because ? (
          <div className="because" style={{ marginBottom: 12 }}>
            <Spark />
            <span>{because}</span>
          </div>
        ) : q.eyebrow ? (
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {q.eyebrow}
          </div>
        ) : null}
        <h1 className="h1">
          {q.title} <span className="accent">{q.accent}</span>
        </h1>
        {q.help ? (
          <p className="sub" style={{ marginTop: 6, fontSize: 14 }}>
            {q.help}
          </p>
        ) : null}

        {q.kind === 'metrics' ? (
          <MetricsForm initial={isMetrics(answers.metrics) ? answers.metrics : null} onSubmit={(m) => goNext(persist('metrics', m))} />
        ) : q.kind === 'cuisine' ? (
          <>
            <div className="grid2" style={{ marginTop: 18, gap: 12 }}>
              {q.options!.filter((o) => CUISINE_PHOTOS[o.id]).map((o) => (
                <button key={o.id} type="button" className={`tile${draft.includes(o.id) ? ' on' : ''}`} aria-pressed={draft.includes(o.id)} onClick={() => toggle(o.id)}>
                  <img src={CUISINE_PHOTOS[o.id]} alt="" />
                  <span className="shade" />
                  <span className="name">{o.label}</span>
                  <span className="badge">
                    <Check />
                  </span>
                </button>
              ))}
            </div>
            <div className="chips" style={{ marginTop: 12 }}>
              {q.options!.filter((o) => !CUISINE_PHOTOS[o.id]).map((o) => (
                <button key={o.id} type="button" className={`chip${draft.includes(o.id) ? ' on' : ''}`} aria-pressed={draft.includes(o.id)} onClick={() => toggle(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="opts" style={{ marginTop: 16 }}>
            {q.options!.map((o) => {
              const on = draft.includes(o.id);
              return (
                <button key={o.id} type="button" className={`opt${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle(o.id)}>
                  <span>{o.label}</span>
                  {q.kind === 'single' ? (
                    <span className="mark radio">
                      <i />
                    </span>
                  ) : (
                    <span className="mark">
                      <Check />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {noted ? (
          <div className="plum noted reveal" style={{ marginTop: 14, padding: '14px 16px' }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="pill">NOTED</span>
              <span className="dim" style={{ fontSize: 12.5, fontWeight: 700 }}>
                {noted.effect}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{noted.insight}</div>
          </div>
        ) : null}

        {saveError ? (
          <p className="error center" style={{ marginTop: 12 }}>
            {saveError}
          </p>
        ) : null}

        {q.kind === 'metrics' || (q.kind === 'single' && !q.noted) ? null : (
          <div className="push stack" style={{ gap: 12, paddingTop: 14 }}>
            {q.kind === 'multi' && noun ? (
              <div className="signal">
                <i />
                <span>{signalCount === 0 ? `No ${noun} signals here` : `${plural(signalCount, `${noun} signal`)} found`}</span>
              </div>
            ) : null}
            <button type="button" className="btn" disabled={draft.length === 0} onClick={submit}>
              Continue
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function MetricsForm({ initial, onSubmit }: { initial: Metrics | null; onSubmit: (m: Metrics) => void }) {
  const [age, setAge] = useState(initial ? String(initial.age) : '');
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const [cm, setCm] = useState(initial ? String(initial.heightCm) : '');
  const [ft, setFt] = useState('');
  const [inch, setInch] = useState('');
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : '');
  const [goal, setGoal] = useState(initial ? String(initial.goalKg) : '');
  const [error, setError] = useState('');

  const heightCm = unit === 'cm' ? Number(cm) : Math.round((Number(ft) * 12 + Number(inch || 0)) * 2.54 * 10) / 10;
  const w = Number(weight);
  const showBmi = heightCm >= 120 && heightCm <= 215 && w >= 30 && w <= 250;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(age);
    const g = Number(goal);
    // Records which box stopped her, not what she typed.
    const fail = (field: string, message: string) => {
      track('form_error', { form: 'metrics', field });
      setError(message);
    };
    if (!(a >= 13 && a <= 90)) return fail('age', 'Enter your age in years.');
    if (!(heightCm >= 120 && heightCm <= 215)) return fail('height', unit === 'cm' ? 'Enter your height in centimetres, for example 160.' : 'Enter your height in feet and inches, for example 5 and 3.');
    if (!(w >= 30 && w <= 250)) return fail('weight', 'Enter your weight in kilograms.');
    if (!(g >= 30 && g <= 250)) return fail('goal', 'Enter the weight you want to reach, in kilograms.');
    setError('');
    onSubmit({ age: Math.round(a), heightCm, weightKg: w, goalKg: g });
  }

  return (
    <form className="grow" style={{ marginTop: 18, gap: 14 }} onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="m-age">Age</label>
        <input id="m-age" className="input" inputMode="numeric" placeholder="Years" value={age} onChange={(e) => setAge(e.target.value)} />
      </div>
      <div className="field">
        <div className="row between">
          <label htmlFor={unit === 'cm' ? 'm-cm' : 'm-ft'}>Height</label>
          <div className="seg" role="group" aria-label="Height unit">
            <button type="button" className={unit === 'cm' ? 'on' : ''} aria-pressed={unit === 'cm'} onClick={() => setUnit('cm')}>
              cm
            </button>
            <button type="button" className={unit === 'ft' ? 'on' : ''} aria-pressed={unit === 'ft'} onClick={() => setUnit('ft')}>
              ft, in
            </button>
          </div>
        </div>
        {unit === 'cm' ? (
          <input id="m-cm" className="input" inputMode="decimal" placeholder="For example 160" value={cm} onChange={(e) => setCm(e.target.value)} />
        ) : (
          <div className="grid2">
            <input id="m-ft" className="input" inputMode="numeric" placeholder="Feet" aria-label="Feet" value={ft} onChange={(e) => setFt(e.target.value)} />
            <input id="m-in" className="input" inputMode="numeric" placeholder="Inches" aria-label="Inches" value={inch} onChange={(e) => setInch(e.target.value)} />
          </div>
        )}
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="m-weight">Weight now (kg)</label>
          <input id="m-weight" className="input" inputMode="decimal" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="m-goal">Goal weight (kg)</label>
          <input id="m-goal" className="input" inputMode="decimal" placeholder="kg" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
      </div>
      {showBmi ? (
        <div className="soft row between reveal" style={{ padding: '12px 16px' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Your BMI</span>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{bmi({ heightCm, weightKg: w })}</span>
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" className="btn push">
        Continue
      </button>
    </form>
  );
}

function Analysing({ answers, onDone }: { answers: Answers; onDone: () => void }) {
  const [percent, setPercent] = useState(8);
  const total = Object.keys(answers).length;
  const lines = ['Hormone signs (PCOS / PCOD)', 'Insulin response', 'Inflammation markers', 'Thyroid signs'];
  const shown = Math.min(lines.length, Math.floor(percent / 24));

  useEffect(() => {
    const timer = setInterval(() => setPercent((p) => Math.min(100, p + 4)), 110);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (percent >= 100) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
  }, [percent, onDone]);

  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo />
      </header>
      <div className="pad grow" style={{ paddingTop: 10 }}>
        <Ring percent={percent} />
        <h1 className="h1" style={{ marginTop: 14, fontSize: 28 }}>
          Building your <span className="accent">report</span>
        </h1>
        <p className="sub" style={{ marginTop: 6 }}>
          Checking {plural(total, 'answer')} across 4 systems
        </p>
        <div className="soft stack" style={{ marginTop: 16, gap: 10, minHeight: 148 }}>
          {lines.slice(0, shown).map((l) => (
            <div key={l} className="line-item reveal" style={{ fontSize: 14 }}>
              <Tick />
              <span style={{ flex: 1 }}>{l}</span>
              <span style={{ fontSize: 12, color: 'var(--green)' }}>Analysed</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function LeadForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    track(body.skip ? 'lead_skip_tap' : 'lead_submit');
    try {
      const res = await fetch('/api/session/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; field?: string };
      if (!res.ok) {
        track('form_error', { form: 'lead', field: data.field ?? 'server', status: res.status });
        setError({ field: data.field, message: data.error ?? 'Something went wrong. Please try again.' });
        setBusy(false);
        return;
      }
      onDone();
    } catch {
      track('form_error', { form: 'lead', field: 'network', status: 0 });
      setError({ message: 'Could not reach us. Check your connection and try again.' });
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo />
      </header>
      <form
        className="pad grow"
        style={{ paddingTop: 2 }}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          send({ email, phone, marketingOptIn: optIn });
        }}
      >
        <Ring percent={100} />
        <h1 className="h1" style={{ marginTop: 14, fontSize: 28 }}>
          Your report is <span className="accent">ready.</span>
        </h1>
        <p className="sub" style={{ marginTop: 6, fontSize: 14 }}>
          Where should we send a copy?
        </p>

        <div className="stack" style={{ marginTop: 18, gap: 12 }}>
          <div className="field">
            <label htmlFor="lead-email">Email address</label>
            <input id="lead-email" className={`input${error?.field === 'email' ? ' bad' : ''}`} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <span className="small">Your report and your plan are sent here.</span>
          </div>
          <div className="field">
            <label htmlFor="lead-phone">Mobile number</label>
            <div className="row" style={{ gap: 8 }}>
              <div className="prefix">+91</div>
              <input id="lead-phone" className={`input${error?.field === 'phone' ? ' bad' : ''}`} type="tel" autoComplete="tel-national" inputMode="numeric" placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <span className="small">You log in with this number and a one-time code. No password.</span>
          </div>
          <label className="checkline" htmlFor="lead-optin">
            <input id="lead-optin" type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
            <span>Also send me weekly recipes and offers</span>
          </label>
        </div>

        {error ? (
          <p className="error" style={{ marginTop: 4 }}>
            {error.message}
          </p>
        ) : null}

        <button type="submit" className="btn" style={{ marginTop: 10 }} disabled={busy}>
          Show my result
        </button>
        <button type="button" className="link-btn" disabled={busy} onClick={() => send({ skip: true })}>
          Skip, just show me
        </button>

        <div className="push row small" style={{ gap: 10, alignItems: 'flex-start', paddingTop: 12 }}>
          <Lock size={16} stroke={2} style={{ flex: 'none', marginTop: 1 }} />
          <span>Your health answers stay private. We use them only for your report and plan, and delete them if you ask.</span>
        </div>
      </form>
    </main>
  );
}
