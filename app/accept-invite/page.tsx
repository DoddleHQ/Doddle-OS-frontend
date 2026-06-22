'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { inviteLinkService } from '@/lib/services/workspaceService';
import { CheckCircle, XCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function AcceptInvitePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        async function acceptInvite() {
            if (!token) {
                setStatus('error');
                setMessage('No invite token provided. Please check your invite link.');
                return;
            }

            try {
                const result = await inviteLinkService.acceptInvite(token);
                setStatus('success');
                setMessage(result.message);
            } catch (err) {
                setStatus('error');
                setMessage(
                    err instanceof Error ? err.message : 'Failed to accept invite. The link may be expired or invalid.',
                );
            }
        }

        acceptInvite();
    }, [token]);

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
            <Card className="p-8 max-w-md w-full text-center">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-16 h-16 text-primary-500 animate-spin mx-auto mb-6" />
                        <h1 className="text-2xl font-bold mb-2">Accepting Invite...</h1>
                        <p className="text-muted-foreground">
                            Joining the workspace. Please wait.
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-success-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold mb-2">Welcome!</h1>
                        <p className="text-muted-foreground mb-6">{message}</p>
                        <Link href="/">
                            <Button>Go to Dashboard</Button>
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 text-error mx-auto mb-6" />
                        <h1 className="text-2xl font-bold mb-2">Invite Failed</h1>
                        <p className="text-muted-foreground mb-6">{message}</p>
                        <Link href="/">
                            <Button variant="outline">Go to Dashboard</Button>
                        </Link>
                    </>
                )}
            </Card>
        </div>
    );
}
