'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { AGENT_LIST } from '@/components/v2/content-factory/agents';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function ContentFactoryV2Landing() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;

    return (
        <div className="p-5 md:p-6 max-w-[640px] mx-auto">
            <motion.h2
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: EASE }}
                style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--v2-paper-ink)', letterSpacing: '-0.01em', marginBottom: '0.25rem' }}
            >
                Content Factory
            </motion.h2>
            <p className="v2-mono" style={{ fontSize: '0.72rem', color: 'var(--v2-paper-ink-2)', marginBottom: '1.25rem' }}>
                {AGENT_LIST.length} agents available
            </p>

            {AGENT_LIST.map((agent, i) => {
                const Icon = agent.icon;
                return (
                    <motion.div
                        key={agent.slug}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, delay: Math.min(i * 0.04, 0.12), ease: EASE }}
                    >
                        <Link
                            href={`/legacy/workspaces/${workspaceId}/modules/content-factory/v2/${agent.slug}`}
                            className="flex items-center gap-3 px-3 py-3 rounded-[8px] transition-colors group"
                            style={{ borderBottom: i < AGENT_LIST.length - 1 ? '1px solid var(--v2-paper-rule)' : 'none' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,50,27,0.04)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <div className="w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,0,0,0.03)' }}>
                                <Icon className="w-4 h-4" strokeWidth={1.75} style={{ color: 'var(--v2-paper-ink-2)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.85rem', fontWeight: 500, color: 'var(--v2-paper-ink)', lineHeight: 1.3 }}>
                                    {agent.name}
                                </div>
                                <div style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.72rem', color: 'var(--v2-paper-ink-2)', lineHeight: 1.3, marginTop: '0.125rem' }}>
                                    {agent.subtitle}
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--v2-vermilion)' }} />
                        </Link>
                    </motion.div>
                );
            })}
        </div>
    );
}
