'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './bits';

export function LoginClient() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: Record<string, string>) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; devCode?: string };
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return null;
      }
      return data;
    } catch {
      setError('Could not reach us. Check your connection and try again.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    const data = await post('/api/auth/otp', { phone });
    if (data) {
      setDevCode(data.devCode ?? null);
      setStage('code');
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const data = await post('/api/auth/verify', { phone, code });
    if (data) router.push('/my-plans');
  }

  return (
    <main className="screen">
      <header className="hdr solo">
        <Logo href="/" />
      </header>
      {stage === 'phone' ? (
        <form className="pad grow" style={{ paddingTop: 24, gap: 16 }} onSubmit={requestCode} noValidate>
          <h1 className="h1 big">
            Welcome <span className="accent">back.</span>
          </h1>
          <p className="sub">Enter the mobile number you gave us. We will send a one-time code.</p>
          <div className="field">
            <label htmlFor="login-phone">Mobile number</label>
            <div className="row" style={{ gap: 8 }}>
              <div className="prefix">+91</div>
              <input id="login-phone" className="input" type="tel" autoComplete="tel-national" inputMode="numeric" placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" className="btn" disabled={busy}>
            Send my code
          </button>
        </form>
      ) : (
        <form className="pad grow" style={{ paddingTop: 24, gap: 16 }} onSubmit={verify} noValidate>
          <h1 className="h1 big">
            Enter your <span className="accent">code.</span>
          </h1>
          <p className="sub">We sent a 6-digit code to +91 {phone}. It works for 5 minutes.</p>
          {devCode ? <div className="demo-note">Development only: SMS is not connected yet. Your code is {devCode}.</div> : null}
          <div className="field">
            <label htmlFor="login-code">6-digit code</label>
            <input id="login-code" className="input" inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} style={{ letterSpacing: '0.3em', fontSize: 22 }} />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" className="btn" disabled={busy}>
            Log in
          </button>
          <button type="button" className="link-btn" disabled={busy} onClick={() => { setStage('phone'); setCode(''); setError(''); }}>
            Use a different number
          </button>
        </form>
      )}
    </main>
  );
}
