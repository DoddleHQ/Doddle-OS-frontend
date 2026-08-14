import type { Metadata } from "next";
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Providers } from "./providers";
import "./globals.css";

const displayFont = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--v2-display',
  // Instrument Serif has unusual vertical metrics that next/font's automatic
  // fallback-metric calculator can't handle (causes the "Failed to find font
  // override values" warning). Disable the auto-adjustment — the CSS already
  // provides a proper serif fallback stack, so FOUT is minimal.
  adjustFontFallback: false,
});

const sansFont = Hanken_Grotesk({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--v2-sans',
});

const monoFont = JetBrains_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--v2-mono',
});

export const metadata: Metadata = {
  title: "Doddle OS",
  description: "An operating system for autonomous marketing agents. Deploy a fleet of specialized agents. Watch them hand the work to each other. Resolve their conflicts. Approve what ships.",
  icons: {
    icon: '/logo-monogram.png',
    shortcut: '/logo-monogram.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
