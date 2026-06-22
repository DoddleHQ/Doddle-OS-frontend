// Core Data Interfaces

export interface AgentMetrics {
  accuracy: number;
  latency: number;
}

export interface Metric {
  id: string;
  label: string;
  value: number | string;
  trend?: string;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  metrics: AgentMetrics;
}

export interface Event {
  type: 'message' | 'conflict' | 'system';
  timestamp: string;
  agent: Agent;
  content: string;
  logicChain?: string[];
  meta?: Record<string, any>;
}

export interface Option {
  agent: Agent;
  description: string;
  label: string;
  outcome: string;
}

export interface Conflict {
  id: string;
  reason: string;
  options: Option[];
}

export interface Thread {
  id: string;
  slug?: string;
  title: string;
  status: string;
  objective: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  events: Event[];
  conflicts?: Conflict[];
  conflict?: Conflict;
  meta?: Record<string, any>;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  activeThreadsCount: number;
}

export interface Workspace {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error';
  health: number;
  modules?: Module[];
}

export type WorkspaceWithModules = Workspace;

// Mock Agents
export const mockAgents: Record<string, Agent> = {
  tech_lead: {
    id: 'agent-tech-lead',
    name: 'Tech_Lead',
    role: 'Technical Architect',
    avatar: '👨‍💻',
    metrics: { accuracy: 98, latency: 120 },
  },
  seo_specialist: {
    id: 'agent-seo',
    name: 'SEO_Specialist',
    role: 'Search Optimization',
    avatar: '🔍',
    metrics: { accuracy: 95, latency: 180 },
  },
  content_strategist: {
    id: 'agent-content',
    name: 'Content_Strategist',
    role: 'Content Planning',
    avatar: '✍️',
    metrics: { accuracy: 92, latency: 150 },
  },
  crawl_spider: {
    id: 'agent-crawl',
    name: 'Crawl_Spider',
    role: 'Web Crawler',
    avatar: '🕷️',
    metrics: { accuracy: 99, latency: 80 },
  },
  social_manager: {
    id: 'agent-social',
    name: 'Social_Manager',
    role: 'Social Media',
    avatar: '📱',
    metrics: { accuracy: 94, latency: 140 },
  },
  launch_coordinator: {
    id: 'agent-launch',
    name: 'Launch_Coordinator',
    role: 'Product Launch',
    avatar: '🚀',
    metrics: { accuracy: 96, latency: 130 },
  },
};

/**
 * Empty workspace list — workspaces are now fetched from the API
 * via workspaceService. This export is kept for backward compatibility
 * with components that import mockWorkspacesWithModules for type usage.
 */
export const mockWorkspacesWithModules: WorkspaceWithModules[] = [];

export default { workspaces: [] };
