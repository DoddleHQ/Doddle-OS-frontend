'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface GTMStrategyButtonProps {
    workspaceId: string;
    label?: string;
    disabled?: boolean;
    className?: string;
    testId?: string;
}

export const GTMStrategyButton: React.FC<GTMStrategyButtonProps> = ({
    workspaceId,
    label = 'GTM Strategy',
    disabled = false,
    className,
    testId = 'gtm-strategy-button',
}) => {
    return (
        <Link href={`/legacy/workspaces/${workspaceId}/modules/social-growth/new`}>
            <Button
                variant="primary"
                disabled={disabled}
                className={`gap-2 ${className || ''}`}
                data-testid={testId}
                aria-label={label}
            >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {label}
            </Button>
        </Link>
    );
};

GTMStrategyButton.displayName = 'GTMStrategyButton';
