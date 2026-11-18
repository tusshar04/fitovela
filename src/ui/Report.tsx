// Her assessment report. Since 2026-11-18 (D-030) it opens with a paid plan; only a woman
// we cannot sell a plan to still sees it free, on /result.

import type { Assessment } from '@/domain/assessment';
import { BMI_BAND_LABEL } from '@/domain/energy';
import type { JourneyStop } from '@/domain/journey';
import { SUGGESTED_TESTS, type TypeContent } from '@/domain/typeContent';
import { STRENGTH_LABEL } from '@/domain/typing';
import { AREAS, AREA_LABEL, LEVEL_LABEL } from '@/domain/types';
import { Bars, Plus } from './bits';
import { JourneyCard } from './JourneyCard';
import { TargetCard } from './TargetCard';

export function ReportHeading({ age, answered }: { age?: number; answered?: number }) {
  return (
    <div className="stack" style={{ alignItems: 'center', gap: 4 }}>
      <div className="eyebrow">Your assessment report</div>
      {age !== undefined && answered !== undefined ? (
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--faint)' }}>
          Age {age} · {answered} answers analysed
        </div>
      ) : null}
    </div>
  );
}

/** The plum card that names her type. `match` is left out when only the type is known. */
export function TypeCard({ content, match }: { content: TypeContent; match?: Assessment['result'] }) {
  return (
    <section data-sec="type" className="plum stack" style={{ padding: 22, gap: 16 }}>
      <div className="stack" style={{ gap: 8 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--yellow)' }}>YOUR SYMPTOMS MATCH</div>
        <h1 style={{ fontSize: 29, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.028em' }}>
          {content.name}{' '}
          <span className="accent" style={{ color: '#FF9DBB', whiteSpace: 'nowrap' }}>
            {content.accent}
          </span>
        </h1>
      </div>
      {!match ? null : match.type === 'routine' ? (
        <span className="tag-yellow" style={{ alignSelf: 'flex-start' }}>
          No strong hormonal pattern
        </span>
      ) : (
        <div className="match">
          <div className="row between" style={{ gap: 12 }}>
            <span className="dim" style={{ fontSize: 13, fontWeight: 500 }}>
              <b style={{ color: '#fff', fontWeight: 700 }}>
                {match.matched} of {match.total}
              </b>{' '}
              markers matched
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)' }}>{STRENGTH_LABEL[match.strength]}</span>
          </div>
          <div className="meter">
            <i style={{ width: `${Math.round((match.matched / Math.max(1, match.total)) * 100)}%` }} />
          </div>
        </div>
      )}
      <p style={{ fontSize: 14, lineHeight: 1.55, color: '#E6D9E8' }}>{content.summary}</p>
    </section>
  );
}

export function MeansSection({ content }: { content: TypeContent }) {
  return (
    <section data-sec="means" className="sec">
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
  );
}

export function ReportDisclaimer() {
  return (
    <p className="small" data-sec="disclaimer">
      This report is a symptom assessment based on your answers, not a medical diagnosis. To confirm, ask your doctor about these tests: {SUGGESTED_TESTS.join(', ')}.
    </p>
  );
}

/** The full report body: type, the four systems, what it means, the first weeks and BMI. */
export function ReportSections({ a, journey }: { a: Assessment; journey?: JourneyStop[] }) {
  const { content, result, energy, metrics } = a;
  const bmiPin = Math.max(2, Math.min(98, ((a.bmi - 15) / 20) * 100));
  return (
    <>
      <TypeCard content={content} match={result} />

      <section data-sec="systems" className="outline stack" style={{ padding: '16px 18px 6px', gap: 4 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', paddingBottom: 6 }}>What we found across 4 systems</h2>
        {AREAS.map((area) => (
          <div key={area} className="sys-row">
            <span style={{ flex: 1 }}>{AREA_LABEL[area]}</span>
            <Bars filled={Math.min(5, a.counts[area])} tone={a.levels[area]} label={`${a.counts[area]} signs`} />
            <span className={`lvl ${a.levels[area]}`}>{LEVEL_LABEL[a.levels[area]]}</span>
          </div>
        ))}
      </section>

      <MeansSection content={content} />

      <JourneyCard stops={journey ?? a.journey} />

      <section data-sec="bmi" className="outline stack" style={{ padding: '16px 18px 4px', gap: 12, marginTop: 10 }}>
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
          <details className="numbers" data-ev="twelve_week_numbers">
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
    </>
  );
}
