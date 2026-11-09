'use client';

import { ThreadProvider } from '@/lib/contexts/ThreadContext';
import { RunRegistryProvider } from '@/components/v2/content-factory/RunRegistryProvider';
import { RunNotifications } from '@/components/v2/content-factory/RunNotifications';

export default function ContentFactoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThreadProvider>
            <RunRegistryProvider>
                {children}
                <RunNotifications />
            </RunRegistryProvider>
        </ThreadProvider>
    );
}
