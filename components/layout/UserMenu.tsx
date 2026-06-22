'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, Loader2, User as UserIcon } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * UserMenu — displays the current user's initials in the header with a
 * dropdown that shows org name, email, and a logout button.
 *
 * Usage:
 *   <UserMenu />                     // default (light theme for dark backgrounds)
 *   <UserMenu variant="dark" />     // dark theme for light backgrounds
 */
export function UserMenu({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
    const auth = useAuth();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const org = auth.status === 'authenticated' ? auth.org : undefined;

    // Close dropdown on outside click or Escape key
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setOpen(false);
            }
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

    // Derive initials from org name
    const initials = org?.orgName
        ? org.orgName
              .split(/\s+/)
              .map((w: string) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : undefined;

    const isDark = variant === 'dark';

    return (
        <div ref={menuRef} className="relative">
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={open}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    isDark
                        ? 'hover:bg-white/10'
                        : 'hover:bg-neutral-100'
                }`}
            >
                {auth.status === 'loading' ? (
                    <div className="h-6 w-6 rounded-full flex items-center justify-center bg-neutral-200">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-500" />
                    </div>
                ) : (
                    <Avatar
                        initials={initials}
                        size="sm"
                        className={isDark ? 'ring-1 ring-white/20' : ''}
                    />
                )}
            </button>

            {/* Dropdown — always shown when open */}
            {open && (
                <div
                    role="menu"
                    aria-label="User menu"
                    className={`absolute right-0 top-full mt-1 w-56 rounded-xl border shadow-lg z-50 ${
                        isDark
                            ? 'border-white/10 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-900'
                    }`}
                >
                    {auth.status === 'loading' ? (
                        /* Loading state */
                        <div className="px-4 py-6 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                        </div>
                    ) : auth.status === 'authenticated' && org ? (
                        <>
                            {/* User info */}
                            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-neutral-100'}`}>
                                <p className="text-sm font-semibold truncate">{org.orgName}</p>
                                <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
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
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                                        isDark
                                            ? 'text-neutral-300 hover:bg-white/10 hover:text-white'
                                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                                    }`}
                                >
                                    <LogOut className="h-4 w-4" />
                                    Log out
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Unauthenticated / error state */
                        <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-neutral-100'}`}>
                            <div className="flex items-center gap-2">
                                <UserIcon className={`h-4 w-4 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
                                <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                    Not signed in
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
