/**
 * Debug logging gated behind NEXT_PUBLIC_DEBUG_STREAMING.
 *
 * The LangGraph streaming layer carries dozens of diagnostic logs that are
 * invaluable when diagnosing backend/HITL issues but noisy in a production
 * console. Route them through here so they stay silent unless explicitly
 * enabled via NEXT_PUBLIC_DEBUG_STREAMING=true.
 *
 * `console.error` / `console.warn` are intentionally NOT gated — those
 * signal real failures and should always surface.
 */

const STREAMING_DEBUG =
    process.env.NEXT_PUBLIC_DEBUG_STREAMING === 'true';

/**
 * Log a debug message only when streaming debug is enabled.
 * Accepts the same args as console.log.
 */
export function debugLog(...args: unknown[]): void {
    if (STREAMING_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(...args);
    }
}
