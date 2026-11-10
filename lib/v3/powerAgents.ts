'use client';

import type { LucideIcon } from 'lucide-react';
import { DEMO_AGENTS, demoSessions } from '@/lib/v3/demoData';
import {
  Bot,
  Server,
  PenTool,
  Sparkles,
  FolderTree,
  Activity,
  Database,
  Layers,
  Shield,
  LayoutDashboard,
  Terminal,
  TerminalSquare,
  ShoppingBag,
  Globe,
  GitBranch,
} from 'lucide-react';

export type V3Suite = 'SEO Audit Suite' | 'Website Content Suite' | 'DevOps Suite' | 'Shopify Suite' | 'WordPress Suite' | 'GitOps Suite';

export interface V3Agent {
  key: string;
  assistantId: string;
  name: string;
  role: string;
  handle: string;
  suite: V3Suite;
  icon: LucideIcon;
}

export interface V3Session {
  id: string;
  title: string;
  agentKey: string | null;
  triageStatus?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const ROLES: Record<string, { name: string; role: string; icon: LucideIcon }> = {
  crawlability_audit: { name: 'Crawlability', role: 'Crawler & Indexer', icon: Bot },
  technical_foundations_audit: { name: 'Tech Foundations', role: 'Infra & Security', icon: Server },
  on_page_audit: { name: 'On-Page', role: 'Meta & Content Elements', icon: PenTool },
  content_quality_audit: { name: 'Content Quality', role: 'Readability & Depth', icon: Sparkles },
  site_structure_audit: { name: 'Site Structure', role: 'Links & Hierarchy', icon: FolderTree },
  performance_audit: { name: 'Performance', role: 'Lighthouse & Vitals', icon: Activity },
  product_content: { name: 'Product', role: 'PDP Copywriter', icon: Database },
  category_content: { name: 'Category', role: 'PLP Copywriter', icon: Layers },
  collection_content: { name: 'Collection', role: 'Curation Copywriter', icon: Bot },
  brand_content: { name: 'Brand', role: 'Trust & Identity', icon: Shield },
  home_content: { name: 'Home', role: 'Homepage Copywriter', icon: LayoutDashboard },
  custom_page_content: { name: 'Custom', role: 'Any Page Type', icon: Terminal },
  devops_agent: { name: 'DevOps', role: 'SSH Operator & Fixer', icon: TerminalSquare },
  shopify_agent: { name: 'Shopify', role: 'Store Manager & Content', icon: ShoppingBag },
  wordpress_agent: { name: 'WordPress', role: 'Site Manager & Content', icon: Globe },
  gitops_agent: { name: 'GitOps', role: 'Repository Manager', icon: GitBranch },
};

const SUITE_OF: Partial<Record<V3Suite, string>> & Record<string, V3Suite> = {
  _content: 'Website Content Suite',
  devops: 'DevOps Suite',
  shopify: 'Shopify Suite',
  wordpress: 'WordPress Suite',
  gitops: 'GitOps Suite',
} as Record<string, V3Suite>;

export const SUITE_TINT: Record<V3Suite, { color: string; bg: string }> = {
  'SEO Audit Suite': { color: 'var(--violet)', bg: 'color-mix(in srgb, var(--violet) 16%, transparent)' },
  'Website Content Suite': { color: 'var(--pink)', bg: 'color-mix(in srgb, var(--pink) 16%, transparent)' },
  'DevOps Suite': { color: 'var(--cyan)', bg: 'color-mix(in srgb, var(--cyan) 16%, transparent)' },
  'Shopify Suite': { color: 'var(--amber)', bg: 'color-mix(in srgb, var(--amber) 18%, transparent)' },
  'WordPress Suite': { color: 'var(--accent)', bg: 'color-mix(in srgb, var(--accent) 14%, transparent)' },
  'GitOps Suite': { color: 'var(--green)', bg: 'color-mix(in srgb, var(--green) 16%, transparent)' },
};

function suiteOf(id: string): V3Suite {
  for (const [suffix, suite] of Object.entries(SUITE_OF)) {
    if (id === suffix.slice(1) || id.includes(suffix)) return suite as V3Suite;
  }
  return 'SEO Audit Suite';
}

export function powerAgentMeta(key: string): { name: string; role: string; suite: V3Suite; icon: LucideIcon; handle: string } {
  const preset = ROLES[key];
  const suite = suiteOf(key);
  const short = key.replace(/_(audit|content|agent)$/, '');
  const name = preset?.name ?? short.replace(/_/g, ' ');
  return {
    name,
    role: preset?.role ?? 'Specialist',
    suite,
    icon: preset?.icon ?? Bot,
    handle: '@' + name.replace(/\s/g, '_'),
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 401) {
    window.location.href = '/login?next=' + encodeURIComponent('/');
    throw new Error('session expired');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchV3PowerAgents(): Promise<V3Agent[]> {
  const raw = await getJson<{ id: string; assistantId: string }[]>('/api/power-agents');
  if (raw.length === 0) return DEMO_AGENTS;
  return raw.map((a) => ({ key: a.id, assistantId: a.assistantId, ...powerAgentMeta(a.id) }));
}

export function v3AgentByKey(agents: V3Agent[], key: string | null): V3Agent | undefined {
  return key ? agents.find((a) => a.key === key) : undefined;
}

export async function fetchV3Sessions(workspaceId: string): Promise<V3Session[]> {
  const raw = await getJson<{ id: string; title: string; agentKey: string | null; triageStatus?: string | null; createdAt: string | null; updatedAt: string | null }[]>(
    `/api/power-agents/feed?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
  return raw.length > 0 ? raw : demoSessions();
}

export async function fetchV3SessionsForAgent(workspaceId: string, agentKey: string): Promise<V3Session[]> {
  const raw = await getJson<{ id: string; title: string; triageStatus?: string | null; createdAt: string | null; updatedAt: string | null }[]>(
    `/api/power-agents/threads?agentKey=${encodeURIComponent(agentKey)}&workspaceId=${encodeURIComponent(workspaceId)}`,
  );
  if (raw.length > 0) return raw.map((r) => ({ ...r, agentKey }));
  return demoSessions().filter((s) => s.agentKey === agentKey);
}
