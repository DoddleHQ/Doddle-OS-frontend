'use client';

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
 *
 * Uses a plain <img> (not next/image) — logo files are small static assets
 * (6-14KB) that don't benefit from the optimizer, and the /_next/image
 * optimizer can fail in standalone production builds.
 */

interface LogoProps {
    variant?: 'monogram' | 'wordmark';
    theme?: 'light' | 'dark';
    /** Width in px (height auto-computed from aspect ratio) */
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

    // Wordmark is ~3:1; monogram is 1:1
    const width = size ?? (variant === 'monogram' ? 32 : 120);
    const height = variant === 'wordmark' ? Math.round(width / 3) : width;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt="Doddle OS"
            width={width}
            height={height}
            className={className}
            style={{ height: 'auto' }}
        />
    );
}
