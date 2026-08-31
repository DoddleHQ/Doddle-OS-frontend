import type { Agent, ThreadState, TriageItem, VaultRun } from './types';

/** Price per token for the simulated cost meter (matches the HTML sample). */
export const PRICE_PER_TOK = 4e-6;

export const OPERATOR = {
  name: 'Alex F.',
  role: 'Forward Deployed Engineer',
  context: 'Acme_SaaS_Context',
};

export const AGENTS: Record<string, Agent> = {
  orchestrator: { id: 'orchestrator', handle: '@Dod_Orchestrator', role: 'Orchestrator', icon: 'bot' },
  infra: { id: 'infra', handle: '@Infra_Titan', role: 'Infrastructure', icon: 'server' },
  sec: { id: 'sec', handle: '@Sec_Sentinel', role: 'Security', icon: 'shield' },
  data: { id: 'data', handle: '@Data_Wrangler', role: 'ETL', icon: 'database' },
  writer: { id: 'writer', handle: '@glob_Writer', role: 'Marketing', icon: 'pen-tool' },
};

/** The three engine-driven threads of the GSC MCP pipeline swarm. */
export const GSC_THREAD_SEEDS: Omit<ThreadState, 'status' | 'progress' | 'tokens' | 'logs' | 'startedAt' | 'endedAt'>[] = [
  { id: 'infra', title: 'schema_eval', agentId: 'infra', objective: 'Compile optimized DDL for ClickHouse.', steps: 4 },
  { id: 'sec', title: 'vault_sync', agentId: 'sec', objective: 'Validate in-memory credential hash set.', steps: 4 },
  { id: 'data', title: 'mcp_stream', agentId: 'data', objective: 'Extract metrics and pipe to schema.', steps: 7 },
];

/** Static dashboard row — a long-lived process outside the demo swarm. */
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
