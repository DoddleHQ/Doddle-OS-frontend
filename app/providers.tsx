'use client';

import { AuthProvider } from '@/lib/contexts/AuthContext';
import { WorkspaceProvider } from '@/lib/contexts/WorkspaceContext';
import { Notifications } from '@/components/v2/Notifications';

/**
 * Root providers.
 *
 * Wraps the entire application with AuthProvider, WorkspaceProvider, and
 * the v2 Notifications component to support session hydration and
 * toast notifications.
 */
export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <WorkspaceProvider>
                {children}
                <Notifications />
            </WorkspaceProvider>
        </AuthProvider>
    );
}
