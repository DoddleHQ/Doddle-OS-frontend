/**
 * Demo route definitions, workspace-scoped.
 * Built dynamically from a workspaceId so every navigation surface
 * (dock, palette, keyboard shortcuts) shares the same path builder.
 */

export interface DemoRoute {
  path: string;
  label: string;
  icon: string;
}

export function buildDemoRoutes(workspaceId: string): DemoRoute[] {
  return [
    { path: `/demo/${workspaceId}`, label: 'dashboard', icon: 'layout-dashboard' },
    { path: `/demo/${workspaceId}/launchpad`, label: 'launchpad', icon: 'terminal' },
    { path: `/demo/${workspaceId}/power-agents`, label: 'power_agents', icon: 'zap' },
    { path: `/demo/${workspaceId}/graphs`, label: 'graphs', icon: 'folder-tree' },
    { path: `/demo/${workspaceId}/agency-hub`, label: 'agency_hub', icon: 'building-2' },
    { path: `/demo/${workspaceId}/settings`, label: 'platform_settings', icon: 'settings' },
  ];
}
