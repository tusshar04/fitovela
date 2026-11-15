// The weight target on the result page: a 4-week target with week-by-week
// milestones. Every number comes from energy.ts; nothing here is a promise
// beyond what her meals and the movement plan add up to.

import { weightAtWeek, type EnergyPlan } from '@/domain/energy';
import type { Metrics } from '@/domain/types';

const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const fullDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function movementSentence(energy: EnergyPlan): string {
  const mv = energy.movement;
  const strength = `${mv.strengthMinutes}-minute strength sessions ${mv.strengthDays} days a week`;
  return mv.walkDays > 0 ? `a ${mv.walkMinutes}-minute brisk walk ${mv.walkDays} days a week and ${strength}` : `${strength}, on top of the activity you already do`;
}

export function TargetCard({ metrics, energy }: { metrics: Metrics; energy: EnergyPlan }) {
  if (energy.paceKgPerWeek <= 0 || energy.fourWeekLossKg <= 0) return null;

  const start = metrics.weightKg;
  const span = Math.max(1, energy.fourWeekLossKg * 1.2);
  const x = (week: number) => 22 + week * 68.5;
  const y = (kg: number) => 46 + ((start - kg) / span) * 100;
  const weeks = [0, 1, 2, 3, 4];
  const target = weeks.map((w) => weightAtWeek(metrics, energy.paceKgPerWeek, w));
  const mealsOnly = weeks.map((w) => weightAtWeek(metrics, energy.mealsOnlyPaceKgPerWeek, w));
  const path = (pts: number[]) => pts.map((kg, w) => `${w === 0 ? 'M' : 'L'}${x(w)} ${y(kg).toFixed(1)}`).join(' ');
  const endY = y(target[4]);
  const milestones = [4, 8, 12].map((w) => ({ week: w, kg: weightAtWeek(metrics, energy.paceKgPerWeek, w) }));

  return (
    <section className="outline stack" style={{ gap: 4 }}>
      <div className="eyebrow" style={{ textAlign: 'left' }}>
        Your first 4 weeks
      </div>
      <div style={{ fontSize: 28, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.02em' }}>
        <span style={{ color: 'var(--pink)' }}>Down {energy.fourWeekLossKg} kg</span> by {longDate(energy.fourWeekDate)}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>
        {start} kg to {energy.fourWeekKg} kg, with your meals and your movement plan
      </div>

      <svg viewBox="0 0 318 196" role="img" aria-label={`Target weight falling from ${start} kg today to ${energy.fourWeekKg} kg in four weeks`} style={{ display: 'block', width: '100%', height: 'auto', marginTop: 10 }}>
        <defs>
          <linearGradient id="fvLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F0483E" />
            <stop offset="0.5" stopColor="#FFB020" />
            <stop offset="1" stopColor="#0A9D6B" />
          </linearGradient>
        </defs>
        <path d="M0 46H318M0 96H318M0 146H318" stroke="#E6E3EA" strokeWidth="1" strokeDasharray="4 5" />
        <path d={path(mealsOnly)} fill="none" stroke="#9A8794" strokeWidth="2.5" strokeDasharray="5 6" strokeLinecap="round" />
        <path d={path(target)} fill="none" stroke="url(#fvLine)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {weeks.slice(1, 4).map((w) => (
          <circle key={w} cx={x(w)} cy={y(target[w])} r="4.5" fill="#FFFFFF" stroke="#C2185B" strokeWidth="2.5" />
        ))}
        <circle cx={x(0)} cy={y(start)} r="7" fill="#FFFFFF" stroke="#F0483E" strokeWidth="4" />
        <circle cx={x(4)} cy={endY} r="8" fill="#0A9D6B" stroke="#FFFFFF" strokeWidth="3" />
        <text x="8" y="26" fontSize="14" fontWeight="800" fill="#2B1330">
          {start} kg
        </text>
        <rect x="238" y={endY - 42} width="74" height="28" rx="14" fill="#0A7D55" />
        <text x="275" y={endY - 23} textAnchor="middle" fontSize="14" fontWeight="800" fill="#FFFFFF">
          {energy.fourWeekKg} kg
        </text>
        {weeks.map((w) => (
          <text key={w} x={x(w)} y="190" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#6B5868">
            {w === 0 ? 'Today' : `Week ${w}`}
          </text>
        ))}
      </svg>

      <div className="row" style={{ gap: 14, fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginTop: 2 }}>
        <span className="row" style={{ gap: 6 }}>
          <span style={{ width: 18, height: 4, borderRadius: 2, background: 'var(--pink)' }} />
          Meals + movement
        </span>
        <span className="row" style={{ gap: 6 }}>
          <span style={{ width: 18, height: 0, borderTop: '2.5px dashed var(--border)' }} />
          Meals only
        </span>
      </div>

      <div className="grid3" style={{ marginTop: 12, gap: 8 }}>
        {milestones.map((ms) => (
          <div key={ms.week} className="soft stack" style={{ padding: '10px 8px', borderRadius: 14, alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>Week {ms.week}</span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{ms.kg} kg</span>
          </div>
        ))}
      </div>

      {energy.goalDate ? (
        <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 10 }}>
          Your goal of {metrics.goalKg} kg: around {fullDate(energy.goalDate)} if you keep it up.
        </div>
      ) : null}
      <p className="small" style={{ marginTop: 6 }}>
        This is a target, not a promise. It assumes you follow your meals ({energy.targetKcal} kcal a day) and your movement plan: {movementSentence(energy)}. Individual results vary.
      </p>
    </section>
  );
}
