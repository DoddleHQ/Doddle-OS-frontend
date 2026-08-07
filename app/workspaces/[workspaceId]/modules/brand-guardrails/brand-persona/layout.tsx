import { ThreadProvider } from '@/lib/contexts/ThreadContext';

export default function BrandPersonaLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThreadProvider>
            {children}
        </ThreadProvider>
    );
}
