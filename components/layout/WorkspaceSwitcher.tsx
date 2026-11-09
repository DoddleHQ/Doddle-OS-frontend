'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal';
import { cn } from '@/lib/utils';
import {
    Plus,
    Compass,
    Zap,
    Loader2,
    Inbox,
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui';

export function WorkspaceSwitcher() {
    const params = useParams();
    const currentWorkspaceId = params.workspaceId as string;
    const { workspaces, isLoading } = useWorkspaces();
    const [showCreateModal, setShowCreateModal] = useState(false);

    return (
        <TooltipProvider delayDuration={0}>
            <aside className="w-[72px] flex flex-col items-center py-3 gap-2 bg-neutral-900 h-screen border-r border-neutral-800">
                <Link href="/">
                    <WorkspaceButton
                        icon={<Zap className="w-6 h-6" />}
                        label="Agentic OS Home"
                        isActive={!currentWorkspaceId}
                    />
                </Link>
                <div className="w-8 h-[2px] bg-neutral-800 rounded-full mx-auto my-1" />

                {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
                    </div>
                ) : workspaces.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-12 h-12 flex items-center justify-center rounded-[24px] bg-neutral-800 text-neutral-500">
                                    <Inbox className="w-5 h-5" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={12} className="bg-black text-white border-neutral-800 px-3 py-1 font-bold">
                                No workspaces yet
                            </TooltipContent>
                        </Tooltip>
                    </div>
                ) : (
                    workspaces.map((workspace) => (
                        <Link
                            key={workspace.workspaceId}
                            href={`/legacy/workspaces/${workspace.workspaceId}`}
                        >
                            <WorkspaceButton
                                label={workspace.name || 'Untitled'}
                                isActive={currentWorkspaceId === workspace.workspaceId}
                                initials={(workspace.name || 'W').substring(0, 2).toUpperCase()}
                            />
                        </Link>
                    ))
                )}

                <div className="mt-auto flex flex-col gap-2 pb-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className="relative flex items-center group cursor-pointer"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <div className="w-12 h-12 flex items-center justify-center rounded-[24px] group-hover:rounded-[16px] bg-neutral-800 text-success-500 group-hover:bg-success-600 group-hover:text-white transition-all duration-200">
                                    <Plus className="w-6 h-6" />
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={12} className="bg-black text-white border-neutral-800 px-3 py-1 font-bold">
                            New Workspace
                        </TooltipContent>
                    </Tooltip>
                    <WorkspaceButton
                        icon={<Compass className="w-6 h-6" />}
                        label="Explore Agents"
                        variant="action"
                    />
                </div>
            </aside>

            <CreateWorkspaceModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />
        </TooltipProvider>
    );
}

function WorkspaceButton({
    label,
    isActive,
    initials,
    icon,
    variant = 'workspace'
}: {
    label: string;
    isActive?: boolean;
    initials?: string;
    icon?: React.ReactNode;
    variant?: 'workspace' | 'action'
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="relative flex items-center group cursor-pointer">
                    <div className={cn(
                        "absolute -left-3 w-1 bg-white rounded-r-full transition-all duration-200",
                        isActive ? "h-10" : "h-0 group-hover:h-5"
                    )} />

                    <div className={cn(
                        "w-12 h-12 flex items-center justify-center transition-all duration-200",
                        variant === 'workspace'
                            ? cn(
                                "rounded-[24px] group-hover:rounded-[16px]",
                                isActive ? "rounded-[16px] bg-primary-600 text-white" : "bg-neutral-800 text-neutral-400 group-hover:bg-primary-600 group-hover:text-white"
                            )
                            : "rounded-[24px] group-hover:rounded-[16px] bg-neutral-800 text-success-500 group-hover:bg-success-600 group-hover:text-white"
                    )}>
                        {icon || <span className="text-sm font-bold">{initials}</span>}
                    </div>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="bg-black text-white border-neutral-800 px-3 py-1 font-bold">
                {label}
            </TooltipContent>
        </Tooltip>
    );
}
