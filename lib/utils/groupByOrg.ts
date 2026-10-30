import type { Workspace } from '@/lib/types/workspace.types';

export interface OrgGroup {
  organizationId: string;
  organizationName: string;
  workspaces: Workspace[];
}

export function groupWorkspacesByOrg(workspaces: Workspace[]): OrgGroup[] {
  const byId = new Map<string, OrgGroup>();
  for (const ws of workspaces) {
    const id = ws.organizationId || 'unknown';
    let group = byId.get(id);
    if (!group) {
      group = {
        organizationId: id,
        organizationName: ws.organizationName || 'Workspace',
        workspaces: [],
      };
      byId.set(id, group);
    }
    group.workspaces.push(ws);
  }
  const groups = [...byId.values()];
  groups.sort((a, b) => a.organizationName.localeCompare(b.organizationName));
  for (const g of groups) {
    g.workspaces.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  return groups;
}
