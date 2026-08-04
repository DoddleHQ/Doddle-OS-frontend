'use client';

import { AuthProvider } from '@/lib/contexts/AuthContext';
import { WorkspaceProvider } from '@/lib/contexts/WorkspaceContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/**
 * Root providers.
 *
 * Wraps the entire application with AuthProvider, WorkspaceProvider, and ToastContainer
 * to support session hydration, automatic redirection, and notification banners.
 */
export function Providers({ children }: { children: React.ReactNode }) {
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
