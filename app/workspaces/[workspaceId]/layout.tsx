'use client';

import { useParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home,
  LayoutDashboard,
  Search,
  FileText,
  Share2,
  Rocket,
  Settings,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  Clock,
  BarChart3,
  PieChart,
  Megaphone,
  Mail,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { UserMenu } from '@/components/layout/UserMenu';
import { workspaceService } from '@/lib/services/workspaceService';
import type { Workspace } from '@/lib/types/workspace.types';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const workspaceId = params.workspaceId as string;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightRailOpen, setRightRailOpen] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspace data from API
  useEffect(() => {
    async function fetchWorkspace() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await workspaceService.getWorkspace(workspaceId);
        setWorkspace(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace');
      } finally {
        setIsLoading(false);
      }
    }
    if (workspaceId) {
      fetchWorkspace();
    }
  }, [workspaceId]);

  const modules = [
    { id: 'mission-control', name: 'Mission Control', icon: LayoutDashboard, path: `/workspaces/${workspaceId}/mission-control`, activeThreads: 0 },
    { id: 'seo-cluster', name: 'SEO Cluster', icon: Search, path: `/workspaces/${workspaceId}/modules/seo-cluster`, activeThreads: 0 },
    { id: 'content-factory', name: 'Content Factory', icon: FileText, path: `/workspaces/${workspaceId}/modules/content-factory`, activeThreads: 0 },
    { id: 'social-growth', name: 'Social Growth', icon: Share2, path: `/workspaces/${workspaceId}/modules/social-growth`, activeThreads: 0 },
    { id: 'saas-launch', name: 'SaaS Launch Ops', icon: Rocket, path: `/workspaces/${workspaceId}/modules/saas-launch-ops`, activeThreads: 0 },
    { id: 'biz-audit', name: 'Business Audit', icon: BarChart3, path: `/workspaces/${workspaceId}/modules/business-audit`, activeThreads: 0 },
    { id: 'analytics', name: 'Analytics Action', icon: PieChart, path: `/workspaces/${workspaceId}/modules/analytics-action`, activeThreads: 0 },
    { id: 'ads', name: 'Ads Execution', icon: Megaphone, path: `/workspaces/${workspaceId}/modules/ads-execution`, activeThreads: 0 },
    { id: 'email', name: 'Email Nurture', icon: Mail, path: `/workspaces/${workspaceId}/modules/email-nurture`, activeThreads: 0 },
    { id: 'brand', name: 'Brand Guardrails', icon: ShieldAlert, path: `/workspaces/${workspaceId}/modules/brand-guardrails`, activeThreads: 0 },
  ];

  const activeModule = modules.find(m => pathname.includes(m.path)) || modules[0];

  const NavItem = ({
    name,
    icon: Icon,
    path,
    activeThreads,
    isActive
  }: {
    name: string;
    icon: any;
    path: string;
    activeThreads: number;
    isActive: boolean;
  }) => (
    <Link
      href={path}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
        isActive
          ? 'bg-primary-500/10 text-primary-600'
          : 'text-neutral-600 hover:bg-neutral-100'
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{name}</span>
      {activeThreads > 0 && (
        <Badge variant={isActive ? 'primary' : 'ghost'}>
          {activeThreads}
        </Badge>
      )}
    </Link>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen bg-neutral-50 overflow-hidden">
        <WorkspaceSwitcher />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !workspace) {
    return (
      <div className="flex h-screen bg-neutral-50 overflow-hidden">
        <WorkspaceSwitcher />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-neutral-500 mb-2">Unable to load workspace</p>
            <p className="text-sm text-neutral-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Workspace Switcher (Discord Style) */}
      <WorkspaceSwitcher />

      {/* Left Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-neutral-200 bg-white transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        {/* Workspace Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold shadow-sm">
              {(workspace.name || 'W').charAt(0)}
            </div>
            <div>
              <h1 className="font-semibold text-neutral-900 leading-tight">{workspace.name || 'Untitled Workspace'}</h1>
              {workspace.websiteDomain && (
                <span className="text-xs text-neutral-500">{workspace.websiteDomain}</span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <ChevronLeft className="h-4 w-4 text-primary-600" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {modules.map((module) => (
            <NavItem
              key={module.id}
              {...module}
              isActive={pathname.includes(module.path)}
            />
          ))}
        </nav>

        {/* Workspace Settings */}
        <div className="p-3 border-t border-neutral-200">
          <NavItem
            name="Settings"
            icon={Settings}
            path={`/workspaces/${workspaceId}/settings`}
            activeThreads={0}
            isActive={pathname.includes('/settings')}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-200">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <ChevronRight className="h-4 w-4 text-primary-600" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <Link href={`/workspaces/${workspaceId}/mission-control`} className="text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors">
                Marketing OS
              </Link>
              <span className="text-neutral-300">/</span>
              <Link
                href={activeModule.path}
                className="text-sm font-semibold text-neutral-900 hover:text-neutral-700 transition-colors"
              >
                {activeModule.name}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <UserMenu />
            {!rightRailOpen && (
              <Button variant="ghost" size="icon" onClick={() => setRightRailOpen(true)}>
                <ChevronLeft className="h-4 w-4 text-primary-600" />
              </Button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <aside
        className={cn(
          'flex flex-col border-l border-neutral-200 bg-white transition-all duration-300 overflow-hidden',
          rightRailOpen ? 'w-80' : 'w-0'
        )}
      >
        <div className={cn("flex flex-col h-full w-80", !rightRailOpen && "invisible")}>
          {/* Right Rail Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900">System Intelligence</h3>
            <Button variant="ghost" size="icon" onClick={() => setRightRailOpen(false)}>
              <ChevronRight className="h-4 w-4 text-primary-600" />
            </Button>
          </div>

          {/* Workspace Info */}
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Workspace</h3>
            <div className="space-y-1">
              <p className="text-xs text-neutral-500">
                <span className="font-medium text-neutral-700">Name:</span> {workspace.name || 'Untitled'}
              </p>
              {workspace.websiteDomain && (
                <p className="text-xs text-neutral-500">
                  <span className="font-medium text-neutral-700">Domain:</span> {workspace.websiteDomain}
                </p>
              )}
              <p className="text-xs text-neutral-500">
                <span className="font-medium text-neutral-700">Created:</span> {new Date(workspace.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
