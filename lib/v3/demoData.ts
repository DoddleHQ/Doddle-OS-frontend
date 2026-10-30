import {
  Bot, Server, PenTool, Sparkles, ShoppingBag, FolderTree, Activity, Plug, GitBranch,
} from 'lucide-react';
import type { V3Agent, V3Session } from '@/lib/v3/powerAgents';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const agent = (key: string, name: string, role: string, suite: V3Agent['suite'], icon: V3Agent['icon']): V3Agent => ({
  key,
  assistantId: `demo:${key}`,
  name,
  role,
  handle: `@${name}`,
  suite,
  icon,
});

export const DEMO_AGENTS: V3Agent[] = [
  agent('crawlability_audit', 'Crawlability', 'Crawler & Indexer', 'SEO Audit Suite', Bot),
  agent('on_page_audit', 'On-Page', 'Meta & Content Elements', 'SEO Audit Suite', PenTool),
  agent('performance_audit', 'Performance', 'Lighthouse & Vitals', 'SEO Audit Suite', Activity),
  agent('site_structure_audit', 'Site Structure', 'Links & Hierarchy', 'SEO Audit Suite', FolderTree),
  agent('content_quality_audit', 'Content Quality', 'Readability & Depth', 'Website Content Suite', Sparkles),
  agent('product_content', 'Product', 'PDP Copywriter', 'Shopify Suite', ShoppingBag),
  agent('wordpress_plugin_audit', 'WordPress', 'Plugin & Core Health', 'WordPress Suite', Plug),
  agent('technical_foundations_audit', 'Tech Foundations', 'Infra & Security', 'DevOps Suite', Server),
  agent('gitops_agent', 'GitOps', 'Repos & Releases', 'GitOps Suite', GitBranch),
];

interface DemoSeed {
  id: string;
  title: string;
  agentKey: string;
  ageMin: number;
  spanMin: number;
  done: boolean;
}

const SEEDS: DemoSeed[] = [
  { id: 'demo_crawl_live', title: 'Q4 sitemap crawl', agentKey: 'crawlability_audit', ageMin: 4, spanMin: 42, done: false },
  { id: 'demo_git_review', title: 'Release branch sync', agentKey: 'gitops_agent', ageMin: 118, spanMin: 55, done: false },
  { id: 'demo_shop_review', title: 'PDP copy refresh — homepage', agentKey: 'product_content', ageMin: 5 * 60, spanMin: 3 * 60, done: false },
  { id: 'demo_blog_cluster', title: 'Blog cluster — winter tires', agentKey: 'crawlability_audit', ageMin: 26 * 60, spanMin: 4 * 60, done: true },
  { id: 'demo_email_seq', title: 'Email sequence — onboarding', agentKey: 'content_quality_audit', ageMin: 29 * 60, spanMin: 90, done: true },
  { id: 'demo_plugin_sweep', title: 'Plugin audit sweep', agentKey: 'wordpress_plugin_audit', ageMin: 2 * 24 * 60, spanMin: 40, done: true },
  { id: 'demo_meta_audit', title: 'Meta & title audit', agentKey: 'on_page_audit', ageMin: 3 * 24 * 60, spanMin: 70, done: true },
  { id: 'demo_vitals', title: 'Core Web Vitals pass', agentKey: 'performance_audit', ageMin: 4 * 24 * 60, spanMin: 25, done: true },
  { id: 'demo_headers', title: 'Security headers check', agentKey: 'technical_foundations_audit', ageMin: 5 * 24 * 60, spanMin: 35, done: true },
  { id: 'demo_pdp_rewrite', title: 'Collection page rewrite', agentKey: 'product_content', ageMin: 6 * 24 * 60, spanMin: 2 * 60, done: true },
  { id: 'demo_silo_plan', title: 'Silo structure plan', agentKey: 'site_structure_audit', ageMin: 8 * 24 * 60, spanMin: 50, done: true },
  { id: 'demo_forecast', title: 'Forecast refresh', agentKey: 'gitops_agent', ageMin: 10 * 24 * 60, spanMin: 45, done: true },
  { id: 'demo_sept_crawl', title: 'September crawl — baseline', agentKey: 'crawlability_audit', ageMin: 12 * 24 * 60, spanMin: 3 * 60, done: true },
];

const seenKey = (id: string) => `v3.seen.th.${id}`;

export function demoSessions(): V3Session[] {
  const now = Date.now();
  try {
    if (!localStorage.getItem('v3.firstVisit')) localStorage.setItem('v3.firstVisit', String(now - 14 * DAY));
  } catch {
  }
  const out = SEEDS.map((s) => {
    const updated = new Date(now - s.ageMin * MIN).toISOString();
    const created = new Date(now - (s.ageMin + s.spanMin) * MIN).toISOString();
    if (s.done) {
      try {
        if (!localStorage.getItem(seenKey(s.id))) localStorage.setItem(seenKey(s.id), String(now));
      } catch {
      }
    }
    return { id: s.id, title: s.title, agentKey: s.agentKey, createdAt: created, updatedAt: updated };
  });
  return out.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
}
