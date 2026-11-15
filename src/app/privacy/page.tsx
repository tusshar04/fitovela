import { Logo } from '@/ui/bits';

export default function PrivacyPage() {
  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo href="/" />
      </header>
      <div className="pad stack" style={{ paddingTop: 16, gap: 12 }}>
        <h1 className="h2">Privacy</h1>
        <p className="advice">Placeholder. The full privacy policy must be written and reviewed before launch.</p>
        <p style={{ fontSize: 14.5 }}>What the product does today: your answers are stored to build your report and plan. Your email is used to send them. Your mobile number is used to log you in. We do not sell your data. Write to us to have it deleted.</p>
      </div>
    </main>
  );
}
