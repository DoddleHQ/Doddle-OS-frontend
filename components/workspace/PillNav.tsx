'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useOS } from '@/lib/demo/osStore';
import { DemoIcon } from '@/lib/demo/icons';
import { BrandMark } from './primitives';
import { buildDemoRoutes } from './routes';

/** Hide the pill after this long without pointer, wheel, touch, or keyboard activity. */
const IDLE_MS = 3000;

/**
 * Floating pill header for non-dashboard pages. Replaces the left dock there:
 * appears while the user is active, fades out after a period of stillness.
 */
export function PillNav({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const runActive = useOS((s) => s.runActive);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routes = buildDemoRoutes(workspaceId);
  const basePath = `/workspaces/${workspaceId}`;

  const isActive = (path: string) =>
    path === basePath ? pathname === basePath : pathname.startsWith(path);

  const scheduleHide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), IDLE_MS);
  }, []);

  useEffect(() => {
    setVisible(true);
    scheduleHide();
    const poke = () => {
      setVisible(true);
      scheduleHide();
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'focusin'] as const;
    events.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, poke));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [scheduleHide]);

  // resting the pointer on the pill keeps it open — restart the countdown on leave
  useEffect(() => {
    if (hovered && timer.current) clearTimeout(timer.current);
  }, [hovered]);

  const userName = user?.name || 'Operator';
  const userInitial = userName.trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[80] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        scheduleHide();
      }}
    >
      <nav
        aria-label="Workspace navigation"
        className="agency-panel agency-border border rounded-full flex items-center gap-0.5 px-2 py-1.5"
      >
        <Link href="/" title="Doddle OS" className="hover:opacity-85 transition-opacity mx-1 shrink-0">
          <BrandMark className="w-6 h-6" />
        </Link>
        <span className="w-px h-5 bg-[var(--hairline)] mx-1 shrink-0" aria-hidden="true" />
        {routes.map((route) => (
          <Link
            key={route.path}
            href={route.path}
            title={route.label}
            className={`dock-icon relative h-9 flex items-center rounded-full shrink-0 transition-[padding] duration-200 ${hovered ? 'px-2.5 gap-2' : 'w-9 justify-center'} ${isActive(route.path) ? 'active' : ''}`}
          >
            <DemoIcon name={route.icon} className="w-4 h-4 shrink-0" />
            <span
              className={`text-[12px] font-mono whitespace-nowrap overflow-hidden transition-all duration-200 ${hovered ? 'max-w-[140px] opacity-100' : 'max-w-0 opacity-0'} ${isActive(route.path) ? 'text-[var(--ink)] font-semibold' : ''}`}
            >
              {route.label}
            </span>
            {route.label === 'launchpad' && runActive && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--line-scarlet)] animate-pulse" />
            )}
          </Link>
        ))}
        <span className="w-px h-5 bg-[var(--hairline)] mx-1 shrink-0" aria-hidden="true" />
        <Link
          href={`${basePath}/settings`}
          title={userName}
          className={`h-8 flex items-center rounded-full border border-[var(--hairline)] bg-[var(--net-panel-2)] hover:border-[var(--hairline-strong)] transition-all duration-200 shrink-0 ${hovered ? 'px-2 gap-2' : 'w-8 justify-center'}`}
        >
          <span className="flex items-center justify-center text-[10px] font-bold font-mono w-6 h-6 rounded-full shrink-0">
            {userInitial}
          </span>
          <span
            className={`text-[11px] font-semibold whitespace-nowrap overflow-hidden transition-all duration-200 ${hovered ? 'max-w-[120px] opacity-100 pr-1' : 'max-w-0 opacity-0'}`}
          >
            {userName}
          </span>
        </Link>
      </nav>
    </div>
  );
}
