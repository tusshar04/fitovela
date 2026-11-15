import { redirect } from 'next/navigation';
import { buildAssessment } from '@/domain/assessment';
import { EXCLUSION_LABEL } from '@/domain/eligibility';
import { isComplete } from '@/domain/flow';
import { offerEndsAt, TIER_ORDER, TIERS } from '@/domain/offer';
import { activeProvider } from '@/server/payments';
import { currentSession, logEvent, saveSession } from '@/server/session';
import { Logo } from '@/ui/bits';
import { movementSentence } from '@/ui/TargetCard';
import { UnlockClient } from '@/ui/UnlockClient';

export const dynamic = 'force-dynamic';

export default async function UnlockPage() {
  const session = await currentSession();
  if (!session) redirect('/');
  if (!isComplete(session.answers)) redirect('/quiz');
  const a = buildAssessment(session.answers);
  if (!a) redirect('/quiz');

  if (!a.eligibility.eligible) {
    await logEvent('unlock_blocked', session.id);
    const support = process.env.SUPPORT_EMAIL;
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
            <p style={{ fontSize: 14.5 }}>{support ? `Write to us at ${support} and we will guide you.` : 'Our care team contact will be listed here before launch.'}</p>
          </div>
          <a className="btn push" href="/result">
            Back to my report
          </a>
        </div>
      </main>
    );
  }

  // The launch price runs from the first time she sees this page.
  if (!session.offerStartedAt) {
    session.offerStartedAt = new Date().toISOString();
    await saveSession(session);
  }
  await logEvent('unlock_view', session.id);

  return (
    <UnlockClient
      offerEndsAt={offerEndsAt(session.offerStartedAt).toISOString()}
      tiers={TIER_ORDER.map((id) => TIERS[id])}
      typeName={`${a.content.name} ${a.content.accent}`}
      recap={a.recap}
      answerCount={Object.keys(session.answers).length}
      weightKg={a.metrics.weightKg}
      goalKg={a.metrics.goalKg}
      bmi={a.bmi}
      targetKcal={a.energy.targetKcal}
      fourWeekKg={a.energy.fourWeekKg}
      fourWeekLossKg={a.energy.fourWeekLossKg}
      fourWeekDate={a.energy.fourWeekDate}
      movementLine={movementSentence(a.energy)}
      toLoseKg={a.energy.toLoseKg}
      planChanges={a.content.planChanges}
      medicationAdvisory={a.eligibility.medicationAdvisory}
      email={session.lead?.email ?? ''}
      phone={session.lead?.phone ?? ''}
      provider={activeProvider()}
    />
  );
}
