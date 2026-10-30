'use client';

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
