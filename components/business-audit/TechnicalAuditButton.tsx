'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface TechnicalAuditButtonProps {
    workspaceId: string;
    label?: string;
    disabled?: boolean;
    className?: string;
    testId?: string;
}

export const TechnicalAuditButton: React.FC<TechnicalAuditButtonProps> = ({
    workspaceId,
    label = 'Technical Audit',
    disabled = false,
    className,
    testId = 'technical-audit-button',
}) => {
    return (
        <Link href={`/workspaces/${workspaceId}/modules/business-audit/new`}>
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

TechnicalAuditButton.displayName = 'TechnicalAuditButton';
