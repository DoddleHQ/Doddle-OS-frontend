export interface DemoRoute {
  path: string;
  label: string;
  icon: string;
}

export function buildDemoRoutes(workspaceId: string): DemoRoute[] {
  return [
    { path: `/workspaces/${workspaceId}`, label: 'dashboard', icon: 'layout-dashboard' },
    { path: `/workspaces/${workspaceId}/launchpad`, label: 'launchpad', icon: 'terminal' },
    { path: `/workspaces/${workspaceId}/power-agents`, label: 'Power Agents', icon: 'zap' },
    { path: `/workspaces/${workspaceId}/graphs`, label: 'graphs', icon: 'folder-tree' },
    { path: `/workspaces/${workspaceId}/agency-hub`, label: 'Agency Hub', icon: 'building-2' },
    { path: `/workspaces/${workspaceId}/settings`, label: 'Platform Settings', icon: 'settings' },
  ];
}
