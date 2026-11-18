import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { AdMeasurement } from '@/ui/AdMeasurement';
import { Tracker } from '@/ui/Tracker';
import './globals.css';

// Fonts are bundled in src/fonts so a build never depends on downloading them.
const sans = localFont({ src: '../fonts/plus-jakarta-sans-latin-wght-normal.woff2', weight: '200 800', variable: '--font-sans', display: 'swap' });
const serif = localFont({
  src: [
    { path: '../fonts/instrument-serif-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/instrument-serif-latin-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Fitovela · Free symptom assessment for women',
  description: 'A free 2-minute symptom assessment for Indian women. We check your answers against four hidden causes, then build a report and an Indian diet plan for your type.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      {/* Browser extensions (Grammarly and others) add attributes to <body>; do not flag that as a mismatch. */}
      <body suppressHydrationWarning>
        {children}
        <Tracker />
        <AdMeasurement />
      </body>
    </html>
  );
}
