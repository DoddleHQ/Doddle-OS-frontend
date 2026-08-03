import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './v2/globals.css';
import V2LandingPage from './v2/page';

const display = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--v2-display',
});

const sans = Hanken_Grotesk({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--v2-sans',
});

const mono = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--v2-mono',
});

export default function RootPage() {
  return (
    <div className={`v2-scope ${display.variable} ${sans.variable} ${mono.variable}`}>
      <V2LandingPage />
    </div>
  );
}
