import type { Metadata } from 'next';
import { Archivo, Fragment_Mono } from 'next/font/google';

import { DemoShell } from '@/components/workspace/DemoShell';

const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo',
  weight: ['400', '500', '600', '700', '800'],
});

const fragmentMono = Fragment_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fragment',
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Doddle OS',
  description: 'Agentic execution engine for marketing operators.',
};

interface DemoWorkspaceLayoutProps {
  children: React.ReactNode;
  params: { workspaceId: string };
}

export default function DemoWorkspaceLayout({ children, params }: DemoWorkspaceLayoutProps) {
  return (
    <div className={`${archivo.variable} ${fragmentMono.variable}`}>
      <DemoShell workspaceId={params.workspaceId}>{children}</DemoShell>
    </div>
  );
}
