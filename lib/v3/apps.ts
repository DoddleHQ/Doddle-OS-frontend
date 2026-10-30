import {
  LayoutDashboard,
  TerminalSquare,
  BookOpen,
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
  chip?: string;
}

export const V3_APP_META: Record<WindowId, V3AppMeta> = {
  home: { name: 'Home', arrivesScreen: 1, blurb: 'Status & quick starts.', icon: LayoutDashboard },
  launchpad: { name: 'Launchpad', arrivesScreen: 2, blurb: 'Pick a category or agent, or describe the task.', icon: TerminalSquare, chip: 'choose to begin' },
  blueprints: { name: 'Blueprints', arrivesScreen: 2, blurb: 'The library: layers of strategy, structure, execution, review.', icon: BookOpen },
  agents: { name: 'Contextual Agents', arrivesScreen: 4, blurb: 'Active · idle · unused.', icon: Bot, chip: 'active · idle · unused' },
  assignments: { name: 'Assignments & Tasks', arrivesScreen: 5, blurb: 'In-progress, routing, review.', icon: Layers, chip: 'fizzy board · ⌘4' },
  hub: { name: 'Agency Hub', arrivesScreen: 7, blurb: 'Workspaces, team, billing, settings.', icon: Building2 },
  reports: { name: 'Triage', arrivesScreen: 6, blurb: 'Review queue, conversation, decision.', icon: BarChart3 },
  tasks: { name: 'Tasks', arrivesScreen: 5, blurb: 'Route work to agents or humans.', icon: ListChecks },
  history: { name: 'Reports', arrivesScreen: 6, blurb: 'Artefacts gallery, searchable.', icon: History },
};
