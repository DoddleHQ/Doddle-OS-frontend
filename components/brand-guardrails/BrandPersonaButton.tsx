'use client';

import Link from 'next/link';

interface BrandPersonaButtonProps {
    workspaceId: string;
}

export function BrandPersonaButton({ workspaceId }: BrandPersonaButtonProps) {
    return (
        <Link
            href={`/workspaces/${workspaceId}/modules/brand-guardrails/brand-persona/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors"
        >
            Generate Brand Persona
        </Link>
    );
}
