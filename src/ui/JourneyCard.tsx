// The week-by-week timeline. Used on the result page and, in compact form, on the paywall.
// It talks about how she feels; her target weight appears once, on the last stop.

import { JOURNEY_FOOTNOTE, type JourneyStop } from '@/domain/journey';

export function JourneyTimeline({ stops, compact = false }: { stops: JourneyStop[]; compact?: boolean }) {
  return (
    <div className="journey">
      {stops.map((s, i) => (
        <div key={s.week} className={`stop${i === stops.length - 1 ? ' last' : ''}`}>
          <span className="wk">Wk {s.week}</span>
          <span className="rail" aria-hidden>
            <i />
          </span>
          <div className="body">
            <div className="ttl">
              <span>{s.title}</span>
              {s.kg !== undefined ? <span className="kg">{s.kg} kg</span> : null}
            </div>
            {(compact ? s.lines.slice(0, 1) : s.lines).map((line) => (
              <div key={line} className="ln">
                {line}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function JourneyCard({ stops }: { stops: JourneyStop[] }) {
  return (
    <section className="sec">
      <h2 className="h2">
        Your next <span className="accent">12 weeks</span>
      </h2>
      <JourneyTimeline stops={stops} />
      <p className="small">{JOURNEY_FOOTNOTE}</p>
    </section>
  );
}
