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
            {/* Run containers mount here — above the routes — so agent runs
                survive navigation anywhere inside the content factory. */}
            <RunRegistryProvider>
                {children}
                <RunNotifications />
            </RunRegistryProvider>
        </ThreadProvider>
    );
}
