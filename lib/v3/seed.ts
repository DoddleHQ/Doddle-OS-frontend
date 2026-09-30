/*
 * Screen-scoped demo values that have no real API yet (triage queue lands with
 * the Artefacts screen; spark series is decorative telemetry). Workspaces,
 * agents, and threads come from lib/v3/data.ts — the real services.
 */

export const SEED_SPARK: number[] = [4, 6, 5, 9, 7, 11, 8, 12, 10, 14, 12, 16, 13, 18, 15, 19, 17, 21];

export interface V3ReviewItem {
  id: string;
  kind: 'APPROVAL_REQ';
  title: string;
  body: string;
  preview: string;
}

/** Demo triage item — replaced by real review state in the Artefacts screen. */
export const SEED_REVIEW: V3ReviewItem[] = [
  {
    id: 'rv1',
    kind: 'APPROVAL_REQ',
    title: 'Q4 Landing Page — hero draft',
    body: '@Content_Architect drafted the hero section. Approve to open the review flow.',
    preview: '<section class="hero">…Ship agents, not chores…</section>',
  },
];
