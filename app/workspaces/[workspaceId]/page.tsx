'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { workspaceService } from '@/lib/services/workspaceService';
import type { Workspace } from '@/lib/types/workspace.types';
import { Activity, Zap, Users, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkspace() {
      try {
        setLoading(true);
        setError(null);
        const data = await workspaceService.getWorkspace(workspaceId);
        setWorkspace(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace');
      } finally {
        setLoading(false);
      }
    }
    if (workspaceId) {
      fetchWorkspace();
    }
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load workspace</h3>
          <p className="text-muted-foreground mb-4">{error || 'Unknown error occurred'}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{workspace.name || 'Untitled Workspace'}</h1>
          <p className="text-neutral-600 mt-1">
            {workspace.websiteDomain || 'No domain configured'}
          </p>
        </div>
        <Badge variant="success" withDot>
          Active
        </Badge>
      </div>

      {/* Workspace Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary-500" />
              <div>
                <p className="text-sm text-neutral-500">Created</p>
                <p className="font-semibold text-neutral-900">
                  {new Date(workspace.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary-500" />
              <div>
                <p className="text-sm text-neutral-500">Domain</p>
                <p className="font-semibold text-neutral-900">
                  {workspace.websiteDomain || 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary-500" />
              <div>
                <p className="text-sm text-neutral-500">Last Updated</p>
                <p className="font-semibold text-neutral-900">
                  {workspace.updatedAt
                    ? new Date(workspace.updatedAt).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Available Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href={`/workspaces/${workspaceId}/mission-control`}>
              <Card className="hover:border-primary-500 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="font-semibold">Mission Control</div>
                  <div className="text-sm text-neutral-600 mt-1">Dashboard & Operations</div>
                  <div className="mt-3">
                    <Badge variant="secondary" size="sm">Live</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/workspaces/${workspaceId}/modules/seo-cluster`}>
              <Card className="hover:border-primary-500 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="font-semibold">SEO Cluster</div>
                  <div className="text-sm text-neutral-600 mt-1">Technical SEO & Crawl</div>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/workspaces/${workspaceId}/modules/content-factory`}>
              <Card className="hover:border-primary-500 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="font-semibold">Content Factory</div>
                  <div className="text-sm text-neutral-600 mt-1">Content Strategy</div>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/workspaces/${workspaceId}/modules/social-growth`}>
              <Card className="hover:border-primary-500 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="font-semibold">Social Growth</div>
                  <div className="text-sm text-neutral-600 mt-1">Viral & Trends</div>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/workspaces/${workspaceId}/modules/saas-launch-ops`}>
              <Card className="hover:border-primary-500 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="font-semibold">SaaS Launch Ops</div>
                  <div className="text-sm text-neutral-600 mt-1">Launch Readiness</div>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/workspaces/${workspaceId}/settings`}>
              <Card className="hover:border-primary-500 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="font-semibold">Settings</div>
                  <div className="text-sm text-neutral-600 mt-1">Config & Integrations</div>
                  <div className="mt-3">
                    <Badge variant="ghost" size="sm">Manage</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Link href={`/workspaces/${workspaceId}/mission-control`}>
              <Button variant="outline" className="w-full justify-between">
                <span>Go to Mission Control</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/workspaces/${workspaceId}/settings`}>
              <Button variant="outline" className="w-full justify-between">
                <span>Manage Settings</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
