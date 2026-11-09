'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Store } from 'lucide-react';

interface MerchantAnalystButtonProps {
    workspaceId: string;
}

export function MerchantAnalystButton({ workspaceId }: MerchantAnalystButtonProps) {
    return (
        <Link href={`/legacy/workspaces/${workspaceId}/modules/analytics-action/merchant-analyst/new`}>
            <Button variant="primary" className="gap-2">
                <Store className="h-4 w-4" />
                New Analysis
            </Button>
        </Link>
    );
}
