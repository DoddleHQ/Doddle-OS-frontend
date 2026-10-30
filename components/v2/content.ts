import {
  BROWSING_ARCHITECT_STEPS,
  type ArtifactType,
  type HITLType,
} from '@/lib/types/graph-events.types';
import { sampleThread } from '@/data/threadData';
import { socialThreads } from '@/data/socialGrowth';
import { mockMissionControlData } from '@/data/missionControl';

export interface GraphAgent {
  graphId: string;
  name: string;
  module: string;
  job: string;
  artifacts: ArtifactType[];
  inputHint: string;
  tone: 'default' | 'vermilion';
}

export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  blueprint: 'Blueprint',
  content: 'Content',
  code: 'Code',
  file: 'File',
  image: 'Image',
  report: 'Report',
  data_table: 'Data table',
  link_list: 'Link list',
  pre_run_report: 'Pre-run report',
  pre_run_audit: 'Audit',
  pre_run_audit_summary: 'Audit summary',
  site_context: 'Site context',
  tech_stack: 'Tech stack',
};

export function artifactLabel(t: ArtifactType): string {
  return ARTIFACT_LABELS[t] ?? t;
}

export const GRAPH_AGENTS: GraphAgent[] = [
  {
    graphId: 'content_architect',
    name: 'Content Architect',
    module: 'Content Factory',
    job: 'Crawls a site, extracts its tech stack and business context, then drafts page blueprints and generates content for every selected page.',
    artifacts: ['site_context', 'tech_stack', 'pre_run_audit', 'blueprint', 'content'],
    inputHint: 'Enter a website URL to architect content…',
    tone: 'default',
  },
  {
    graphId: 'interactive_website_architect',
    name: 'Interactive Website Architect',
    module: 'Content Factory',
    job: 'Runs the full crawl→blueprint→content pipeline with an interactive, page-by-page review loop for higher-fidelity sites.',
    artifacts: ['site_context', 'blueprint', 'content'],
    inputHint: 'Enter a website URL to architect interactively…',
    tone: 'default',
  },
  {
    graphId: 'magento_content_writer',
    name: 'Magento Content Writer',
    module: 'Content Factory',
    job: 'Tunes the pipeline for Magento stores — product pages, category copy, and store-native conventions.',
    artifacts: ['blueprint', 'content'],
    inputHint: 'Enter a Magento store URL to rewrite…',
    tone: 'default',
  },
  {
    graphId: 'technical_architect',
    name: 'Technical Architect',
    module: 'Business Audit',
    job: 'Audits technical health — crawlability, redirects, core web vitals — and ships a pre-run audit report before anything changes.',
    artifacts: ['pre_run_audit', 'report', 'pre_run_audit_summary'],
    inputHint: 'Enter a website URL to start technical audit…',
    tone: 'vermilion',
  },
  {
    graphId: 'gtm_strategy',
    name: 'GTM Strategy',
    module: 'Social Growth',
    job: 'Builds a go-to-market strategy — researches the site, clusters the audience, and ships a pre-run report you approve before execution.',
    artifacts: ['pre_run_report', 'site_context', 'report'],
    inputHint: 'Enter a website URL to draft go-to-market strategy…',
    tone: 'default',
  },
];

export const PIPELINE_STEPS = BROWSING_ARCHITECT_STEPS.map((s, i) => ({
  num: String(i + 1).padStart(2, '0'),
  id: s.id,
  name: s.name,
  description: s.description,
}));

export type StepEvent = 'step_start' | 'step_complete' | 'artifact' | 'hitl_request';

export const HITL_STEPS: Record<string, { type: HITLType; message: string }> = {
  tech_selection: {
    type: 'confirmation',
    message: 'Confirm the detected tech stack',
  },
  page_selection: {
    type: 'multi_selection',
    message: 'Select which pages to process',
  },
  pre_run_audit: {
    type: 'content_review',
    message: 'Review the pre-run audit before generation',
  },
};

export type TapeTone = 'system' | 'handoff' | 'conflict' | 'complete' | 'artifact';
export interface TapeEvent {
  from: string;
  to: string;
  action: string;
  tone: TapeTone;
}

export const TAPE_EVENTS: TapeEvent[] = [
  { from: 'operator', to: 'Content Architect', action: 'brief received', tone: 'system' },
  { from: 'Content Architect', to: 'research', action: 'crawling site', tone: 'handoff' },
  { from: 'research', to: 'Content Architect', action: 'context extracted', tone: 'handoff' },
  { from: 'Content Architect', to: 'Technical Architect', action: 'audit requested', tone: 'handoff' },
  { from: 'Technical Architect', to: 'operator', action: 'needs confirmation', tone: 'conflict' },
  { from: 'operator', to: 'Content Architect', action: 'approved', tone: 'handoff' },
  { from: 'Content Architect', to: 'review', action: 'blueprint drafted', tone: 'artifact' },
  { from: 'Technical Architect', to: 'operator', action: 'contest — tech debt', tone: 'conflict' },
  { from: 'operator', to: 'Content Architect', action: 'resolved', tone: 'handoff' },
  { from: 'Content Architect', to: '—', action: 'content shipped', tone: 'complete' },
];

