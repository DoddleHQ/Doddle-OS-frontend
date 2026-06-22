'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { Loader2, Rocket, Globe, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
    const router = useRouter();
    const { createWorkspace } = useWorkspaces();

    const [name, setName] = useState('');
    const [websiteDomain, setWebsiteDomain] = useState('');
    const [creating, setCreating] = useState(false);
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Please enter a workspace name');
            return;
        }

        try {
            setCreating(true);
            const workspace = await createWorkspace(name.trim(), websiteDomain.trim() || undefined);
            setCreatedWorkspaceId(workspace.workspaceId);
            setStep('success');
            toast.success('Workspace created successfully!');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to create workspace');
        } finally {
            setCreating(false);
        }
    };

    const handleGoToWorkspace = () => {
        if (createdWorkspaceId) {
            router.push(`/workspaces/${createdWorkspaceId}`);
        }
        handleClose();
    };

    const handleClose = () => {
        setStep('form');
        setName('');
        setWebsiteDomain('');
        setCreatedWorkspaceId(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            {step === 'form' ? (
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">Create New Workspace</h2>
                            <p className="text-sm text-neutral-500">Set up a strategic unit for your marketing operations</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                Workspace Name <span className="text-error">*</span>
                            </label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., TechStart, Brand Launch Q3"
                                disabled={creating}
                                autoFocus
                            />
                            <p className="text-xs text-neutral-400 mt-1">
                                A descriptive name for your workspace. You can change this later.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                Website Domain <span className="text-neutral-400">(optional)</span>
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <Input
                                    value={websiteDomain}
                                    onChange={(e) => setWebsiteDomain(e.target.value)}
                                    placeholder="example.com"
                                    disabled={creating}
                                    className="pl-9"
                                />
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">
                                The primary website domain for this workspace. This cannot be changed after creation.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={creating}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={creating || !name.trim()}
                                className="flex-1"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Create Workspace
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-success-600" />
                    </div>
                    <h2 className="text-xl font-bold text-neutral-900 mb-2">Workspace Created!</h2>
                    <p className="text-neutral-500 mb-6">
                        Your workspace <strong>{name}</strong> is ready. Let's start configuring your marketing operations.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1"
                        >
                            Go to Dashboard
                        </Button>
                        <Button
                            onClick={handleGoToWorkspace}
                            className="flex-1"
                        >
                            <Rocket className="w-4 h-4 mr-2" />
                            Open Workspace
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
