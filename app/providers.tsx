'use client';

import { AuthProvider } from '@/lib/contexts/AuthContext';
import { WorkspaceProvider } from '@/lib/contexts/WorkspaceContext';
import { Notifications } from '@/components/v2/Notifications';

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
