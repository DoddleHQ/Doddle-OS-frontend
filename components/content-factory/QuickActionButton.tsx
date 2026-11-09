'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface QuickActionButtonProps {
    workspaceId: string;
    label?: string;
    disabled?: boolean;
    className?: string;
    testId?: string;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
    workspaceId,
    label = 'New Project',
    disabled = false,
    className,
    testId = 'quick-action-button',
}) => {
    return (
        <Link href={`/legacy/workspaces/${workspaceId}/modules/content-factory/content-architect/new`}>
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

QuickActionButton.displayName = 'QuickActionButton';