const boardConflict = sampleThread.conflict ?? {
  id: 'conf-001',
  reason: 'Technical debt vs. Content deadline',
  options: [],
};

export const BOARD_THREAD = {
  id: sampleThread.id,
  title: sampleThread.title,
  objective: sampleThread.objective,
  status: sampleThread.status,
  conflict: boardConflict,
} as const;

export const BOARD_HANDOFF = [
  { agent: 'Content Architect', role: 'Content Factory', note: 'brief received — pipeline started', state: 'running' as const, col: 0 },
  { agent: 'Content Architect', role: 'Content Factory', note: 'scraping home page, extracting context', state: 'running' as const, col: 1 },
  { agent: 'Content Architect', role: 'Content Factory', note: 'blueprint drafted, in review', state: 'running' as const, col: 2 },
  { agent: 'Technical Architect', role: 'Business Audit', note: 'CONFLICT — technical debt vs deadline', state: 'conflict' as const, col: 2 },
  { agent: 'operator', role: 'you', note: 'adjudicate the rewrite', state: 'escalated' as const, col: 3 },
  { agent: 'Content Architect', role: 'Content Factory', note: 'resolved — content generated', state: 'complete' as const, col: 4 },
] as const;

export const BOARD_COLUMNS = mockMissionControlData.columns.map((c) => c.title);

export const BOARD_RESIDENTS: string[] = [
  'Content Architect',
  'Content Architect',
  'Technical Architect',
  'operator',
  'Content Architect',
];

export const KPIS = [
  { label: 'System Health', value: '94%', trend: 'up' as const },
  { label: 'Active Agents', value: '5', trend: 'neutral' as const },
  { label: 'Pipeline Steps', value: '12', trend: 'neutral' as const },
  { label: 'Artifacts Types', value: '14', trend: 'up' as const },
  { label: 'HITL Gates', value: '3', trend: 'neutral' as const },
];

export interface RealConflict {
  thread: string;
  module: string;
  reason: string;
  sides: Array<{ agent: string; label: string; description: string }>;
}

export const REAL_CONFLICTS: RealConflict[] = [
  {
    thread: 'Q1 Content Pipeline',
    module: 'Content_Factory',
    reason: boardConflict.reason,
    sides: boardConflict.options.map((o) => ({
      agent: o.agent.name,
      label: o.label,
      description: o.description,
    })),
  },
  {
    thread: 'Viral Trend Analysis',
    module: 'Social_Growth',
    reason: socialThreads[0].conflict?.reason ?? 'Brand voice violation',
    sides: (socialThreads[0].conflict?.options ?? []).map((o) => ({
      agent: o.agent.name,
      label: o.label,
      description: o.description,
    })),
  },
];

export const MODULES = [
  'SEO_Cluster',
  'Content_Factory',
  'Social_Growth',
  'SaaS_Launch_Ops',
  'Business_Audit',
  'Analytics_Action',
  'Ads_Execution',
  'Email_Nurture',
  'Brand_Guardrails',
] as const;

export interface SampleHitl {
  id: string;
  type: HITLType;
  typeLabel: string;
  agent: string;
  message: string;
  options: Array<{ id: string; label: string; value: string }>;
  outcomes: Record<string, string>;
}

export const SAMPLE_HITLS: SampleHitl[] = [
  {
    id: 'hitl-tech-selection',
    type: 'confirmation',
    typeLabel: 'Confirm the detected tech stack',
    agent: 'Technical Architect',
    message: 'I detected WordPress + WooCommerce. Confirm this tech stack before I research conventions.',
    options: [
      { id: 'confirm', label: 'Confirm', value: 'confirm' },
      { id: 'reject', label: 'Wrong stack', value: 'reject' },
    ],
    outcomes: {
      confirm: 'Pipeline resumes and drafts against WordPress + WooCommerce conventions.',
      reject: 'Pipeline pauses — you supply the correct stack before research continues.',
    },
  },
  {
    id: 'hitl-page-selection',
    type: 'multi_selection',
    typeLabel: 'Select which pages to process',
    agent: 'Content Architect',
    message: 'I found 47 pages. Select which to process — I recommend the 8 high-priority ones flagged in the audit.',
    options: [
      { id: 'recommended', label: '8 recommended', value: 'recommended' },
      { id: 'all', label: 'All 47', value: 'all' },
      { id: 'custom', label: 'Custom set', value: 'custom' },
    ],
    outcomes: {
      recommended: 'Pipeline processes 8 pages — blueprints and content for each, about 6 minutes total.',
      all: 'Pipeline processes all 47 pages — a full-site run, about 34 minutes. Higher cost, full coverage.',
      custom: 'You curate the set — the pipeline runs only on the approved pages.',
    },
  },
  {
    id: 'hitl-pre-run-audit',
    type: 'content_review',
    typeLabel: 'Review the pre-run audit',
    agent: 'GTM Strategy',
    message: 'Pre-run audit ready. Approve the strategy before I generate the full GTM report?',
    options: [
      { id: 'approve', label: 'Approve', value: 'approve' },
      { id: 'revise', label: 'Revise direction', value: 'revise' },
    ],
    outcomes: {
      approve: 'Pipeline proceeds to content generation with the approved direction.',
      revise: 'You feed notes — the strategy is regenerated before the report ships.',
    },
  },
];
