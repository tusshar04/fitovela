import type { Category, Hook } from '@/domain/types';
import { headers } from 'next/headers';
import { uaInfo } from '@/server/events';
import { logEvent } from '@/server/session';
import { asCategory, asHook, sanitizeAd } from '@/server/validate';
import { AgeButtons } from '@/ui/AgeButtons';
import { Lock, Logo } from '@/ui/bits';
import { LegalLinks } from '@/ui/Legal';

// Three landing hooks to test against each other: ?h=a | b | c. The ad category (?c=) tunes the headline.
const CHECK_HEADLINE: Record<Category, string> = {
  pcos: 'Is it PCOS, thyroid or insulin?',
  thyroid: 'Is it only your thyroid?',
  menopause: 'Did your hormones change after 40?',
  diabetes: 'Is it sugar, insulin or both?',
  weightloss: 'Is it hormones or habits?',
};

const AREAS = ['PCOS / PCOD', 'Insulin', 'Inflammation', 'Thyroid'];

function Hero({ hook, category }: { hook: Hook; category: Category }) {
  const copy =
    hook === 'b'
      ? { title: CHECK_HEADLINE[category], accent: 'Check in 2 minutes.', sub: 'A free symptom check made for Indian women. No blood test, no sign-up. Find out what your body has been trying to tell you.' }
      : hook === 'c'
        ? { title: 'One diet does not fit every woman.', accent: 'Find yours.', sub: 'Take the free assessment. We match your symptoms to a type, then build your plan from dosa, dal and roti. No salads.' }
        : { title: 'Dieting hard. Weight still stuck?', accent: 'Find out why.', sub: 'Generic diets ignore your hormones. Answer about 18 questions. We check which of 4 hidden causes is holding you back.' };

  return (
    <div className="stack" data-sec="hero" style={{ alignItems: 'center', gap: 12 }}>
      <h1 className="center" style={{ textWrap: 'balance' }}>
        <span style={{ display: 'block', fontSize: 32, lineHeight: 1.08, fontWeight: 800, letterSpacing: '-0.032em' }}>{copy.title}</span>
        <span className="accent" style={{ display: 'block', marginTop: 6, fontSize: 42 }}>
          {copy.accent}
        </span>
      </h1>
      <p className="sub" style={{ fontSize: 15, maxWidth: 330 }}>
        {copy.sub}
      </p>
    </div>
  );
}

function Visual({ hook }: { hook: Hook }) {
  if (hook === 'b') {
    return (
      <>
        <section data-sec="visual" className="grid2" style={{ marginTop: 22 }}>
          {AREAS.map((a) => (
            <div key={a} className="check-tile">
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>{a}</div>
              <div className="row" style={{ gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--border)' }} />
                <span>Not checked yet</span>
              </div>
            </div>
          ))}
        </section>
        <div className="center" style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
          We score each one and match you to a type.
        </div>
      </>
    );
  }
  if (hook === 'c') {
    const plates = [
      { src: '/img/dosa.jpg', alt: 'Dosa with sambar and chutney', label: 'Insulin type' },
      { src: '/img/thali.jpg', alt: 'Thali with rotis, dal and sabzi', label: 'Thyroid type' },
      { src: '/img/palak.jpg', alt: 'Bowl of palak paneer', label: 'Inflammation type' },
    ];
    return (
      <>
        <section data-sec="visual" className="grid3" style={{ marginTop: 22 }}>
          {plates.map((p) => (
            <div key={p.label} className="stack" style={{ gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <img className="photo-sq" src={p.src} alt={p.alt} />
                <span className="lock-badge">
                  <Lock size={12} />
                </span>
              </div>
              <span className="center" style={{ fontSize: 12, lineHeight: 1.25, fontWeight: 700 }}>
                {p.label}
              </span>
            </div>
          ))}
        </section>
        <div className="center" style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
          Different type, different plate. Which one is yours?
        </div>
      </>
    );
  }
  return (
    <section data-sec="visual" className="plum stack" style={{ marginTop: 22, padding: 18, gap: 14 }}>
      <div className="row between" style={{ gap: 10 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--yellow)' }}>YOUR REPORT</span>
        <span className="row dim" style={{ gap: 5, fontSize: 11.5, fontWeight: 500 }}>
          <Lock size={12} />
          <span>Built from your answers</span>
        </span>
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
        <span className="dim" style={{ fontSize: 14, fontWeight: 500 }}>
          Your type:
        </span>
        <span aria-hidden className="blur" style={{ fontSize: 20, fontWeight: 700 }}>
          Hidden for now
        </span>
      </div>
      <div className="grid2" style={{ gap: 8 }}>
        {AREAS.map((a) => (
          <div key={a} className="qcell">
            <span>{a}</span>
            <span style={{ color: 'var(--yellow)' }}>?</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function Landing({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const hook = asHook(params.h);
  const category = asCategory(params.c);
  const ad = sanitizeAd(params);
  // Counted on the server, so it includes Meta's crawler and pages an app loads ahead of a tap.
  // `ua` tells those apart; the browser's own "page_view" is the count of pages a person saw.
  const h = await headers();
  const adId = /^[\w-]{1,40}$/.test(ad.utm_content ?? '') ? ad.utm_content : undefined;
  await logEvent('landing_view', undefined, { hook, category, ...uaInfo(h.get('user-agent')), ...(adId ? { ad: adId } : {}), ...(ad.fbclid ? { fb: true } : {}), ...(/prefetch|preview/i.test(`${h.get('sec-purpose') ?? ''} ${h.get('purpose') ?? ''} ${h.get('x-purpose') ?? ''}`) ? { prefetch: true } : {}) });

  return (
    <main className="screen pad" style={{ paddingBottom: 18 }}>
      <header className="hdr land" style={{ padding: 0 }}>
        <Logo large />
        <span className="tag-yellow">Free · 2 minutes</span>
      </header>

      <div className="stack" style={{ margin: 'auto 0', padding: '10px 0 18px' }}>
        <Hero hook={hook} category={category} />
        <Visual hook={hook} />
      </div>

      <div className="stack" data-sec="age_buttons" style={{ gap: 12 }}>
        <div className="trust">
          <span>No sign-up</span>
          <span aria-hidden>·</span>
          <span>No blood test</span>
          <span aria-hidden>·</span>
          <span>Private</span>
        </div>
        <AgeButtons hook={hook} category={category} ad={ad} />
        <p className="center" style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--faint)' }}>
          By choosing your age you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>. A symptom assessment, not a medical diagnosis.
        </p>
        <LegalLinks />
        <p className="center" style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--muted)' }}>
          Already bought a plan? <a href="/login">Log in</a>
        </p>
      </div>
    </main>
  );
}
