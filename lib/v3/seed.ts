import { Megaphone, Search, Database, PenTool, Globe, ShieldCheck, BarChart3, Share2, Palette, Megaphone as Ads } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { V3Agent, V3Category, V3Workspace, V3ActiveThread, V3ReviewItem } from './adapter';

/*
 * Screen-1 seed: the product's real entities, mock state.
 * Shapes stay adapter-owned (lib/v3/adapter.ts) so live services can
 * replace the data without touching screens.
 */

export const OPERATOR_FIRST_NAME = 'Alex';

export const SEED_WORKSPACES: V3Workspace[] = [
  { id: 'marketing', name: 'Marketing', icon: Megaphone },
  { id: 'growth', name: 'Growth Labs', icon: BarChart3 },
  { id: 'brand', name: 'Brand Studio', icon: Palette },
];

export const SEED_AGENTS: V3Agent[] = [
  { handle: '@SEO_Scout', name: 'SEO Scout', role: 'SEO', icon: Search, color: '#9333ea', desc: 'Crawls, keyword maps, site audits. Finds the gaps, ranks the fixes.' },
  { handle: '@Content_Architect', name: 'Content Architect', role: 'Content', icon: PenTool, color: '#db2777', desc: 'Landing pages, briefs, copy. Drafts in brand voice, waits for approval.' },
  { handle: '@Magento_Writer', name: 'Magento Writer', role: 'Content', icon: PenTool, color: '#d97706', desc: 'Product and catalog copy for Magento stores, held for review.' },
  { handle: '@Site_Architect', name: 'Interactive Website Architect', role: 'Site', icon: Globe, color: '#3b82f6', desc: 'Builds interactive page sections; ships nothing unreviewed.' },
  { handle: '@Google_Analyst', name: 'Google Analyst', role: 'Analytics', icon: Database, color: '#0891b2', desc: 'GA4 pipelines, funnels, attribution reads.' },
  { handle: '@Merchant_Analyst', name: 'Merchant Analyst', role: 'Analytics', icon: ShieldCheck, color: '#10b981', desc: 'Merchant center health, product feed fixes.' },
];

export const SEED_CATEGORIES: V3Category[] = [
  { id: 'research', label: 'Research & SEO', desc: 'Investigate, audit, summarize.', icon: Search, color: '#0891b2' },
  { id: 'site-audit', label: 'Site & Tech Audit', desc: 'Crawl health, vitals, fixes.', icon: Globe, color: '#3b82f6' },
  { id: 'data', label: 'Analytics & Data', desc: 'Connect, analyze, report.', icon: Database, color: '#10b981' },
  { id: 'content', label: 'Content & Copy', desc: 'Outline, draft, polish.', icon: PenTool, color: '#d97706' },
  { id: 'ads', label: 'Ads & Campaigns', desc: 'Structure, copy, launch.', icon: Ads, color: '#ea580c' },
  { id: 'social', label: 'Email & Social', desc: 'Sequences, calendar, sends.', icon: Share2, color: '#db2777' },
  { id: 'brand', label: 'Brand & Creative', desc: 'Voice, guardrails, packs.', icon: Palette, color: '#9333ea' },
];

export const SEED_ACTIVE_THREAD: V3ActiveThread = {
  title: 'SEO content sprint — Q4 cluster',
  step: 'Drafting brief 3 of 5 · @Content_Architect',
  progress: 62,
};

export const SEED_SPARK: number[] = [4, 6, 5, 9, 7, 11, 8, 12, 10, 14, 12, 16, 13, 18, 15, 19, 17, 21];

export const SEED_REVIEW: V3ReviewItem[] = [
  {
    id: 'rv1',
    kind: 'APPROVAL_REQ',
    title: 'Q4 Landing Page — hero draft',
    body: '@Content_Architect drafted the hero section. Approve to open the review flow.',
    preview: '<section class="hero">…Ship agents, not chores…</section>',
  },
];
