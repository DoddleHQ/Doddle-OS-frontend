'use client';

import { ThreadProvider } from '@/lib/contexts/ThreadContext';

export default function AnalyticsActionLayout({
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
