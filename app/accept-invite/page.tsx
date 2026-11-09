'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { FlowingThreads } from '@/components/v2/FlowingThreads';
import { Logo } from '@/components/v2/Logo';
import { inviteLinkService } from '@/lib/services/workspaceService';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';

const EASE = [0.16, 1, 0.3, 1] as const;

function AcceptInviteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const { refresh: refreshWorkspaces } = useWorkspaces();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const attempted = useRef(false);

    useEffect(() => {
        async function acceptInvite() {
            if (!token) {
                setStatus('error');
                setMessage('No invite token found. Please check your invite link.');
                return;
            }
            if (attempted.current) return;
            attempted.current = true;
            try {
                const result = await inviteLinkService.acceptInvite(token);
                await refreshWorkspaces();
                setStatus('success');
                setMessage(result.message || 'You have joined the workspace.');
            } catch (err) {
                const msg = err instanceof Error ? err.message : '';
                if (/already a member/i.test(msg)) {
                    await refreshWorkspaces().catch(() => {});
                    setStatus('success');
                    setMessage('You are already a member of this workspace.');
                    return;
                }
                setStatus('error');
                setMessage(msg || 'Failed to accept invite. The link may be expired or invalid.');
            }
        }
        acceptInvite();
    }, [token, refreshWorkspaces]);

    return (
        <div className="v2-scope min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--v2-paper-ground)' }}>
            <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
                <FlowingThreads />
            </div>
            <motion.div
                className="absolute pointer-events-none rounded-full"
                style={{ top: '-15%', right: '-10%', width: '40vw', height: '40vh', background: 'var(--v2-vermilion)', filter: 'blur(140px)' }}
                animate={{ opacity: [0.02, 0.04, 0.02] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />

            <header className="flex-shrink-0 px-6 md:px-10 pt-8 relative z-10">
                <div className="max-w-[420px] mx-auto">
                    <Logo variant="wordmark" theme="light" />
                </div>
            </header>

            <div className="flex-1 flex items-center justify-center px-6 md:px-10 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="w-full max-w-[380px]"
                >
                    {status === 'loading' && (
                        <div className="text-center">
                            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
                            <h1 style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--v2-paper-ink)', marginBottom: '0.25rem' }}>
                                Accepting invite…
                            </h1>
                            <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.8rem', color: 'var(--v2-paper-ink-2)' }}>
                                Joining the workspace.
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3, ease: EASE, delay: 0.1 }}
                                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                                style={{ background: 'rgba(127,176,105,0.1)' }}
                            >
                                <CheckCircle className="w-6 h-6" style={{ color: 'var(--v2-sage)' }} />
                            </motion.div>
                            <h1 style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--v2-paper-ink)', marginBottom: '0.25rem' }}>
                                Welcome!
                            </h1>
                            <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.82rem', color: 'var(--v2-paper-ink-2)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                {message}
                            </p>
                            <button
                                onClick={() => router.push('/legacy/workspaces')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 v2-label text-[11px] rounded-[8px] transition-transform"
                                style={{ background: 'var(--v2-vermilion)', color: 'var(--v2-vermilion-ink)' }}
                            >
                                Go to workspaces
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.3, ease: EASE }}
                                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                                style={{ background: 'rgba(200,50,27,0.08)' }}
                            >
                                <XCircle className="w-6 h-6" style={{ color: 'var(--v2-vermilion)' }} />
                            </motion.div>
                            <h1 style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--v2-paper-ink)', marginBottom: '0.25rem' }}>
                                Invite failed
                            </h1>
                            <p style={{ fontFamily: 'var(--v2-font-sans)', fontSize: '0.82rem', color: 'var(--v2-paper-ink-2)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                {message}
                            </p>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 px-5 py-2.5 v2-label text-[11px] rounded-[8px] transition-colors"
                                style={{ border: '1px solid var(--v2-paper-rule)', color: 'var(--v2-paper-ink-2)' }}
                            >
                                Go home
                            </Link>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

export default function AcceptInvitePage() {
    return (
        <Suspense
            fallback={
                <div className="v2-scope min-h-screen flex items-center justify-center" style={{ background: 'var(--v2-paper-ground)' }}>
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--v2-vermilion)' }} />
                </div>
            }
        >
            <AcceptInviteContent />
        </Suspense>
    );
}
