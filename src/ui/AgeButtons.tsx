'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AgeBand, Category, Hook } from '@/domain/types';
import { ChevronDown, ChevronRight } from './bits';

const BANDS: { id: AgeBand; label: string }[] = [
  { id: '18-29', label: '18–29' },
  { id: '30-39', label: '30–39' },
  { id: '40-49', label: '40–49' },
  { id: '50+', label: '50+' },
];

export function AgeButtons({ hook, category, ad }: { hook: Hook; category: Category; ad: Record<string, string> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<AgeBand | null>(null);
  const [error, setError] = useState('');

  async function start(ageBand: AgeBand) {
    setBusy(ageBand);
    setError('');
    try {
      const res = await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ageBand, hook, category, ad }) });
      if (!res.ok) throw new Error();
      router.push('/quiz');
    } catch {
      setError('Could not start. Check your connection and tap again.');
      setBusy(null);
    }
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ justifyContent: 'center', gap: 6, fontSize: 15, fontWeight: 800 }}>
        <span>Tap your age to begin</span>
        <ChevronDown className="nudge" style={{ color: '#C2185B' }} />
      </div>
      <div className="grid2">
        {BANDS.map((b) => (
          <button key={b.id} type="button" className="age" disabled={busy !== null} onClick={() => start(b.id)}>
            <span>{b.label}</span>
            <ChevronRight />
          </button>
        ))}
      </div>
      {error ? <p className="error center">{error}</p> : null}
    </div>
  );
}
