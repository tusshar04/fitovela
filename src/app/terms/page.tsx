import { Logo } from '@/ui/bits';

export default function TermsPage() {
  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo href="/" />
      </header>
      <div className="pad stack" style={{ paddingTop: 16, gap: 12 }}>
        <h1 className="h2">Terms</h1>
        <p className="advice">Placeholder. The full terms, including the refund policy, must be written and reviewed before launch.</p>
        <p style={{ fontSize: 14.5 }}>Fitovela offers nutrition guidance. It does not diagnose or treat any medical condition. Speak to your doctor before changing your diet if you take medication, are pregnant or are breastfeeding.</p>
      </div>
    </main>
  );
}
