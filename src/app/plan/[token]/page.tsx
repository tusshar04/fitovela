import { notFound } from 'next/navigation';
import { weeksOpen } from '@/domain/intensive';
import { TIERS } from '@/domain/offer';
import { TYPE_CONTENT } from '@/domain/typeContent';
import { emailConfigured } from '@/server/email';
import { logEvent } from '@/server/session';
import { getStore } from '@/server/store';
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

  // On the intensive plan she sees only the weeks her check-ins have opened.
  const totalWeeks = Math.ceil(order.plan.days.length / 7);
  const onIntensive = order.plan.track === 'intensive';
  const moved = Boolean(order.movedToStandard);
  const open = onIntensive ? weeksOpen(order.checkins ?? [], totalWeeks) : totalWeeks;
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
      intensive={onIntensive && !moved ? { lastKg: order.checkins?.at(-1)?.weightKg ?? order.startKg ?? null } : null}
      movedToStandard={moved}
    />
  );
}
