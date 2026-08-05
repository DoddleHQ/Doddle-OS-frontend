'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { UserMenu } from '@/components/layout/UserMenu';

/*
 * FloatingNav — the minimal navigation for the broadsheet dashboard.
 *
 * A thin pill-bar that floats over the paper canvas, fixed to the top.
 * Hides on scroll-down, shows on scroll-up (like iOS Safari). Contains:
 * the Doddle OS wordmark (left), module pills (center, scrollable),
 * and the user menu (right).
 *
 * No sidebar, no columns — just this bar over a single continuous surface.
 */

const MODULES = [
  { name: 'Mission Control', path: 'mission-control', short: 'MC' },
  { name: 'SEO Cluster', path: 'modules/seo-cluster', short: 'SEO' },
  { name: 'Content Factory', path: 'modules/content-factory', short: 'Content' },
  { name: 'Social Growth', path: 'modules/social-growth', short: 'Social' },
  { name: 'SaaS Launch', path: 'modules/saas-launch-ops', short: 'SaaS' },
  { name: 'Business Audit', path: 'modules/business-audit', short: 'Audit' },
  { name: 'Analytics', path: 'modules/analytics-action', short: 'Analytics' },
  { name: 'Ads', path: 'modules/ads-execution', short: 'Ads' },
  { name: 'Email', path: 'modules/email-nurture', short: 'Email' },
  { name: 'Brand', path: 'modules/brand-guardrails', short: 'Brand' },
];

export function FloatingNav({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [lastY, setLastY] = useState(0);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = lastY;
    setLastY(latest);
    if (latest > previous && latest > 100) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  return (
    <motion.nav
      animate={{ y: hidden ? -80 : 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[1100px]"
    >
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-full overflow-hidden"
        style={{
          background: 'rgba(20,18,16,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(237,231,219,0.08)',
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          className="v2-display text-[1rem] whitespace-nowrap pl-2"
          style={{ color: 'var(--v2-ink-text)' }}
        >
          Doddle OS
        </Link>

        {/* Divider */}
        <span className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(237,231,219,0.1)' }} />

        {/* Module pills — horizontally scrollable */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {MODULES.map((mod) => {
            const fullPath = `/workspaces/${workspaceId}/${mod.path}`;
            const isActive = pathname.includes(mod.path);
            return (
              <Link
                key={mod.path}
                href={fullPath}
                className="v2-mono text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex-shrink-0"
                style={{
                  background: isActive ? 'var(--v2-vermilion)' : 'transparent',
                  color: isActive ? 'var(--v2-vermilion-ink)' : 'var(--v2-ink-text-2)',
                }}
              >
                {mod.short}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <span className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(237,231,219,0.1)' }} />

        {/* Settings */}
        <Link
          href={`/workspaces/${workspaceId}/settings`}
          className="v2-mono text-[11px] px-2 py-1.5 rounded-full whitespace-nowrap transition-colors flex-shrink-0"
          style={{
            color: pathname.includes('/settings') ? 'var(--v2-vermilion-lift)' : 'var(--v2-ink-text-2)',
          }}
        >
          Settings
        </Link>

        {/* User menu */}
        <div className="flex-shrink-0">
          <UserMenu variant="dark" />
        </div>
      </div>
    </motion.nav>
  );
}
