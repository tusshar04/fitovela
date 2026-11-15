import { redirect } from 'next/navigation';
import { buildAssessment } from '@/domain/assessment';
import { SUPPORT_EMAIL } from '@/domain/company';
import { EXCLUSION_LABEL } from '@/domain/eligibility';
import { isComplete } from '@/domain/flow';
import { offerEndsAt, TIER_ORDER, TIERS } from '@/domain/offer';
import { activeProvider } from '@/server/payments';
import { currentSession, logEvent, saveSession } from '@/server/session';
import { Logo } from '@/ui/bits';
import { UnlockClient } from '@/ui/UnlockClient';

export const dynamic = 'force-dynamic';

const PAY_NOTICES = ['failed', 'pending', 'error'] as const;

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ pay?: string }> }) {
  const pay = (await searchParams).pay;
  const payNotice = PAY_NOTICES.find((n) => n === pay) ?? null;
  const session = await currentSession();
  if (!session) redirect('/');
  if (!isComplete(session.answers)) redirect('/quiz');
  const a = buildAssessment(session.answers);
  if (!a) redirect('/quiz');

  if (!a.eligibility.eligible) {
    await logEvent('unlock_blocked', session.id);
    return (
      <main className="screen">
        <header className="hdr solo">
          <Logo />
        </header>
        <div className="pad grow" style={{ paddingTop: 12, gap: 16 }}>
          <h1 className="h1 big">
            Let us talk <span className="accent">first.</span>
          </h1>
          <p className="sub" style={{ fontSize: 15 }}>
            You told us {a.eligibility.reasons.map((r) => EXCLUSION_LABEL[r]).join(', and ')}. For you, a diet plan should be set by a professional who knows your case, so we do not sell you a ready-made one.
          </p>
          <div className="soft stack" style={{ gap: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>What you can do now</h2>
            <p style={{ fontSize: 14.5 }}>Your free report stays yours. Show it to your own doctor or a registered dietitian.</p>
            <p style={{ fontSize: 14.5 }}>Write to us at {SUPPORT_EMAIL} and we will guide you to the right kind of help.</p>
          </div>
          <a className="btn push" href="/result">
            Back to my report
          </a>
        </div>
      </main>
    );
  }

  // Founder, 2026-11-15: the 15 minutes start again every time she opens this page,
  // so a woman who comes back later is offered the launch price again.
  session.offerStartedAt = new Date().toISOString();
  await saveSession(session);
  await logEvent('unlock_view', session.id);

  return (
    <UnlockClient
      offerEndsAt={offerEndsAt(session.offerStartedAt).toISOString()}
      tiers={TIER_ORDER.map((id) => TIERS[id])}
      typeName={`${a.content.name} ${a.content.accent}`}
      recap={a.recap}
      answerCount={Object.keys(session.answers).length}
      targetKcal={a.energy.targetKcal}
      journey={a.journey}
      planChanges={a.content.planChanges}
      intensive={a.intensive.blocks.length === 0 ? { targetKcal: a.intensive.energy.targetKcal, journey: a.intensive.journey } : null}
      medicationAdvisory={a.eligibility.medicationAdvisory}
      email={session.lead?.email ?? ''}
      phone={session.lead?.phone ?? ''}
      provider={activeProvider()}
      payNotice={payNotice}
    />
  );
}
