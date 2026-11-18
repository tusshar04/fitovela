import { notFound } from 'next/navigation';
import { buildAssessment } from '@/domain/assessment';
import { TYPE_CONTENT } from '@/domain/typeContent';
import { logEvent } from '@/server/session';
import { getStore } from '@/server/store';
import { ChevronRight, Logo } from '@/ui/bits';
import { MeansSection, ReportDisclaimer, ReportHeading, ReportSections, TypeCard } from '@/ui/Report';

export const dynamic = 'force-dynamic';

// The report she paid for (D-030). It is reached only through the private link of a paid plan.
export default async function PlanReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) notFound();

  const store = await getStore();
  const order = await store.getOrderByPlanToken(token);
  if (!order || order.status !== 'paid' || !order.plan) notFound();
  await logEvent('report_view', order.sessionId);

  // Built from the answers she gave. If they are gone (deleted at her request) or would now
  // name a different type than the plan she bought, show only what the plan itself records.
  const session = await store.getSession(order.sessionId);
  const built = session ? buildAssessment(session.answers) : null;
  const a = built && built.result.type === order.plan.typeId ? built : null;
  const content = TYPE_CONTENT[order.plan.typeId];

  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo href="/my-plans" />
      </header>
      <div className="pad grow" style={{ paddingTop: 2, gap: 18 }}>
        {a && session ? (
          <>
            <ReportHeading age={a.metrics.age} answered={Object.keys(session.answers).length} />
            <ReportSections a={a} journey={order.plan.journey} energy={order.plan.track === 'intensive' ? a.intensive.energy : a.energy} />
          </>
        ) : (
          <>
            <ReportHeading />
            <TypeCard content={content} />
            <MeansSection content={content} />
          </>
        )}
        <ReportDisclaimer />
        <a className="btn" href={`/plan/${token}`} data-ev="report_to_plan" style={{ marginBottom: 18 }}>
          Open my diet plan
          <ChevronRight size={18} stroke={2.6} />
        </a>
      </div>
    </main>
  );
}
