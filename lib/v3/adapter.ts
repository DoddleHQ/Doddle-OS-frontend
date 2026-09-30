import type { LucideIcon } from 'lucide-react';
import {
  SEED_AGENTS,
  SEED_CATEGORIES,
  SEED_REVIEW,
  SEED_SPARK,
  SEED_WORKSPACES,
  OPERATOR_FIRST_NAME,
  SEED_ACTIVE_THREAD,
} from './seed';

export type V3Workspace = { id: string; name: string; icon: LucideIcon };
export type V3Agent = { handle: string; name: string; role: string; icon: LucideIcon; color: string; desc: string };
export type V3Category = {
  id: 'research' | 'site-audit' | 'data' | 'content' | 'ads' | 'social' | 'brand';
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
};
export type V3ActiveThread = { title: string; step: string; progress: number };
export type V3ReviewItem = { id: string; kind: 'APPROVAL_REQ'; title: string; body: string; preview: string };

export interface V3DataAdapter {
  getWorkspaces(): V3Workspace[];
  getCurrentWorkspaceId(): string;
  getAgents(): V3Agent[];
  getCategories(): V3Category[];
  getActiveThread(): V3ActiveThread | null;
  getSparkSeries(): number[];
  getReviewQueue(): V3ReviewItem[];
}

/** Screen-scoped mock: real product entities, swap for live services per screen later. */
export const v3Data: V3DataAdapter = {
  getWorkspaces: () => SEED_WORKSPACES,
  getCurrentWorkspaceId: () => SEED_WORKSPACES[0].id,
  getAgents: () => SEED_AGENTS,
  getCategories: () => SEED_CATEGORIES,
  getActiveThread: () => SEED_ACTIVE_THREAD,
  getSparkSeries: () => SEED_SPARK,
  getReviewQueue: () => SEED_REVIEW,
};

export { OPERATOR_FIRST_NAME };
