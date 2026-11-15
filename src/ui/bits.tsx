// Small shared pieces: logo, icons, level bars.

import type { Level } from '@/domain/types';

export function Logo({ large = false, href }: { large?: boolean; href?: string }) {
  const size = large ? 30 : 24;
  const inner = (
    <>
      <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Fitovela">
        <rect width="32" height="32" rx="10" fill="#C2185B" />
        <path d="M9 23.5c0-8.5 5.5-13.5 14.5-14.5 0 9.5-5.5 14.5-14.5 14.5z" fill="#FFFFFF" />
        <path d="M9.5 23c3-4.2 6.2-7.2 10.5-9.5" fill="none" stroke="#C2185B" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="23.5" cy="23" r="2.6" fill="#FFD23F" />
      </svg>
      <span>fitovela</span>
    </>
  );
  const cls = `logo${large ? ' lg' : ''}`;
  return href ? (
    <a className={cls} href={href}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

type IconProps = { size?: number; stroke?: number; className?: string; style?: React.CSSProperties };

const base = (size: number, stroke: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: stroke,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const Check = ({ size = 14, stroke = 3.4, ...rest }: IconProps) => (
  <svg {...base(size, stroke)} {...rest}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const ChevronLeft = ({ size = 22, stroke = 2.4, ...rest }: IconProps) => (
  <svg {...base(size, stroke)} {...rest}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const ChevronRight = ({ size = 18, stroke = 3, ...rest }: IconProps) => (
  <svg {...base(size, stroke)} {...rest}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export const ChevronDown = ({ size = 18, stroke = 3, ...rest }: IconProps) => (
  <svg {...base(size, stroke)} {...rest}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const Lock = ({ size = 13, stroke = 2.6, ...rest }: IconProps) => (
  <svg {...base(size, stroke)} {...rest}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);
export const Shield = ({ size = 24, stroke = 2, ...rest }: IconProps) => (
  <svg {...base(size, stroke)} {...rest}>
    <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.700-7-5.500-7-10V6l7-3z" />
    <path d="M9 12l2.200 2.200L15 10.200" />
  </svg>
);
export const SwapIcon = ({ size = 15, stroke = 2.6, ...rest }: IconProps) => (
  <svg {...base(size, stroke)} {...rest}>
    <path d="M7 7h11l-3-3M17 17H6l3 3" />
  </svg>
);
export const Spark = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l2.4 7.6L22 12l-7.600 2.400L12 22l-2.400-7.600L2 12l7.600-2.400z" />
  </svg>
);
export const Plus = ({ size = 20, stroke = 2.4, ...rest }: IconProps) => (
  <svg {...base(size, stroke)} {...rest}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export function Tick({ small = false }: { small?: boolean }) {
  return (
    <span className={`tick${small ? ' sm' : ''}`}>
      <Check size={small ? 11 : 12} stroke={3.6} />
    </span>
  );
}

/** Five bars, `filled` of them coloured. On plum cards pass tone="on". */
export function Bars({ filled, tone, label }: { filled: number; tone: Level | 'on'; label: string }) {
  return (
    <span className="bars" role="img" aria-label={label}>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={i < filled ? tone : undefined} />
      ))}
    </span>
  );
}

export function Ring({ percent, size = 104 }: { percent: number; size?: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${percent} percent complete`} style={{ alignSelf: 'center' }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#FCE7EF" strokeWidth="11" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#C2185B" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(c * percent) / 100} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="69" textAnchor="middle" fontSize="27" fontWeight="800" fill="#2B1330">
        {percent}%
      </text>
    </svg>
  );
}
