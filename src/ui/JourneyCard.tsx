// The week-by-week timeline, on the result page and the paywall. The first four
// weeks are shown outright; weeks 8 and 12 open from a small "show more" line.
// It talks about how she feels and looks to herself. No weights.

import { FIRST_MONTH_WEEKS, JOURNEY_FOOTNOTE, type JourneyStop } from '@/domain/journey';
import { Plus } from './bits';

function Stops({ stops, later = false }: { stops: JourneyStop[]; later?: boolean }) {
  return (
    <div className={`journey${later ? ' later' : ''}`}>
      {stops.map((s, i) => (
        <div key={s.week} className={`stop${i === stops.length - 1 ? ' last' : ''}`}>
          <span className="wk">Week {s.week}</span>
          <span className="rail" aria-hidden>
            <i />
          </span>
          <div className="body">
            <div className="ttl">{s.title}</div>
            {s.lines.map((line) => (
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

export function JourneyTimeline({ stops }: { stops: JourneyStop[] }) {
  const first = stops.filter((s) => s.week <= FIRST_MONTH_WEEKS);
  const later = stops.filter((s) => s.week > FIRST_MONTH_WEEKS);
  return (
    <div>
      <Stops stops={first} />
      {later.length > 0 ? (
        <details className="more-weeks" data-ev="more_weeks">
          <summary>
            <span>Show weeks {later.map((s) => s.week).join(' and ')}</span>
            <Plus />
          </summary>
          <Stops stops={later} later />
        </details>
      ) : null}
    </div>
  );
}

export function JourneyCard({ stops }: { stops: JourneyStop[] }) {
  return (
    <section data-sec="first_weeks" className="sec">
      <h2 className="h2">
        Your first <span className="accent">{FIRST_MONTH_WEEKS} weeks</span>
      </h2>
      <JourneyTimeline stops={stops} />
      <p className="small">{JOURNEY_FOOTNOTE}</p>
    </section>
  );
}
