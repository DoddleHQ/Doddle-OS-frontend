import {
  Search,
  Factory,
  Megaphone,
  Rocket,
  ClipboardCheck,
  BarChart3,
  Target,
  Mail,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type V3ModuleDomain = 'seo' | 'content' | 'social' | 'ads' | 'analytics' | 'ops' | 'brand';

export interface V3Module {
  slug: string;
  name: string;
  blurb: string;
  domain: V3ModuleDomain;
  tags: string[];
  icon: LucideIcon;
  root?: boolean;
}

export const V3_DOMAINS: Record<V3ModuleDomain, string> = {
  seo: 'SEO',
  content: 'Content',
  social: 'Social',
  ads: 'Ads',
  analytics: 'Analytics',
  ops: 'Ops',
  brand: 'Brand',
};

export const V3_MODULES: V3Module[] = [
  {
    slug: 'seo-cluster',
    name: 'SEO Cluster',
    blurb: 'Keyword clusters, briefs, and interlinked pages that own a topic.',
    domain: 'seo',
    tags: ['keywords', 'cluster', 'briefs', 'internal links', 'topic', 'sitemap', 'crawl'],
    icon: Search,
  },
  {
    slug: 'business-audit',
    name: 'Business Audit',
    blurb: 'Full-funnel site audit — technical, content, and structure findings.',
    domain: 'seo',
    tags: ['audit', 'technical', 'findings', 'site health', 'report'],
    icon: ClipboardCheck,
  },
  {
    slug: 'content-factory',
    name: 'Content Factory',
    blurb: 'Architect, write, and assemble landing pages and site content.',
    domain: 'content',
    tags: ['landing', 'copy', 'pages', 'writing', 'magento', 'wordpress', 'pdp'],
    icon: Factory,
  },
  {
    slug: 'brand-persona',
    name: 'Brand Persona',
    blurb: 'Voice, audience, and positioning the agents write within.',
    domain: 'brand',
    tags: ['brand', 'voice', 'persona', 'positioning', 'audience', 'tone'],
    icon: UserCircle2,
    root: true,
  },
  {
    slug: 'social-growth',
    name: 'Social Growth',
    blurb: 'Calendar, creators, and posts that compound reach.',
    domain: 'social',
    tags: ['social', 'calendar', 'posts', 'creators', 'instagram', 'linkedin'],
    icon: Megaphone,
  },
  {
    slug: 'ads-execution',
    name: 'Ads Execution',
    blurb: 'Meta and search campaigns with briefs and creative requests.',
    domain: 'ads',
    tags: ['ads', 'meta', 'campaigns', 'creative', 'ppc', 'search'],
    icon: Target,
  },
  {
    slug: 'saas-launch-ops',
    name: 'SaaS Launch Ops',
    blurb: 'Launch planning: milestones, assets, and rollout tracking.',
    domain: 'ops',
    tags: ['launch', 'saas', 'milestones', 'rollout', 'plan', 'gtm'],
    icon: Rocket,
  },
  {
    slug: 'analytics-action',
    name: 'Analytics Action',
    blurb: 'Google and merchant analyses turned into next actions.',
    domain: 'analytics',
    tags: ['analytics', 'ga4', 'merchant', 'data', 'reports', 'insights'],
    icon: BarChart3,
  },
  {
    slug: 'email-nurture',
    name: 'Email Nurture',
    blurb: 'Sequences and segments that move leads to customers.',
    domain: 'content',
    tags: ['email', 'sequences', 'nurture', 'segments', 'drip'],
    icon: Mail,
  },
  {
    slug: 'brand-guardrails',
    name: 'Brand Guardrails',
    blurb: 'Review gates that keep output inside brand policy.',
    domain: 'brand',
    tags: ['guardrails', 'policy', 'review', 'compliance', 'checks'],
    icon: ShieldCheck,
  },
];

export function v3ModuleHref(slug: string, workspaceId: string): string {
  const m = V3_MODULES.find((x) => x.slug === slug);
  const base = m?.root ? `/legacy/workspaces/${workspaceId}` : `/legacy/workspaces/${workspaceId}/modules`;
  return `${base}/${slug}`;
}

export function v3SuggestModules(text: string): Array<{ module: V3Module; score: number }> {
  const q = text.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  return V3_MODULES.map((m) => {
    const hay = `${m.name} ${m.blurb} ${m.tags.join(' ')} ${m.domain}`.toLowerCase();
    let score = 0;
    if (m.name.toLowerCase().includes(q)) score += 5;
    words.forEach((w) => {
      if (m.tags.some((t) => t.includes(w) || w.includes(t))) score += 3;
      if (m.name.toLowerCase().includes(w)) score += 2;
      if (hay.includes(w)) score += 1;
    });
    return { module: m, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
