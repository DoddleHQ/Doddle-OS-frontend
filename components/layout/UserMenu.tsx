'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Loader2, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

/*
 * UserMenu — account trigger + dropdown, v2 token system.
 *
 * Replaces the legacy primary-500 / neutral-100 styling with the Specimen
 * Terminal tokens so it reads as part of the same product family as the
 * InstrumentShell. Honors the impeccable Operate rules: single sans
 * (Hanken Grotesk), accent reserved for state, complete hover/focus states,
 * 150-250ms functional motion.
 *
 * variant:
 *   - "light" (default): sits on the paper dashboard top bar
 *   - "dark": sits on the ink landing-page surface
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function UserMenu({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
    const auth = useAuth();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const org = auth.status === 'authenticated' ? auth.org : undefined;
    const isDark = variant === 'dark';

    // Colors resolved per register
    const c = {
        triggerHover: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        avatarBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(200,50,27,0.08)',
        avatarBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(200,50,27,0.18)',
        avatarText: isDark ? 'var(--v2-ink-text)' : 'var(--v2-vermilion)',
        chevron: isDark ? 'var(--v2-ink-text-2)' : 'var(--v2-paper-ink-2)',
        menuBg: isDark ? 'var(--v2-ink-ground)' : 'rgba(255,255,255,0.92)',
        menuBorder: isDark ? 'var(--v2-ink-rule)' : 'var(--v2-paper-rule)',
        nameText: isDark ? 'var(--v2-ink-text)' : 'var(--v2-paper-ink)',
        emailText: isDark ? 'var(--v2-ink-text-2)' : 'var(--v2-paper-ink-2)',
        itemHover: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        itemText: isDark ? 'var(--v2-ink-text-2)' : 'var(--v2-paper-ink-2)',
        muted: isDark ? 'var(--v2-ink-text-2)' : 'var(--v2-paper-ink-2)',
    };

    // Close on outside click / Escape
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    // Initials from org name
    const initials = org?.orgName
        ? org.orgName
              .split(/\s+/)
              .map((w: string) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : undefined;

    return (
        <div ref={menuRef} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex items-center gap-1.5 rounded-[8px] px-1.5 py-1.5 transition-colors"
                style={{ outline: 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = c.triggerHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--v2-vermilion)'; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
                {auth.status === 'loading' ? (
                    <div
                        className="h-6 w-6 rounded-full flex items-center justify-center"
                        style={{ background: c.avatarBg, border: `1px solid ${c.avatarBorder}` }}
                    >
                        <Loader2 className="h-3 w-3 animate-spin" style={{ color: c.muted }} />
                    </div>
                ) : (
                    <div
                        className="h-6 w-6 rounded-full flex items-center justify-center"
                        style={{
                            background: c.avatarBg,
                            border: `1px solid ${c.avatarBorder}`,
                            color: c.avatarText,
                            fontFamily: 'var(--v2-font-sans)',
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                        }}
                    >
                        {initials || <UserIcon className="h-3 w-3" />}
                    </div>
                )}
                <ChevronDown
                    className="h-3 w-3 transition-transform"
                    style={{ color: c.chevron, transform: open ? 'rotate(180deg)' : 'none' }}
                />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        role="menu"
                        aria-label="User menu"
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: EASE }}
                        className="absolute right-0 top-full mt-1.5 w-60 rounded-[10px] z-50 overflow-hidden"
                        style={{
                            background: c.menuBg,
                            border: `1px solid ${c.menuBorder}`,
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        }}
                    >
                        {auth.status === 'loading' ? (
                            <div className="px-4 py-6 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin" style={{ color: c.muted }} />
                            </div>
                        ) : auth.status === 'authenticated' && org ? (
                            <>
                                {/* Identity */}
                                <div className="px-4 py-3" style={{ borderBottom: `1px solid ${c.menuBorder}` }}>
                                    <p
                                        className="truncate"
                                        style={{
                                            fontFamily: 'var(--v2-font-sans)',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            color: c.nameText,
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {org.orgName}
                                    </p>
                                    <p
                                        className="v2-mono truncate"
                                        style={{ fontSize: '0.68rem', color: c.emailText, marginTop: '0.125rem' }}
                                    >
                                        {org.email}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="p-1.5">
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            setOpen(false);
                                            auth.logout();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] transition-colors"
                                        style={{
                                            fontFamily: 'var(--v2-font-sans)',
                                            fontSize: '0.78rem',
                                            color: c.itemText,
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = c.itemHover; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <LogOut className="h-3.5 w-3.5" />
                                        Log out
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Unauthenticated */
                            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${c.menuBorder}` }}>
                                <UserIcon className="h-4 w-4" style={{ color: c.muted }} />
                                <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.78rem', color: c.muted }}>
                                    Not signed in
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
