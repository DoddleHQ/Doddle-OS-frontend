/**
 * Shared v2 motion constants.
 *
 * The v2 design system uses two easing curves deliberately:
 * - PREMIUM_EASE (Material standard): balanced in/out for UI state changes,
 *   card materialization, and micro-interactions. Used across onboarding.
 * - DISPLAY_EASE: a longer ease-out for large-scale entrances (hero reveals,
 *   section transitions, dashboard drawers) where content should decelerate
 *   into its resting position.
 *
 * Both are `as const` so TS infers a readonly tuple, which framer-motion /
 * motion accept for the `ease` transition property.
 */

/** Material standard ease — balanced in/out. cubic-bezier(0.4, 0, 0.2, 1). */
export const PREMIUM_EASE = [0.4, 0, 0.2, 1] as const;

/** Display ease-out — longer deceleration. cubic-bezier(0.16, 1, 0.3, 1). */
export const DISPLAY_EASE = [0.16, 1, 0.3, 1] as const;
