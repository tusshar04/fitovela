// The week-by-week timeline. Used on the result page and, in compact form, on the paywall.

import { JOURNEY_FOOTNOTE, type JourneyStop } from '@/domain/journey';

export function JourneyTimeline({ stops, compact = false }: { stops: JourneyStop[]; compact?: boolean }) {
  return (
    <div className="journey">
      {stops.map((s, i) => (
        <div key={s.week} className={`stop${i === stops.length - 1 ? ' last' : ''}`}>
          <div className="row between" style={{ gap: 10 }}>
            <span className="wk">Week {s.week}</span>
            {s.kg !== undefined ? <span className="kg">{s.kg} kg</span> : null}
          </div>
          <div className="ttl">{s.title}</div>
          {(compact ? s.lines.slice(0, 1) : s.lines).map((line) => (
            <div key={line} className="ln">
              {line}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function JourneyCard({ stops }: { stops: JourneyStop[] }) {
  return (
    <section className="stack" style={{ paddingTop: 10, gap: 14 }}>
      <h2 className="h2">
        Your next <span className="accent">12 weeks</span>
      </h2>
      <JourneyTimeline stops={stops} />
      <p className="small">{JOURNEY_FOOTNOTE}</p>
    </section>
  );
}
