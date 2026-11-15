import { redirect } from 'next/navigation';
import { buildAssessment, cuisineLabels } from '@/domain/assessment';
import { EXCLUSION_LABEL } from '@/domain/eligibility';
import { BMI_BAND_LABEL } from '@/domain/energy';
import { isComplete } from '@/domain/flow';
import { SUGGESTED_TESTS } from '@/domain/typeContent';
import { STRENGTH_LABEL } from '@/domain/typing';
import { AREAS, AREA_LABEL, LEVEL_LABEL } from '@/domain/types';
import { currentSession, logEvent } from '@/server/session';
import { Bars, ChevronRight, Lock, Logo, Plus } from '@/ui/bits';
import { JourneyCard } from '@/ui/JourneyCard';
import { TargetCard } from '@/ui/TargetCard';

export const dynamic = 'force-dynamic';


export default async function ResultPage() {
  const session = await currentSession();
  if (!session) redirect('/');
  if (!isComplete(session.answers)) redirect('/quiz');
  const a = buildAssessment(session.answers);
  if (!a) redirect('/quiz');
  await logEvent('result_view', session.id, { type: a.result.type });

  const { content, result, energy, metrics } = a;
  const answered = Object.keys(session.answers).length;
  const isRoutine = result.type === 'routine';
  const bmiPin = Math.max(2, Math.min(98, ((a.bmi - 15) / 20) * 100));

  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo />
      </header>
      <div className="pad grow" style={{ paddingTop: 2, gap: 18 }}>
        <div className="stack" style={{ alignItems: 'center', gap: 4 }}>
          <div className="eyebrow">Your assessment report</div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--faint)' }}>
            Age {metrics.age} · {answered} answers analysed
          </div>
        </div>

        <section className="plum stack" style={{ padding: 22, gap: 16 }}>
          <div className="stack" style={{ gap: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--yellow)' }}>YOUR SYMPTOMS MATCH</div>
            <h1 style={{ fontSize: 29, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.028em' }}>
              {content.name}{' '}
              <span className="accent" style={{ color: '#FF9DBB', whiteSpace: 'nowrap' }}>
                {content.accent}
              </span>
            </h1>
          </div>
          {isRoutine ? (
            <span className="tag-yellow" style={{ alignSelf: 'flex-start' }}>
              No strong hormonal pattern
            </span>
          ) : (
            <div className="match">
              <div className="row between" style={{ gap: 12 }}>
                <span className="dim" style={{ fontSize: 13, fontWeight: 500 }}>
                  <b style={{ color: '#fff', fontWeight: 700 }}>
                    {result.matched} of {result.total}
                  </b>{' '}
                  markers matched
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)' }}>{STRENGTH_LABEL[result.strength]}</span>
              </div>
              <div className="meter">
                <i style={{ width: `${Math.round((result.matched / Math.max(1, result.total)) * 100)}%` }} />
              </div>
            </div>
          )}
          <p style={{ fontSize: 14, lineHeight: 1.55, color: '#E6D9E8' }}>{content.summary}</p>
        </section>

        <section className="outline stack" style={{ padding: '16px 18px 6px', gap: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', paddingBottom: 6 }}>What we found across 4 systems</h2>
          {AREAS.map((area) => (
            <div key={area} className="sys-row">
              <span style={{ flex: 1 }}>{AREA_LABEL[area]}</span>
              <Bars filled={Math.min(5, a.counts[area])} tone={a.levels[area]} label={`${a.counts[area]} signs`} />
              <span className={`lvl ${a.levels[area]}`}>{LEVEL_LABEL[a.levels[area]]}</span>
            </div>
          ))}
        </section>

        <section className="sec">
          <h2 className="h2">
            What this means <span className="accent">for you</span>
          </h2>
          <div>
            {content.means.map((line, i) => (
              <div key={line} className="means">
                <b>{i + 1}</b>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </section>

        <JourneyCard stops={a.journey} />

        <section className="outline stack" style={{ padding: '16px 18px 4px', gap: 12, marginTop: 10 }}>
          <div className="row between" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Your BMI</span>
              <span style={{ fontSize: 24, lineHeight: 1, fontWeight: 700, letterSpacing: '-0.02em' }}>{a.bmi}</span>
            </div>
            <span className="tag-soft">{BMI_BAND_LABEL[a.bmiBand]}</span>
          </div>
          <div className="bmi-scale">
            <div className="track">
              <i style={{ width: '17.5%', background: '#9CC7EE' }} />
              <i style={{ width: '22.5%', background: 'var(--green-bright)' }} />
              <i style={{ width: '10%', background: 'var(--amber)' }} />
              <i style={{ flex: 1, background: 'var(--red)' }} />
            </div>
            <span className="pin" style={{ left: `${bmiPin}%` }} />
            <div className="labels">
              <span style={{ width: '17.5%' }}>Low</span>
              <span style={{ width: '22.5%' }}>Healthy</span>
              <span style={{ width: '10%' }}>Over</span>
              <span style={{ flex: 1 }}>Obese</span>
            </div>
          </div>
          {energy.week12LossKg > 0 ? (
            <details className="numbers">
              <summary>
                <span>See your 12-week numbers</span>
                <Plus size={18} stroke={2} />
              </summary>
              <TargetCard metrics={metrics} energy={energy} />
            </details>
          ) : (
            <p className="small" style={{ paddingBottom: 12 }}>
              For Indian adults the healthy range is 18.5 to 22.9.
            </p>
          )}
        </section>

        {a.eligibility.eligible ? (
          <section className="locked-card">
            <div className="head">
              <h2 style={{ fontSize: 16.5, lineHeight: 1.25, fontWeight: 700, letterSpacing: '-0.012em' }}>Your diet for this type</h2>
              <span className="lock-pill">
                <Lock size={12} />
                <span>Locked</span>
              </span>
            </div>
            <div className="rows">
              {[
                ['Breakfast', 'A dish from your kitchen'],
                ['Lunch', 'Built for your type and goal'],
                ['Dinner', 'With two swaps for each'],
                ['Daily calories', `${energy.targetKcal.toLocaleString('en-IN')} kcal, set for you`],
                ['Movement', 'Your basic movement plan'],
              ].map(([k, v]) => (
                <div key={k} className="locked-row">
                  <b>{k}</b>
                  <span aria-hidden>{v}</span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="advice stack" style={{ gap: 8, padding: 18, borderRadius: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Please talk to us before starting a plan</h2>
            <p>
              You told us {a.eligibility.reasons.map((r) => EXCLUSION_LABEL[r]).join(', and ')}. A self-serve diet plan is not the right fit without a professional looking at your case first.
            </p>
            <a className="btn" href="/unlock" style={{ marginTop: 6 }}>
              See what happens next
            </a>
          </section>
        )}

        <p className="small">
          This report is a symptom assessment based on your answers, not a medical diagnosis. To confirm, ask your doctor about these tests: {SUGGESTED_TESTS.join(', ')}.
        </p>
      </div>

      {a.eligibility.eligible ? (
        <div className="sticky-cta">
          <a className="btn" href="/unlock">
            Unlock my diet plan
            <ChevronRight size={18} stroke={2.6} />
          </a>
          <div className="under">Built for your type{a.cuisines.length ? `, in ${cuisineLabels(a.cuisines)} food` : ''}</div>
        </div>
      ) : null}
    </main>
  );
}
