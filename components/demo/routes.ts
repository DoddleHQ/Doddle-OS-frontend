/**
 * Workspace route definitions for the demo OS interface.
 * Built dynamically from a workspaceId so every navigation surface
 * (dock, palette, keyboard shortcuts) shares the same path builder.
 *
 * The demo interface IS the workspace interface now — these paths
 * live under /workspaces/{id}/* alongside the legacy module routes
 * (modules/*, mission-control, brand-persona) which remain accessible.
 */

export interface DemoRoute {
  path: string;
  label: string;
  icon: string;
}

export function buildDemoRoutes(workspaceId: string): DemoRoute[] {
  return [
    { path: `/workspaces/${workspaceId}`, label: 'dashboard', icon: 'layout-dashboard' },
    { path: `/workspaces/${workspaceId}/launchpad`, label: 'launchpad', icon: 'terminal' },
    { path: `/workspaces/${workspaceId}/power-agents`, label: 'power_agents', icon: 'zap' },
    { path: `/workspaces/${workspaceId}/graphs`, label: 'graphs', icon: 'folder-tree' },
    { path: `/workspaces/${workspaceId}/agency-hub`, label: 'agency_hub', icon: 'building-2' },
    { path: `/workspaces/${workspaceId}/settings`, label: 'platform_settings', icon: 'settings' },
  ];
}
