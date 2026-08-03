'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { WorkspaceProvider } from '@/lib/contexts/WorkspaceContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export function Providers({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() ?? '';
    
    if (pathname === '/' || pathname.startsWith('/v2')) {
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
