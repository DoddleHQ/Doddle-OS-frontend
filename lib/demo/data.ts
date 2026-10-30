import type { Agent, ThreadState, TriageItem, VaultRun } from './types';

export const PRICE_PER_TOK = 4e-6;

export const AGENTS: Record<string, Agent> = {
  orchestrator: { id: 'orchestrator', handle: '@Dod_Orchestrator', role: 'Orchestrator', icon: 'bot' },
  infra: { id: 'infra', handle: '@Infra_Titan', role: 'Infrastructure', icon: 'server' },
  sec: { id: 'sec', handle: '@Sec_Sentinel', role: 'Security', icon: 'shield' },
  data: { id: 'data', handle: '@Data_Wrangler', role: 'ETL', icon: 'database' },
  writer: { id: 'writer', handle: '@glob_Writer', role: 'Marketing', icon: 'pen-tool' },
};

export const GSC_THREAD_SEEDS: Omit<ThreadState, 'status' | 'progress' | 'tokens' | 'logs' | 'startedAt' | 'endedAt'>[] = [
  { id: 'infra', title: 'schema_eval', agentId: 'infra', objective: 'Compile optimized DDL for ClickHouse.', steps: 4 },
  { id: 'sec', title: 'vault_sync', agentId: 'sec', objective: 'Validate in-memory credential hash set.', steps: 4 },
  { id: 'data', title: 'mcp_stream', agentId: 'data', objective: 'Extract metrics and pipe to schema.', steps: 7 },
];

export const NIGHTLY_AUDIT_ROW = {
  title: 'Nightly DB Audit',
  id: 'db-audit-main',
  status: 'running' as const,
  progress: 89,
  agentId: 'infra',
};

export const DEFAULT_RUN_PROMPT =
  'Execute GSC MCP pipeline blueprint. Pull live analytics, validate hashes, pipe to ClickHouse.';

export const TRIAGE_SEED: TriageItem[] = [
  {
    id: 'seed-q4-assets',
    kind: 'approval',
    tag: 'APPROVAL_REQ',
    title: 'Q4 Marketing Assets',
    desc: '@glob_Writer finished drafting the landing page. Awaiting approval to initiate Vercel deployment.',
    preview: `<section class="hero">
  <h1>Ship agents, not chores.</h1>
  <p>Doddle OS — Q4 campaign landing</p>
  <button data-deploy="vercel">Request demo</button>
</section>`,
  },
];

export const VAULT_SEED: VaultRun[] = [
  {
    id: 'seed-run-1',
    ts: 'Aug 30, 21:14',
    prompt: 'Execute GSC MCP pipeline blueprint. Pull live analytics, validate hashes, pipe to ClickHouse.',
    results: { infra: 'done', sec: 'done', data: 'done' },
    artifact: `-- ClickHouse Multi-Tenant Audits Schema
CREATE TABLE IF NOT EXISTS gsc_local_audits (
    tenant_hash    UUID,
    search_query   String,
    clicks         UInt32
) ENGINE = MergeTree();`,
  },
];

export const SQL_ARTIFACT = VAULT_SEED[0].artifact;

export const GRAPH_TEMPLATES = [
  {
    id: 'gsc-mcp',
    tag: 'engineering',
    title: 'GSC MCP Pipeline',
    desc: 'Evaluates DB schema, secures multi-tenant hashes, extracts analytics.',
    ink: 'var(--line-cobalt)',
    featured: true,
  },
  {
    id: 'seo-impl',
    tag: 'marketing',
    title: 'SEO Implementation',
    desc: 'Scrapes competitor metadata, updates meta tags via headless browser, and generates content briefs.',
    ink: 'var(--line-amber)',
    featured: false,
  },
  {
    id: 'gtm-strategy',
    tag: 'growth',
    title: 'GTM Strategy',
    desc: 'Analyzes target demographics, formulates positioning, and drafts multi-channel launch cadence.',
    ink: 'var(--line-green)',
    featured: false,
  },
];

export const EXTRA_PROCESSES = [
  { title: 'Q4 Marketing Assets', id: 'q4-marketing', status: 'halted' as const, progress: 100, agentId: 'writer', badge: 'approval_req' },
  { title: 'Competitor SEO Scrape', id: 'seo-intel', status: 'idle' as const, progress: 0, agentId: null, badge: 'queued' },
  { title: 'Social Content Gen', id: 'social-weekly', status: 'completed' as const, progress: 100, agentId: 'writer', badge: 'completed' },
];