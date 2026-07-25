'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { BarChart3 } from 'lucide-react';

interface GoogleAnalystButtonProps {
    workspaceId: string;
}

export function GoogleAnalystButton({ workspaceId }: GoogleAnalystButtonProps) {
    return (
        <Link href={`/workspaces/${workspaceId}/modules/analytics-action/google-analyst/new`}>
            <Button variant="primary" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                New Analysis
            </Button>
        </Link>
    );
}
