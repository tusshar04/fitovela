import { notFound } from 'next/navigation';
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
  return (
    <PlanClient
      plan={order.plan}
      token={token}
      tierName={TIERS[order.tier].name}
      typeName={`${type.name} ${type.accent}`}
      justBought={query.new === '1'}
      email={maskEmail(order.email)}
      emailSent={emailConfigured()}
    />
  );
}
