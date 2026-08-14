'use client';

import { ErrorState } from '@/components/v2/dashboard/StatusPages';

export default function Error() {
    return <ErrorState onRetry={() => window.location.reload()} />;
}

