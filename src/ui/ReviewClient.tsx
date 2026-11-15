'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ReviewLogin() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/review/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError('That code is not right.');
    router.refresh();
  }

  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
      <div className="field">
        <label htmlFor="rv-code">Reviewer code</label>
        <input id="rv-code" className="input" type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" className="btn" disabled={busy || !code}>
        Open the review list
      </button>
    </form>
  );
}

export function ReviewActions({ orderId, status }: { orderId: string; status: 'pending' | 'paused' }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function decide(action: 'approve' | 'resume' | 'standard') {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId, action, note }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setError(data.error ?? 'That did not save. Please try again.');
      router.refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="field">
        <label htmlFor={`note-${orderId}`}>Note to her (optional): supplements, what to watch, why you changed the plan</label>
        <textarea id={`note-${orderId}`} className="input" style={{ height: 84, padding: '12px 16px', resize: 'vertical', fontWeight: 500, lineHeight: 1.45 }} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button type="button" className="btn" disabled={busy} onClick={() => decide(status === 'pending' ? 'approve' : 'resume')}>
        {status === 'pending' ? 'Approve the intensive plan' : 'Reopen the intensive plan'}
      </button>
      <button type="button" className="btn" style={{ background: 'var(--card)', color: 'var(--ink)', boxShadow: 'none' }} disabled={busy} onClick={() => decide('standard')}>
        Move her to the standard plan
      </button>
    </div>
  );
}
