export interface DemoRoute {
  path: string;
  label: string;
  icon: string;
}

export function buildDemoRoutes(workspaceId: string): DemoRoute[] {
  return [
    { path: `/legacy/workspaces/${workspaceId}`, label: 'dashboard', icon: 'layout-dashboard' },
    { path: `/legacy/workspaces/${workspaceId}/launchpad`, label: 'launchpad', icon: 'terminal' },
    { path: `/legacy/workspaces/${workspaceId}/power-agents`, label: 'Power Agents', icon: 'zap' },
    { path: `/legacy/workspaces/${workspaceId}/graphs`, label: 'graphs', icon: 'folder-tree' },
    { path: `/legacy/workspaces/${workspaceId}/agency-hub`, label: 'Agency Hub', icon: 'building-2' },
    { path: `/legacy/workspaces/${workspaceId}/settings`, label: 'Platform Settings', icon: 'settings' },
  ];
}
