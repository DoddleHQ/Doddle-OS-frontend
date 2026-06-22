'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useWorkspaces } from '@/lib/contexts/WorkspaceContext';
import { useAuth } from '@/lib/contexts/AuthContext';
import { RootPageUserMenu } from '@/components/layout/RootPageUserMenu';
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal';
import {
  ArrowRight,
  Zap,
  Shield,
  Cpu,
  Sparkles,
  Loader2,
  Rocket,
  Users,
  Link as LinkIcon,
} from 'lucide-react';

export default function RootPage() {
  const { workspaces, isLoading, error } = useWorkspaces();
  const auth = useAuth();
  const isAuthenticated = auth.status === 'authenticated';
  const orgName = auth.status === 'authenticated' ? auth.org.orgName : null;
  const [showCreateModal, setShowCreateModal] = useState(false);

  const hasWorkspaces = workspaces.length > 0;
  const primaryWorkspace = workspaces[0] || null;

  return (
    <main className="min-h-screen bg-[#030303] text-white selection:bg-primary-500/30 overflow-hidden relative">
      {/* User Menu — top right */}
      <div className="absolute top-4 right-6 z-50">
        <RootPageUserMenu />
      </div>

      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-primary-900/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-secondary-900/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12 min-h-screen flex flex-col items-center justify-center">
        {/* Hero Section */}
        <div className="text-center space-y-8 mb-16 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md animate-fade-in">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <span className="text-xs font-bold tracking-widest uppercase">Agentic Marketing OS v1.0</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
                ENGINEERING THE <br /> FUTURE OF GROWTH
            </h1>

            <p className="text-xl text-neutral-400 max-w-2xl mx-auto font-medium">
                Deploy an autonomous workforce of specialized AI agents. Audit, optimize, and execute marketing maneuvers at scale.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                {isAuthenticated && hasWorkspaces && primaryWorkspace && (
                    <Link href={`/workspaces/${primaryWorkspace.workspaceId}`}>
                        <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-primary-600 hover:bg-primary-500 transition-all font-bold">
                            Enter Agentic OS
                            <ArrowRight className="w-6 h-6 ml-2" />
                        </Button>
                    </Link>
                )}
                {isAuthenticated && !hasWorkspaces && !isLoading && (
                    <Button
                        size="lg"
                        onClick={() => setShowCreateModal(true)}
                        className="h-14 px-10 text-lg rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-primary-600 hover:bg-primary-500 transition-all font-bold"
                    >
                        <Rocket className="w-5 h-5 mr-2" />
                        Create Your First Workspace
                    </Button>
                )}
                {isLoading && (
                    <Button size="lg" disabled className="h-14 px-10 text-lg rounded-full">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Loading...
                    </Button>
                )}
                {!isAuthenticated && (
                    <Link href="/login">
                        <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-primary-600 hover:bg-primary-500 transition-all font-bold">
                            Sign In to Get Started
                            <ArrowRight className="w-6 h-6 ml-2" />
                        </Button>
                    </Link>
                )}
            </div>
        </div>

        {/* Empty State for Authenticated Users Without Workspaces */}
        {isAuthenticated && !hasWorkspaces && !isLoading && (
            <div className="w-full max-w-2xl mx-auto mb-16">
                <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                        <Rocket className="w-8 h-8 text-primary-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Welcome{orgName ? `, ${orgName}` : ''}!</h3>
                    <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                        You don't have any workspaces yet. Create your first workspace to start deploying AI agents for your marketing operations.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="rounded-full"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Create Workspace
                        </Button>
                        {error && (
                            <p className="text-sm text-neutral-600">{error}</p>
                        )}
                    </div>

                    {/* Getting Started Steps */}
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center mb-3">
                                <Rocket className="w-4 h-4 text-primary-400" />
                            </div>
                            <h4 className="font-semibold text-sm mb-1">1. Create Workspace</h4>
                            <p className="text-xs text-neutral-500">Set up a strategic unit for your brand or client.</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center mb-3">
                                <Users className="w-4 h-4 text-primary-400" />
                            </div>
                            <h4 className="font-semibold text-sm mb-1">2. Invite Team</h4>
                            <p className="text-xs text-neutral-500">Add collaborators via invite links with role-based access.</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center mb-3">
                                <Cpu className="w-4 h-4 text-primary-400" />
                            </div>
                            <h4 className="font-semibold text-sm mb-1">3. Deploy Agents</h4>
                            <p className="text-xs text-neutral-500">Activate AI agents for SEO, content, social, and more.</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Feature Grid - Modern Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {[
                { icon: Cpu, title: 'Multi-Agent Logic', desc: 'Conflict resolution & logic chain verification.' },
                { icon: Zap, title: 'Real-time Maneuvers', desc: 'Automated execution based on live market data.' },
                { icon: Shield, title: 'Brand Guardrails', desc: 'Hardware-level compliance and safety protocols.' },
            ].map((feature, i) => (
                <div key={i} className="group p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-sm hover:bg-white/[0.06] transition-all hover:border-primary-500/50">
                    <feature.icon className="w-10 h-10 text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-neutral-500 font-medium leading-relaxed">{feature.desc}</p>
                </div>
            ))}
        </div>

        {/* Workspace Quick Switch Preview */}
        {hasWorkspaces && (
            <div className="mt-24 pt-12 border-t border-white/5 w-full text-center">
                <p className="text-sm font-bold tracking-widest uppercase text-neutral-600 mb-8">Active Strategic Units</p>
                <div className="flex flex-wrap justify-center gap-4">
                    {workspaces.map((w) => (
                        <Link key={w.workspaceId} href={`/workspaces/${w.workspaceId}`}>
                            <div className="px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary-500/30 hover:bg-white/5 transition-all text-neutral-500 hover:text-white cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-success-500 group-hover:animate-ping" />
                                    <span className="font-bold">{w.name || 'Untitled'}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </main>
  );
}
