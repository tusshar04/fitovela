import { redirect } from 'next/navigation';
import { TIERS } from '@/domain/offer';
import { TYPE_CONTENT } from '@/domain/typeContent';
import { loggedInPhone } from '@/server/auth';
import { getStore } from '@/server/store';
import { ChevronRight, Logo } from '@/ui/bits';

export const dynamic = 'force-dynamic';

export default async function MyPlansPage() {
  const phone = await loggedInPhone();
  if (!phone) redirect('/login');
  const store = await getStore();
  const orders = (await store.listPaidOrdersByPhone(phone)).filter((o) => o.planToken && o.plan);

  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo href="/" />
      </header>
      <div className="pad grow" style={{ paddingTop: 20, gap: 14 }}>
        <h1 className="h1 big">
          Your <span className="accent">plans</span>
        </h1>
        <p className="sub">Logged in as +91 {phone}</p>
        {orders.length === 0 ? (
          <div className="soft stack" style={{ gap: 10 }}>
            <p style={{ fontSize: 15, fontWeight: 600 }}>No plan is linked to this number yet.</p>
            <a className="btn" href="/">
              Take the free assessment
            </a>
          </div>
        ) : (
          orders.map((o) => {
            const type = TYPE_CONTENT[o.plan!.typeId];
            return (
              <a key={o.id} href={`/plan/${o.planToken}`} className="soft row between" style={{ gap: 12, textDecoration: 'none', color: 'var(--ink)' }}>
                <span className="stack" style={{ gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{TIERS[o.tier].name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                    {type.name} {type.accent} · bought {new Date(o.paidAt ?? o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </span>
                <ChevronRight style={{ color: 'var(--pink)' }} />
              </a>
            );
          })
        )}
      </div>
    </main>
  );
}
