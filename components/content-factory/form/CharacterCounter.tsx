'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface CharacterCounterProps {
    current: number;
    max: number;
    className?: string;
    testId?: string;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
    current,
    max,
    className,
    testId = 'character-counter',
}) => {
    const percentage = (current / max) * 100;
    const isNearLimit = percentage >= 80 && percentage < 100;
    const isOverLimit = current > max;

    return (
        <div
            className={cn(
                'text-xs text-right',
                isOverLimit && 'text-error',
                isNearLimit && !isOverLimit && 'text-warning',
                !isNearLimit && !isOverLimit && 'text-neutral-400',
                className
            )}
            data-testid={testId}
            aria-live="polite"
        >
            {current}/{max}
        </div>
    );
};

CharacterCounter.displayName = 'CharacterCounter';
