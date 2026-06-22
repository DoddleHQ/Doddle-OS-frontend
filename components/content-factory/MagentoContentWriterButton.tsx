'use client';

import React from 'react';
import Link from 'next/link';
import { PenTool } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface MagentoContentWriterButtonProps {
    workspaceId: string;
    label?: string;
    disabled?: boolean;
    className?: string;
    testId?: string;
}

export const MagentoContentWriterButton: React.FC<MagentoContentWriterButtonProps> = ({
    workspaceId,
    label = 'Magento Content Writer',
    disabled = false,
    className,
    testId = 'magento-content-writer-button',
}) => {
    return (
        <Link href={`/workspaces/${workspaceId}/modules/content-factory/magento-content-writer/new`}>
            <Button
                variant="primary"
                disabled={disabled}
                className={`gap-2 ${className || ''}`}
                data-testid={testId}
                aria-label={label}
            >
                <PenTool className="h-4 w-4" aria-hidden="true" />
                {label}
            </Button>
        </Link>
    );
};

MagentoContentWriterButton.displayName = 'MagentoContentWriterButton';
