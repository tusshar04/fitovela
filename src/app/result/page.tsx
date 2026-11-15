import { redirect } from 'next/navigation';
import { buildAssessment, cuisineLabels } from '@/domain/assessment';
import { EXCLUSION_LABEL } from '@/domain/eligibility';
import { BMI_BAND_LABEL } from '@/domain/energy';
import { isComplete } from '@/domain/flow';
import { SUGGESTED_TESTS } from '@/domain/typeContent';
import { STRENGTH_LABEL } from '@/domain/typing';
import { AREAS, AREA_LABEL, LEVEL_LABEL } from '@/domain/types';
import { currentSession, logEvent } from '@/server/session';
import { Bars, Lock, Logo } from '@/ui/bits';
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
      <div className="pad grow" style={{ paddingTop: 4, gap: 14 }}>
        <div className="stack" style={{ alignItems: 'center', gap: 4 }}>
          <div className="eyebrow">Your assessment report</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
            Age {metrics.age} · BMI {a.bmi} · {answered} answers analysed
          </div>
        </div>

        <section className="plum stack" style={{ padding: 20, gap: 14 }}>
          <div className="stack" style={{ gap: 6 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--yellow)' }}>YOUR SYMPTOMS MATCH</div>
            <h1 style={{ fontSize: 28, lineHeight: 1.12, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {content.name}{' '}
              <span className="accent" style={{ color: '#FF8FB1' }}>
                {content.accent}
              </span>
            </h1>
          </div>
          {isRoutine ? (
            <span className="tag-yellow" style={{ alignSelf: 'flex-start' }}>
              No strong hormonal pattern
            </span>
          ) : (
            <div className="row between" style={{ gap: 12 }}>
              <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 40, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--yellow)' }}>
                  {result.matched}/{result.total}
                </span>
                <span className="dim" style={{ fontSize: 13, fontWeight: 700 }}>
                  markers matched
                </span>
              </div>
              <span className="tag-yellow">{STRENGTH_LABEL[result.strength]}</span>
            </div>
          )}
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#E8DCEA' }}>{content.summary}</p>
        </section>

        <section className="soft stack" style={{ borderRadius: 22, padding: 18, gap: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>What we found in 4 systems</h2>
          {AREAS.map((area) => (
            <div key={area} className="row" style={{ gap: 8 }}>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{AREA_LABEL[area]}</span>
              <Bars filled={Math.min(5, a.counts[area])} tone={a.levels[area]} label={`${a.counts[area]} signs`} />
              <span className={`lvl ${a.levels[area]}`}>{LEVEL_LABEL[a.levels[area]]}</span>
            </div>
          ))}
        </section>

        <section className="stack" style={{ paddingTop: 10, gap: 12 }}>
          <h2 className="h2">
            What this means <span className="accent">for you</span>
          </h2>
          {content.means.map((line, i) => (
            <div key={line} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <span className="num">{i + 1}</span>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>{line}</span>
            </div>
          ))}
        </section>

        <section className="soft stack" style={{ borderRadius: 22, padding: 18, gap: 12, marginTop: 6 }}>
          <div className="row between" style={{ gap: 12 }}>
            <div className="stack">
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Your BMI</span>
              <span style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.03em' }}>{a.bmi}</span>
            </div>
            <span className="tag-yellow">{BMI_BAND_LABEL[a.bmiBand]}</span>
          </div>
          <div className="bmi-scale">
            <div className="track">
              <i style={{ width: '17.5%', background: '#5AA9E6', borderRadius: '999px 0 0 999px' }} />
              <i style={{ width: '22.5%', background: 'var(--green-bright)' }} />
              <i style={{ width: '10%', background: 'var(--amber)' }} />
              <i style={{ flex: 1, background: 'var(--red)', borderRadius: '0 999px 999px 0' }} />
            </div>
            <span className="pin" style={{ left: `${bmiPin}%` }} />
            <div className="labels">
              <span style={{ width: '17.5%' }}>Low</span>
              <span style={{ width: '22.5%' }}>Healthy</span>
              <span style={{ width: '10%' }}>Over</span>
              <span style={{ flex: 1 }}>Obese</span>
            </div>
          </div>
          <p className="small">For Indian adults the healthy range is 18.5 to 22.9.</p>
        </section>

        <TargetCard metrics={metrics} energy={energy} />

        {a.eligibility.eligible ? (
          <>
            <section className="stack" style={{ border: '2px solid var(--pink)', borderRadius: 22, padding: 18, gap: 4 }}>
              <div className="row between" style={{ gap: 12, marginBottom: 6 }}>
                <h2 style={{ fontSize: 18, lineHeight: 1.25, fontWeight: 800 }}>Your diet for this type</h2>
                <span className="row" style={{ flex: 'none', gap: 6, height: 28, padding: '0 10px', borderRadius: 999, background: 'var(--tint)', color: 'var(--pink-dark)', fontSize: 12, fontWeight: 800 }}>
                  <Lock />
                  <span>Locked</span>
                </span>
              </div>
              {[
                ['Breakfast', 'A dish from your kitchen'],
                ['Lunch', 'Built for your type and goal'],
                ['Dinner', 'With two swaps for each'],
                ['Daily calories', `${energy.targetKcal} kcal, set for you`],
                ['Movement plan', 'Your walk and strength days'],
              ].map(([k, v]) => (
                <div key={k} className="locked-row">
                  <b>{k}</b>
                  <span aria-hidden>{v}</span>
                </div>
              ))}
            </section>
            <div className="stack" style={{ gap: 8, paddingTop: 4 }}>
              <a className="btn" href="/unlock">
                Unlock my diet plan
              </a>
              <div className="center" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>
                Built for your type{a.cuisines.length ? `, in ${cuisineLabels(a.cuisines)} food` : ''}
              </div>
            </div>
          </>
        ) : (
          <section className="advice stack" style={{ gap: 8, padding: 18, borderRadius: 22 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Please talk to us before starting a plan</h2>
            <p>
              You told us {a.eligibility.reasons.map((r) => EXCLUSION_LABEL[r]).join(', and ')}. A self-serve diet plan is not the right fit without a professional looking at your case first.
            </p>
            <a className="btn" href="/unlock" style={{ marginTop: 6 }}>
              See what happens next
            </a>
          </section>
        )}

        <div className="soft small push" style={{ borderRadius: 16, padding: 14 }}>
          This report is a symptom assessment based on your answers, not a medical diagnosis. To confirm, ask your doctor about these tests: {SUGGESTED_TESTS.join(', ')}.
        </div>
      </div>
    </main>
  );
}
