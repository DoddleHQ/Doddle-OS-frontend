'use client';

import { useParams } from 'next/navigation';
import { OnboardingDesk } from '@/components/v2/onboarding/OnboardingDesk';

export default function BrandPersonaPage() {
    const params = useParams();
    const workspaceId = params.workspaceId as string;

    return <OnboardingDesk workspaceId={workspaceId} />;
}
