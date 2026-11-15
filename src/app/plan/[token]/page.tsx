import { notFound } from 'next/navigation';
import { weeksOpen } from '@/domain/intensive';
import { TIERS } from '@/domain/offer';
import { TYPE_CONTENT } from '@/domain/typeContent';
import { emailConfigured } from '@/server/email';
import { logEvent } from '@/server/session';
import { getStore } from '@/server/store';
import { Logo, Tick } from '@/ui/bits';
import { PlanClient } from '@/ui/PlanClient';

export const dynamic = 'force-dynamic';

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export default async function PlanPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const query = await searchParams;
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) notFound();

  const store = await getStore();
  const order = await store.getOrderByPlanToken(token);
  if (!order || order.status !== 'paid' || !order.plan) notFound();
  await logEvent('plan_view', order.sessionId);

  const type = TYPE_CONTENT[order.plan.typeId];
  const typeName = `${type.name} ${type.accent}`;
  const review = order.track === 'intensive' ? order.review : undefined;

  // An intensive plan stays closed until the clinician has reviewed her answers.
  if (review?.status === 'pending') {
    return (
      <main className="screen">
        <header className="hdr solo">
          <Logo href="/my-plans" />
        </header>
        <div className="pad grow" style={{ paddingTop: 18, gap: 16 }}>
          <span className="signal">
            <i />
            <span>Intensive plan · {typeName}</span>
          </span>
          <h1 className="h1 big">
            Your plan is with <span className="accent">our clinician</span>
          </h1>
          <p className="sub" style={{ fontSize: 15 }}>
            An intensive plan is never released automatically. A clinician is reading your answers now. This usually takes less than 24 hours.
          </p>
          <div className="outline stack" style={{ gap: 12 }}>
            {['Payment received', 'Your plan is built', 'Clinician review', 'Plan opens, and we email you'].map((step, i) => (
              <div key={step} className="line-item" style={{ color: i < 2 ? 'var(--ink)' : i === 2 ? 'var(--pink-dark)' : 'var(--faint)' }}>
                {i < 2 ? <Tick small /> : <span className="num" style={{ width: 18, height: 18, fontSize: 11, background: i === 2 ? 'var(--tint)' : 'var(--card)', color: 'inherit' }}>{i + 1}</span>}
                <span>{step}</span>
              </div>
            ))}
          </div>
          <p className="small">
            {emailConfigured() ? `We will email ${maskEmail(order.email)} when it opens.` : 'Email sending is not connected yet, so come back to this page to check.'} If the clinician decides the standard plan is safer for you, you get that plan instead and we tell you why.
          </p>
        </div>
      </main>
    );
  }

  // On the intensive track she sees only the weeks her check-ins have opened.
  const totalWeeks = Math.ceil(order.plan.days.length / 7);
  const intensiveOpen = review && review.status !== 'declined';
  const open = intensiveOpen ? weeksOpen(order.checkins ?? [], totalWeeks) : totalWeeks;
  const plan = open < totalWeeks ? { ...order.plan, days: order.plan.days.slice(0, open * 7), groceries: order.plan.groceries.slice(0, open) } : order.plan;

  return (
    <PlanClient
      plan={plan}
      totalWeeks={totalWeeks}
      token={token}
      tierName={TIERS[order.tier].name}
      typeName={typeName}
      justBought={query.new === '1'}
      email={maskEmail(order.email)}
      emailSent={emailConfigured()}
      intensive={intensiveOpen ? { paused: review.status === 'paused', lastKg: order.checkins?.at(-1)?.weightKg ?? order.startKg ?? null } : null}
      clinicianNote={review?.note ?? null}
      movedToStandard={review?.status === 'declined'}
    />
  );
}
