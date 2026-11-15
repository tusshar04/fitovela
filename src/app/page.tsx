import type { Category, Hook } from '@/domain/types';
import { logEvent } from '@/server/session';
import { asCategory, asHook, sanitizeAd } from '@/server/validate';
import { AgeButtons } from '@/ui/AgeButtons';
import { Lock, Logo } from '@/ui/bits';

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
      ? { title: CHECK_HEADLINE[category], accent: 'Check in 2 minutes.', sub: 'A free symptom check made for Indian women. No blood test, no sign-up. See what your body has been trying to tell you.' }
      : hook === 'c'
        ? { title: 'One diet does not fit every woman.', accent: 'Find yours.', sub: 'Take the free assessment. We match your symptoms to a type, then build your plan from dosa, dal and roti. No salads.' }
        : { title: 'Dieting hard. Weight still stuck?', accent: 'Find out why.', sub: 'Generic diets ignore your hormones. Answer about 18 questions and see which of 4 hidden causes is holding your weight.' };

  return (
    <div className="stack" style={{ alignItems: 'center', gap: 10, paddingTop: 6 }}>
      <h1 className="center" style={{ textWrap: 'balance' }}>
        <span style={{ display: 'block', fontSize: 30, lineHeight: 1.12, fontWeight: 800, letterSpacing: '-0.02em' }}>{copy.title}</span>
        <span className="accent" style={{ display: 'block', marginTop: 4, fontSize: 40 }}>
          {copy.accent}
        </span>
      </h1>
      <p className="center" style={{ fontSize: 15, fontWeight: 500, color: 'var(--muted)' }}>
        {copy.sub}
      </p>
    </div>
  );
}

function Visual({ hook }: { hook: Hook }) {
  if (hook === 'b') {
    return (
      <>
        <section className="grid2" style={{ marginTop: 16 }}>
          {AREAS.map((a) => (
            <div key={a} className="check-tile">
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>{a}</div>
              <div className="row" style={{ gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--border)' }} />
                <span>Not checked yet</span>
              </div>
            </div>
          ))}
        </section>
        <div className="center" style={{ marginTop: 10, fontSize: 13, fontWeight: 700 }}>
          You get a score for each one, and your type.
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
        <section className="grid3" style={{ marginTop: 16 }}>
          {plates.map((p) => (
            <div key={p.label} className="stack" style={{ gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <img className="photo-sq" src={p.src} alt={p.alt} />
                <span className="lock-badge">
                  <Lock size={12} />
                </span>
              </div>
              <span className="center" style={{ fontSize: 12, lineHeight: 1.25, fontWeight: 800 }}>
                {p.label}
              </span>
            </div>
          ))}
        </section>
        <div className="center" style={{ marginTop: 10, fontSize: 13, fontWeight: 700 }}>
          Different type, different plate. Which one is yours?
        </div>
      </>
    );
  }
  return (
    <section className="plum stack" style={{ marginTop: 16, padding: 16, gap: 12 }}>
      <div className="row between" style={{ gap: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--yellow)' }}>YOUR FREE REPORT</span>
        <span className="row dim" style={{ gap: 5, fontSize: 11.5, fontWeight: 700 }}>
          <Lock size={12} />
          <span>Opens when you finish</span>
        </span>
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
        <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>
          Your type:
        </span>
        <span aria-hidden className="blur" style={{ fontSize: 20, fontWeight: 800 }}>
          Hidden until you finish
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
  await logEvent('landing_view', undefined, { hook, category });

  return (
    <main className="screen pad" style={{ paddingBottom: 16 }}>
      <header className="hdr land" style={{ padding: 0 }}>
        <Logo large />
        <span className="tag-yellow">Free · 2 minutes</span>
      </header>

      <Hero hook={hook} category={category} />
      <Visual hook={hook} />

      <div className="push stack" style={{ gap: 10, paddingTop: 14 }}>
        <div className="row" style={{ justifyContent: 'center', gap: 12, paddingBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
          <span>No sign-up</span>
          <span aria-hidden>·</span>
          <span>No blood test</span>
          <span aria-hidden>·</span>
          <span>Private</span>
        </div>
        <AgeButtons hook={hook} category={category} ad={ad} />
        <p className="center" style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--muted)' }}>
          By choosing your age you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>. A symptom assessment, not a medical diagnosis.
        </p>
        <p className="center" style={{ fontSize: 12.5, fontWeight: 700 }}>
          Already bought a plan? <a href="/login">Log in</a>
        </p>
      </div>
    </main>
  );
}
