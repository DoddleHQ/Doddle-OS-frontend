'use client';

import Image from 'next/image';

/*
 * Logo — Doddle OS brand logo component.
 *
 * Variants:
 * - 'monogram': the square D icon (for icon rails, favicons, small spaces)
 * - 'wordmark': the full "Doddle OS" horizontal logo (for headers, auth pages)
 *
 * Theme:
 * - 'light': colored/dark logo for light backgrounds (paper register)
 * - 'dark': white logo for dark backgrounds (ink register)
 */

interface LogoProps {
    variant?: 'monogram' | 'wordmark';
    theme?: 'light' | 'dark';
    size?: number;
    className?: string;
}

export function Logo({
    variant = 'wordmark',
    theme = 'light',
    size,
    className = '',
}: LogoProps) {
    const src = variant === 'monogram'
        ? theme === 'dark' ? '/logo-monogram-white.png' : '/logo-monogram.png'
        : theme === 'dark' ? '/logo-wordmark-white.png' : '/logo-wordmark.png';

    // Default sizes — wordmark is ~3:1 aspect ratio
    const width = size ?? (variant === 'monogram' ? 32 : 120);
    const height = size ?? (variant === 'monogram' ? 32 : 40);

    // For wordmark, maintain aspect ratio (~0.33 height/width)
    const actualHeight = variant === 'wordmark' && size ? Math.round(size * 0.33) : height;
    const actualWidth = variant === 'wordmark' && !size ? 120 : width;

    return (
        <Image
            src={src}
            alt="Doddle OS"
            width={actualWidth}
            height={actualHeight}
            className={className}
            priority
        />
    );
}
