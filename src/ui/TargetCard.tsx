// The weight target on the result page: a 12-week target with milestones and no
// dates. Every number comes from energy.ts and is what her calories and her
// movement plan add up to.

import { TARGET_WEEKS, weightAtWeek, type EnergyPlan } from '@/domain/energy';
import type { Metrics } from '@/domain/types';

export function movementSentence(energy: EnergyPlan): string {
  const mv = energy.movement;
  const strength = `${mv.strengthMinutes}-minute strength sessions ${mv.strengthDays} days a week`;
  if (mv.walkDays === 0) return `${strength}, on top of the activity you already do`;
  const days = mv.walkDays === 7 ? 'every day' : `${mv.walkDays} days a week`;
  return `a ${mv.walkMinutes}-minute brisk walk ${days} and ${strength}`;
}

export function TargetCard({ metrics, energy }: { metrics: Metrics; energy: EnergyPlan }) {
  if (energy.paceKgPerWeek <= 0 || energy.week12LossKg <= 0) return null;

  const start = metrics.weightKg;
  const goal = energy.goalKg;
  const span = Math.max(1, energy.week12LossKg * 1.2);
  const x = (week: number) => 22 + (week / TARGET_WEEKS) * 274;
  const y = (kg: number) => 46 + ((start - kg) / span) * 100;
  const weeks = Array.from({ length: TARGET_WEEKS + 1 }, (_, i) => i);
  const target = weeks.map((w) => weightAtWeek(start, goal, energy.paceKgPerWeek, w));
  const mealsOnly = weeks.map((w) => weightAtWeek(start, goal, energy.mealsOnlyPaceKgPerWeek, w));
  const path = (pts: number[]) => pts.map((kg, w) => `${w === 0 ? 'M' : 'L'}${x(w).toFixed(1)} ${y(kg).toFixed(1)}`).join(' ');
  const endY = y(target[TARGET_WEEKS]);
  const milestones = [4, 8, 12];

  return (
    <section className="outline stack" style={{ gap: 4 }}>
      <div className="eyebrow" style={{ textAlign: 'left' }}>
        {energy.reachesGoal ? 'Your 12-week transformation' : 'Stage 1 of your transformation'}
      </div>
      <div style={{ fontSize: 30, lineHeight: 1.12, fontWeight: 800, letterSpacing: '-0.02em' }}>
        {start} kg to <span style={{ color: 'var(--pink)' }}>{energy.week12Kg} kg</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>
        Down {energy.week12LossKg} kg in 12 weeks{energy.reachesGoal ? '. Your goal, reached.' : `, then stage 2 takes you to ${goal} kg.`}
      </div>

      <svg viewBox="0 0 318 196" role="img" aria-label={`Target weight falling from ${start} kg to ${energy.week12Kg} kg over twelve weeks`} style={{ display: 'block', width: '100%', height: 'auto', marginTop: 10 }}>
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
        {[4, 8].map((w) => (
          <circle key={w} cx={x(w)} cy={y(target[w])} r="4.5" fill="#FFFFFF" stroke="#C2185B" strokeWidth="2.5" />
        ))}
        <circle cx={x(0)} cy={y(start)} r="7" fill="#FFFFFF" stroke="#F0483E" strokeWidth="4" />
        <circle cx={x(TARGET_WEEKS)} cy={endY} r="8" fill="#0A9D6B" stroke="#FFFFFF" strokeWidth="3" />
        <text x="8" y="26" fontSize="14" fontWeight="800" fill="#2B1330">
          {start} kg
        </text>
        <rect x="238" y={endY - 42} width="74" height="28" rx="14" fill="#0A7D55" />
        <text x="275" y={endY - 23} textAnchor="middle" fontSize="14" fontWeight="800" fill="#FFFFFF">
          {energy.week12Kg} kg
        </text>
        {[0, 4, 8, 12].map((w) => (
          <text key={w} x={x(w)} y="190" textAnchor={w === 0 ? 'start' : w === 12 ? 'end' : 'middle'} dx={w === 0 ? -14 : w === 12 ? 14 : 0} fontSize="11.5" fontWeight="600" fill="#6B5868">
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
        {milestones.map((w) => (
          <div key={w} className="soft stack" style={{ padding: '10px 8px', borderRadius: 14, alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>Week {w}</span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{target[w]} kg</span>
          </div>
        ))}
      </div>

      {energy.goalAdjusted ? (
        <div className="advice" style={{ marginTop: 10 }}>
          The goal you entered is below the healthy range for your height, so your plan works towards {goal} kg.
        </div>
      ) : null}
      <p className="small" style={{ marginTop: 8 }}>
        This is a target, not a promise. It assumes you follow your meals ({energy.targetKcal.toLocaleString('en-IN')} kcal a day) and your movement plan: {movementSentence(energy)}. Individual results vary.
      </p>
    </section>
  );
}
