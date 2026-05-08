'use client';

import { ThreadProvider } from '@/lib/contexts/ThreadContext';

export default function ContentFactoryLayout({
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
