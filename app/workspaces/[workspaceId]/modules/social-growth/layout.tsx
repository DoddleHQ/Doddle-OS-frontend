'use client';

import { ThreadProvider } from '@/lib/contexts/ThreadContext';

export default function SocialGrowthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThreadProvider>
            {children}
        </ThreadProvider>
    );
}
