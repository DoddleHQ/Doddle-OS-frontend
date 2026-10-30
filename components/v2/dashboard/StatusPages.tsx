'use client';

import { motion } from 'motion/react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="flex flex-col items-center justify-center py-16 text-center px-6"
        >
            <AlertCircle className="w-8 h-8 mb-3" style={{ color: 'var(--v2-vermilion)' }} strokeWidth={1.5} />
            <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.85rem', fontWeight: 500, color: 'var(--v2-paper-ink)', marginBottom: '0.25rem' }}>
                Something went wrong
            </p>
            <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.75rem', color: 'var(--v2-paper-ink-2)', marginBottom: '1rem', maxWidth: '300px', lineHeight: 1.5 }}>
                {message || 'An unexpected error occurred. Try refreshing the page.'}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-4 py-2 v2-label text-[10px] rounded-[8px]"
                    style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                </button>
            )}
        </motion.div>
    );
}

export function LoadingState({ lines = 4 }: { lines?: number }) {
    return (
        <div className="p-5 md:p-6 max-w-[640px] mx-auto space-y-4">
            <div className="flex items-center gap-2">
                <div className="h-7 rounded" style={{ width: '40%', background: 'var(--v2-paper-rule)', opacity: 0.5, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
            </div>
            {[...Array(lines)].map((_, i) => (
                <div key={i} className="h-12 rounded-[8px]" style={{ background: 'var(--v2-paper-rule)', opacity: 0.4, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }} />
            ))}
        </div>
    );
}

export function FullScreenLoading() {
    return (
        <div className="v2-scope min-h-screen flex items-center justify-center" style={{ background: 'var(--v2-paper-ground)' }}>
            <motion.div
                className="w-7 h-7 rounded-full"
                style={{ border: '2px solid var(--v2-paper-rule)', borderTopColor: 'var(--v2-vermilion)' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    );
}

export function ComingSoon({ moduleName }: { moduleName: string }) {
    return (
        <div className="p-5 md:p-6 max-w-[640px] mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="flex flex-col items-center justify-center py-16 text-center"
            >
                <h2 style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--v2-paper-ink)', marginBottom: '0.25rem' }}>
                    {moduleName}
                </h2>
                <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.8rem', color: 'var(--v2-paper-ink-2)' }}>
                    This module is coming soon.
                </p>
            </motion.div>
        </div>
    );
}
