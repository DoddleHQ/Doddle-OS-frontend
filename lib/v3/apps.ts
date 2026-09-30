import type { WindowId } from './osStore';

export interface V3AppMeta {
  name: string;
  arrivesScreen: number;
  blurb: string;
}

/** Window/app registry — names, blurbs, and the screen where each app's real content lands. */
export const V3_APP_META: Record<WindowId, V3AppMeta> = {
  home: { name: 'Home', arrivesScreen: 1, blurb: 'Status & quick starts.' },
  launchpad: { name: 'Launchpad', arrivesScreen: 2, blurb: 'Pick a category or agent, or describe the task.' },
  agents: { name: 'Agents', arrivesScreen: 4, blurb: 'Contextual roster. Pick one to run it.' },
  assignments: { name: 'Assignments & Tasks', arrivesScreen: 5, blurb: 'In-progress, routing, review.' },
  hub: { name: 'Agency Hub', arrivesScreen: 7, blurb: 'Workspaces, team, billing, settings.' },
  reports: { name: 'Artefacts', arrivesScreen: 6, blurb: 'Needs review, gallery, analytics.' },
  tasks: { name: 'Tasks', arrivesScreen: 5, blurb: 'Route work to agents or humans.' },
  history: { name: 'History', arrivesScreen: 6, blurb: 'All work, searchable.' },
};
