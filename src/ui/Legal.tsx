// Shared frame for the policy pages.

import { LEGAL_UPDATED } from '@/domain/company';
import { Logo } from './bits';

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo href="/" />
      </header>
      <article className="pad legal">
        <h1 className="h2" style={{ fontSize: 26 }}>
          {title}
        </h1>
        <p className="small">Last updated {LEGAL_UPDATED}</p>
        {children}
        <nav className="legal-nav">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/refund">Refunds</a>
          <a href="/contact">Contact</a>
        </nav>
      </article>
    </main>
  );
}

export function LegalLinks() {
  return (
    <nav className="legal-nav" style={{ justifyContent: 'center', borderTop: 0, paddingTop: 0, marginTop: 0 }}>
      <a href="/terms">Terms</a>
      <a href="/privacy">Privacy</a>
      <a href="/refund">Refunds</a>
      <a href="/contact">Contact</a>
    </nav>
  );
}
