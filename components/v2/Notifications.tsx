'use client';

import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useNotificationStore, type NotificationType } from '@/lib/stores/notificationStore';

/*
 * Notifications — v2 Specimen Terminal toast renderer.
 *
 * Mounted once in providers. Reads from the Zustand notification store
 * and renders dismissible toasts in the top-right corner using paper/ink
 * tokens with semantic left-border accents.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const CONFIG: Record<NotificationType, { border: string; icon: React.ReactNode }> = {
    success: { border: 'var(--v2-sage)', icon: <CheckCircle className="w-4 h-4" style={{ color: 'var(--v2-sage)' }} /> },
    error: { border: 'var(--v2-vermilion)', icon: <XCircle className="w-4 h-4" style={{ color: 'var(--v2-vermilion)' }} /> },
    warning: { border: 'var(--v2-vermilion)', icon: <AlertCircle className="w-4 h-4" style={{ color: 'var(--v2-vermilion)' }} /> },
    info: { border: 'var(--v2-paper-ink-2)', icon: <Info className="w-4 h-4" style={{ color: 'var(--v2-paper-ink-2)' }} /> },
};

export function Notifications() {
    const notifications = useNotificationStore((s) => s.notifications);
    const dismiss = useNotificationStore((s) => s.dismiss);

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '340px' }}>
            <AnimatePresence>
                {notifications.map((n) => {
                    const config = CONFIG[n.type];
                    return (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2, ease: EASE }}
                            className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[10px] pointer-events-auto"
                            style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid var(--v2-paper-rule)',
                                borderLeft: `3px solid ${config.border}`,
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                            }}
                        >
                            <span className="flex-shrink-0 mt-0.5">{config.icon}</span>
                            <span
                                className="flex-1"
                                style={{
                                    fontFamily: 'var(--v2-font-sans)',
                                    fontSize: '0.82rem',
                                    color: 'var(--v2-paper-ink)',
                                    lineHeight: 1.4,
                                }}
                            >
                                {n.message}
                            </span>
                            <button
                                onClick={() => dismiss(n.id)}
                                className="flex-shrink-0 mt-0.5 transition-opacity"
                                style={{ color: 'var(--v2-paper-ink-2)', opacity: 0.5 }}
                                aria-label="Dismiss"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
