import {
  LayoutDashboard,
  TerminalSquare,
  Bot,
  Layers,
  Building2,
  BarChart3,
  ListChecks,
  History,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WindowId } from './osStore';

export interface V3AppMeta {
  name: string;
  arrivesScreen: number;
  blurb: string;
  icon: LucideIcon;
}

/** Window/app registry — names, icons, blurbs, and the screen where each app's real content lands. */
export const V3_APP_META: Record<WindowId, V3AppMeta> = {
  home: { name: 'Home', arrivesScreen: 1, blurb: 'Status & quick starts.', icon: LayoutDashboard },
  launchpad: { name: 'Launchpad', arrivesScreen: 2, blurb: 'Pick a category or agent, or describe the task.', icon: TerminalSquare },
  agents: { name: 'Agents', arrivesScreen: 4, blurb: 'Contextual roster. Pick one to run it.', icon: Bot },
  assignments: { name: 'Assignments & Tasks', arrivesScreen: 5, blurb: 'In-progress, routing, review.', icon: Layers },
  hub: { name: 'Agency Hub', arrivesScreen: 7, blurb: 'Workspaces, team, billing, settings.', icon: Building2 },
  reports: { name: 'Artefacts', arrivesScreen: 6, blurb: 'Needs review, gallery, analytics.', icon: BarChart3 },
  tasks: { name: 'Tasks', arrivesScreen: 5, blurb: 'Route work to agents or humans.', icon: ListChecks },
  history: { name: 'History', arrivesScreen: 6, blurb: 'All work, searchable.', icon: History },
};
