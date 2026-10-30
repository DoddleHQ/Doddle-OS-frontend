import {
    LayoutDashboard, Search, FileText, Share2, Rocket,
    BarChart3, PieChart, Megaphone, Mail, ShieldAlert,
    type LucideIcon,
} from 'lucide-react';

export interface WorkspaceModule {
    name: string;
    icon: LucideIcon;
    path: string;
    desc: string;
}

export const WORKSPACE_MODULES: WorkspaceModule[] = [
    { name: 'Mission Control', icon: LayoutDashboard, path: 'mission-control', desc: 'Board, KPIs, live activity' },
    { name: 'SEO Cluster', icon: Search, path: 'modules/seo-cluster', desc: 'Crawl health, keywords, vitals' },
    { name: 'Content Factory', icon: FileText, path: 'modules/content-factory', desc: 'Pipelines, blueprints, artifacts' },
    { name: 'Social Growth', icon: Share2, path: 'modules/social-growth', desc: 'Viral analysis, trends, outreach' },
    { name: 'SaaS Launch Ops', icon: Rocket, path: 'modules/saas-launch-ops', desc: 'Launch pipelines, approvals' },
    { name: 'Business Audit', icon: BarChart3, path: 'modules/business-audit', desc: 'Technical audits, site health' },
    { name: 'Analytics Action', icon: PieChart, path: 'modules/analytics-action', desc: 'Google + merchant analyst' },
    { name: 'Ads Execution', icon: Megaphone, path: 'modules/ads-execution', desc: 'Campaigns, creative, tracking' },
    { name: 'Email Nurture', icon: Mail, path: 'modules/email-nurture', desc: 'Sequences, drips, automation' },
    { name: 'Brand Guardrails', icon: ShieldAlert, path: 'modules/brand-guardrails', desc: 'Voice, compliance, safety' },
];
