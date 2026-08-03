'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { WorkspaceProvider } from '@/lib/contexts/WorkspaceContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Root providers.
 *
 * The v2 redesign (`/v2`) is a standalone showcase with its own design system
 * and no auth/workspace wiring yet. It must NOT mount AuthProvider /
 * WorkspaceProvider / ToastContainer, because those call the backend on mount
 * (getMe, refreshAccessToken) and surface CORS/network errors in every browser
 * when the API isn't reachable — the source of "errors on all other browsers".
 *
 * All other routes (v1) keep the full provider stack, unchanged.
 */
export function Providers({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';

    // /v2 is standalone — render children without the app provider stack.
    if (pathname.startsWith('/v2')) {
        return <>{children}</>;
    }

    return (
        <AuthProvider>
            <WorkspaceProvider>
                {children}
                <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                />
            </WorkspaceProvider>
        </AuthProvider>
    );
}
