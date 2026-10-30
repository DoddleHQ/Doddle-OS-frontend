const STREAMING_DEBUG =
    process.env.NEXT_PUBLIC_DEBUG_STREAMING === 'true';

export function debugLog(...args: unknown[]): void {
    if (STREAMING_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(...args);
    }
}
