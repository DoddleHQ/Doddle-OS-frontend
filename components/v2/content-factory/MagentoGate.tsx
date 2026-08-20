'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Store, ArrowRight } from 'lucide-react';
import { connectionService } from '@/lib/services/connectionService';

const EASE = [0.16, 1, 0.3, 1] as const;

/*
 * MagentoGate — connection-gated start state for catalog-based agents (Mia).
 *
 * Replaces the generic workspace-domain chip on the welcome screen: Mia reads
 * the synced Magento catalog from the datalake, so what matters pre-flight is
 * the store connection — not the website domain.
 *
 * Three states:
 * - loading: breathing chip skeleton
 * - connected: store chip (sage status dot + mono base URL) + start button
 * - missing: dashed-rule card linking to Settings → Data Sync
 *
 * Operate mode: paper register, sage for the connected state, vermilion
 * reserved for the action. No border + shadow combos.
 */

type GateStatus = 'loading' | 'connected' | 'missing';

export function MagentoGate({
    workspaceId,
    startLabel,
    onStart,
}: {
    workspaceId: string;
    startLabel: string;
    onStart: () => void;
}) {
    const [status, setStatus] = useState<GateStatus>('loading');
    const [storeUrl, setStoreUrl] = useState('');

    useEffect(() => {
        let cancelled = false;
        connectionService
            .listConnections(workspaceId)
            .then((connections) => {
                if (cancelled) return;
                const magento = connections.find((c) => c.sourceType === 'magento' && c.isActive);
                if (magento?.magento) {
                    setStoreUrl(
                        magento.magento.baseUrl
                            .replace(/^https?:\/\//, '')
                            .replace(/\/+$/, ''),
                    );
                    setStatus('connected');
                } else {
                    setStatus('missing');
                }
            })
            .catch(() => {
                if (!cancelled) setStatus('missing');
            });
        return () => {
            cancelled = true;
        };
    }, [workspaceId]);

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center gap-3">
                <div
                    className="h-10 w-56 rounded-[8px]"
                    style={{ background: 'var(--v2-paper-rule)', opacity: 0.4, animation: 'v2-metric-breath 1.4s ease-in-out infinite' }}
                />
            </div>
        );
    }

    if (status === 'missing') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="px-5 py-4 rounded-[8px] max-w-[380px]"
                style={{ border: '1px dashed var(--v2-paper-rule-strong)', background: 'rgba(255,255,255,0.2)' }}
            >
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Store className="w-3.5 h-3.5" style={{ color: 'var(--v2-paper-ink-2)' }} />
                    <span style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.8rem', fontWeight: 500, color: 'var(--v2-paper-ink)' }}>
                        No Magento store connected
                    </span>
                </div>
                <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.75rem', color: 'var(--v2-paper-ink-2)', textAlign: 'center', lineHeight: 1.5, marginBottom: '1rem' }}>
                    I read your synced catalog from the datalake — connect your Magento store first, then come back and we&apos;ll start writing.
                </p>
                <div className="flex justify-center">
                    <Link
                        href={`/workspaces/${workspaceId}/settings?tab=sync`}
                        className="inline-flex items-center gap-2 px-4 py-2 v2-label text-[10px] rounded-[8px]"
                        style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                    >
                        Connect Magento
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex flex-col items-center gap-3"
        >
            {/* Store chip — mirrors the domain chip used by other agents */}
            <div
                className="flex items-center gap-2.5 px-4 py-2 rounded-[8px]"
                style={{ border: '1px solid var(--v2-paper-rule)', background: 'rgba(255,255,255,0.3)' }}
            >
                <Store className="w-3.5 h-3.5" style={{ color: 'var(--v2-paper-ink-2)' }} />
                <span className="v2-mono" style={{ fontSize: '0.75rem', color: 'var(--v2-paper-ink)' }}>
                    {storeUrl || 'Connected store'}
                </span>
                <span className="flex items-center gap-1.5 pl-2.5" style={{ borderLeft: '1px solid var(--v2-paper-rule)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--v2-sage)' }} />
                    <span className="v2-label" style={{ fontSize: '0.55rem', color: 'var(--v2-sage)' }}>
                        CONNECTED
                    </span>
                </span>
            </div>
            <button
                onClick={onStart}
                className="v2-mono px-6 py-2 rounded-[8px] transition-colors"
                style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#fff',
                    background: 'var(--v2-vermilion)',
                    border: 'none',
                    cursor: 'pointer',
                }}
            >
                {startLabel}
            </button>
        </motion.div>
    );
}
