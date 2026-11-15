import { notFound } from 'next/navigation';
import { buildAssessment } from '@/domain/assessment';
import { EXCLUSION_LABEL } from '@/domain/eligibility';
import { CHECKIN_SIGNS } from '@/domain/intensive';
import { TIERS } from '@/domain/offer';
import { optionLabel } from '@/domain/questions';
import { AREAS, AREA_LABEL, LEVEL_LABEL, asList } from '@/domain/types';
import { reviewAccess } from '@/server/reviewAuth';
import { getStore, type Order } from '@/server/store';
import { Logo } from '@/ui/bits';
import { ReviewActions, ReviewLogin } from '@/ui/ReviewClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fitovela · Clinician review', robots: { index: false, follow: false } };

const STATUS_LABEL = { pending: 'Waiting for review', paused: 'Paused by a check-in', approved: 'Approved', declined: 'Moved to standard' } as const;
const STATUS_ORDER = { paused: 0, pending: 1, approved: 2, declined: 3 } as const;
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const signLabel = (id: string) => CHECKIN_SIGNS.find((s) => s.id === id)?.label ?? id;

async function OrderCard({ order }: { order: Order }) {
  const store = await getStore();
  const session = await store.getSession(order.sessionId);
  const a = session ? buildAssessment(session.answers) : null;
  const review = order.review!;
  const answers = session?.answers ?? {};
  const labels = (q: string) => asList(answers[q]).filter((v) => v !== 'none').map((v) => optionLabel(q, v));
  const meds = labels('meds');
  const safety = labels('safety');

  return (
    <section className="outline stack" style={{ gap: 12 }}>
      <div className="row between" style={{ gap: 10 }}>
        <span className={review.status === 'paused' ? 'lvl high' : review.status === 'pending' ? 'lvl moderate' : 'lvl low'} style={{ width: 'auto', padding: '4px 12px' }}>
          {STATUS_LABEL[review.status]}
        </span>
        <span className="small">
          {TIERS[order.tier].name} · bought {when(order.paidAt ?? order.createdAt)}
        </span>
      </div>

      {a ? (
        <>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.012em' }}>
            {a.metrics.age} years · {a.metrics.heightCm} cm · {a.metrics.weightKg} kg · BMI {a.bmi}
          </div>
          <div className="stack" style={{ gap: 6, fontSize: 14 }}>
            <div>
              <b>Goal:</b> {a.energy.goalKg} kg ({a.energy.toLoseKg} kg to lose){a.energy.goalAdjusted ? ', raised to the healthy minimum' : ''}
            </div>
            <div>
              <b>Assessment:</b> {a.content.name} {a.content.accent} · {AREAS.map((area) => `${AREA_LABEL[area]} ${LEVEL_LABEL[a.levels[area]]}`).join(', ')}
            </div>
            <div>
              <b>Activity now:</b> {typeof answers.activity === 'string' ? optionLabel('activity', answers.activity) : 'not given'}
            </div>
            <div>
              <b>Medicines:</b> {meds.length ? meds.join(', ') : 'none reported'}
              {answers.thyroid_dx === 'yes_tablets' ? ' · on thyroid tablets' : ''}
            </div>
            <div>
              <b>Conditions reported:</b> {safety.length ? safety.join(', ') : 'none of the listed ones'}
              {a.eligibility.reasons.length ? ` · EXCLUDED: ${a.eligibility.reasons.map((r) => EXCLUSION_LABEL[r]).join(', ')}` : ''}
            </div>
            <div>
              <b>Food:</b> {a.diet}, avoids {a.avoid.length ? a.avoid.join(', ') : 'nothing'}
            </div>
          </div>
          <div className="soft stack" style={{ gap: 4, fontSize: 14 }}>
            <div>
              <b>Intensive plan:</b> {a.intensive.energy.targetKcal} kcal a day, about {a.intensive.energy.paceKgPerWeek} kg a week with the movement plan
            </div>
            <div>
              <b>Standard plan:</b> {a.energy.targetKcal.toLocaleString('en-IN')} kcal a day, about {a.energy.paceKgPerWeek} kg a week
            </div>
            <div className="small">
              Resting need (BMR) {a.energy.bmr} kcal · movement plan: {a.energy.movement.walkMinutes} min walk {a.energy.movement.walkDays} days, strength {a.energy.movement.strengthDays} days
            </div>
          </div>
        </>
      ) : (
        <p className="error">Her answers could not be loaded.</p>
      )}

      {order.checkins?.length ? (
        <div className="stack" style={{ gap: 6 }}>
          <b style={{ fontSize: 14 }}>Weekly check-ins</b>
          {order.checkins.map((c) => (
            <div key={c.at} style={{ fontSize: 13.5, color: c.flagged && !c.cleared ? '#b42318' : 'var(--ink)' }}>
              Week {c.week} · {c.weightKg} kg · {c.signs.map(signLabel).join(', ')}
              {c.flagged ? (c.cleared ? ' · stop sign, cleared' : ' · STOP SIGN') : ''}
            </div>
          ))}
        </div>
      ) : null}

      {review.note ? (
        <div className="small">
          Your note to her: {review.note}
        </div>
      ) : null}

      {review.status === 'pending' || review.status === 'paused' ? <ReviewActions orderId={order.id} status={review.status} /> : null}
    </section>
  );
}

export default async function ReviewPage() {
  const access = await reviewAccess();
  if (access === 'off') notFound();

  if (access === 'login') {
    return (
      <main className="screen">
        <header className="hdr solo">
          <Logo />
        </header>
        <div className="pad grow" style={{ paddingTop: 20, gap: 14 }}>
          <h1 className="h1 big">
            Clinician <span className="accent">review</span>
          </h1>
          <ReviewLogin />
        </div>
      </main>
    );
  }

  const store = await getStore();
  const orders = (await store.listIntensiveOrders()).filter((o) => o.review).sort((x, y) => STATUS_ORDER[x.review!.status] - STATUS_ORDER[y.review!.status]);
  const waiting = orders.filter((o) => o.review!.status === 'pending' || o.review!.status === 'paused');
  const done = orders.filter((o) => o.review!.status === 'approved' || o.review!.status === 'declined').slice(0, 20);

  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo />
      </header>
      <div className="pad grow" style={{ paddingTop: 12, gap: 16 }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="h1 big" style={{ textAlign: 'left' }}>
            Intensive plans <span className="accent">to review</span>
          </h1>
          <p className="small">
            These women chose the 800 to 1,000 kcal plan. Nothing opens until you approve it. If you are not sure, move her to the standard plan.
            {access === 'open' ? ' (Development: this page is open because REVIEW_KEY is not set.)' : ''}
          </p>
        </div>
        {waiting.length === 0 ? <div className="soft" style={{ fontSize: 14.5, fontWeight: 600 }}>Nothing is waiting for you.</div> : waiting.map((o) => <OrderCard key={o.id} order={o} />)}
        {done.length ? (
          <>
            <h2 className="h2" style={{ paddingTop: 8 }}>
              Already decided
            </h2>
            {done.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </>
        ) : null}
      </div>
    </main>
  );
}
