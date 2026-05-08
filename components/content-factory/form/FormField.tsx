'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
    label: string;
    required?: boolean;
    error?: string;
    helperText?: string;
    children: React.ReactNode;
    className?: string;
    testId?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
    label,
    required = false,
    error,
    helperText,
    children,
    className,
    testId,
}) => {
    const hasError = !!error;

    return (
        <div className={cn('space-y-1.5', className)} data-testid={testId}>
            <label className="text-sm font-medium text-neutral-900 flex items-center gap-1">
                {label}
                {required && <span className="text-error" aria-label="required">*</span>}
            </label>

            <div className={hasError ? 'relative' : ''}>
                {React.cloneElement(children as React.ReactElement, {
                    className: cn(
                        (children as React.ReactElement).props.className,
                        hasError && 'border-error focus-visible:ring-error/50'
                    ),
                    'aria-invalid': hasError,
                    'aria-describedby': hasError ? `${testId}-error` : helperText ? `${testId}-helper` : undefined,
                })}
            </div>

            {hasError && (
                <div
                    id={`${testId}-error`}
                    className="flex items-center gap-1.5 text-xs text-error"
                    role="alert"
                    aria-live="polite"
                >
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {!hasError && helperText && (
                <p id={`${testId}-helper`} className="text-xs text-neutral-500">
                    {helperText}
                </p>
            )}
        </div>
    );
};

FormField.displayName = 'FormField';
