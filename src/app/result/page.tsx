import { redirect } from 'next/navigation';
import { buildAssessment } from '@/domain/assessment';
import { EXCLUSION_LABEL } from '@/domain/eligibility';
import { isComplete } from '@/domain/flow';
import { currentSession, logEvent } from '@/server/session';
import { Logo } from '@/ui/bits';
import { ReportDisclaimer, ReportHeading, ReportSections } from '@/ui/Report';

export const dynamic = 'force-dynamic';

// Founder, 2026-11-18 (D-030): the report is no longer free. A woman who can buy goes straight
// to the paywall, and her report opens with her plan. Only a woman we cannot sell a plan to
// (pregnant or breastfeeding, under 18) still gets it here, free.
export default async function ResultPage() {
  const session = await currentSession();
  if (!session) redirect('/');
  if (!isComplete(session.answers)) redirect('/quiz');
  const a = buildAssessment(session.answers);
  if (!a) redirect('/quiz');
  if (a.eligibility.eligible) redirect('/unlock');
  await logEvent('result_view', session.id, { type: a.result.type });

  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo />
      </header>
      <div className="pad grow" style={{ paddingTop: 2, gap: 18 }}>
        <ReportHeading age={a.metrics.age} answered={Object.keys(session.answers).length} />
        <ReportSections a={a} />

        <section data-sec="talk_first" className="advice stack" style={{ gap: 8, padding: 18, borderRadius: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Please talk to us before starting a plan</h2>
          <p>
            You told us {a.eligibility.reasons.map((r) => EXCLUSION_LABEL[r]).join(', and ')}. A self-serve diet plan is not the right fit without a professional looking at your case first.
          </p>
          <a className="btn" href="/unlock" data-ev="see_next" style={{ marginTop: 6 }}>
            See what happens next
          </a>
        </section>

        <ReportDisclaimer />
      </div>
    </main>
  );
}
