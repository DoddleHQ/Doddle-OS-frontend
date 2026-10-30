'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useOS } from '@/lib/demo/osStore';
import { DemoIcon } from '@/lib/demo/icons';
import { BrandMark } from './primitives';
import { buildDemoRoutes } from './routes';

const IDLE_MS = 3000;

const EASE = [0.16, 1, 0.3, 1] as const;

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

  useEffect(() => {
    if (hovered && timer.current) clearTimeout(timer.current);
  }, [hovered]);

  const userName = user?.name || 'Operator';
  const userInitial = userName.trim().split(' ')[0]?.[0]?.toUpperCase() ?? '?';

  return (
    <div
      className={`fixed top-4 inset-x-0 z-[80] flex justify-center transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'}`}
    >
      <nav
        aria-label="Workspace navigation"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          scheduleHide();
        }}
        onFocus={() => setHovered(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setHovered(false);
        }}
        className="agency-panel agency-border border rounded-full flex items-center gap-0.5 px-2 py-1.5 max-w-[calc(100vw-2rem)]"
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
            className={`dock-icon relative h-9 flex items-center rounded-full shrink-0 px-2.5 ${isActive(route.path) ? 'active' : ''}`}
          >
            <DemoIcon name={route.icon} className="w-4 h-4 shrink-0" />
            <motion.span
              initial={false}
              animate={{ width: hovered ? 'auto' : 0, marginLeft: hovered ? 8 : 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className={`overflow-hidden whitespace-nowrap shrink-0 text-[12px] font-mono ${isActive(route.path) ? 'text-[var(--ink)] font-semibold' : ''}`}
            >
              {route.label}
            </motion.span>
            {route.label === 'launchpad' && runActive && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--line-scarlet)] animate-pulse" />
            )}
          </Link>
        ))}
        <span className="w-px h-5 bg-[var(--hairline)] mx-1 shrink-0" aria-hidden="true" />
        <Link
          href={`${basePath}/settings`}
          title={userName}
          className="h-8 flex items-center rounded-full border border-[var(--hairline)] bg-[var(--net-panel-2)] hover:border-[var(--hairline-strong)] transition-colors shrink-0 px-2"
        >
          <span className="flex items-center justify-center text-[10px] font-bold font-mono w-6 h-6 rounded-full shrink-0">
            {userInitial}
          </span>
          <motion.span
            initial={false}
            animate={{ width: hovered ? 'auto' : 0, marginLeft: hovered ? 8 : 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden whitespace-nowrap shrink-0 text-[11px] font-semibold"
          >
            {userName}
          </motion.span>
        </Link>
      </nav>
    </div>
  );
}
