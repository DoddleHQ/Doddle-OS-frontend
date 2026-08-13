'use client';

import { useParams } from 'next/navigation';
import { OnboardingDesk } from '@/components/v2/onboarding/OnboardingDesk';

/*
 * /workspaces/{workspaceId}/brand-persona — in-workspace brand persona setup.
 *
 * Renders the brand_persona_generator graph flow inside the workspace shell
 * (InstrumentShell via the [workspaceId] layout). The OnboardingDesk runs in
 * "workspace-scoped" mode — it saves the generated persona via PUT instead of
 * creating a new workspace.
 *
 * This is surfaced as a setup action on the workspace landing page when no
 * brand persona exists yet.
 */

export default function BrandPersonaPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;

    return <OnboardingDesk workspaceId={workspaceId} />;
}
