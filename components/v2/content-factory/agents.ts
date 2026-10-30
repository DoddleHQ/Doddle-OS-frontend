import { FileText, Globe, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleId } from '@/lib/types/thread.types';

export interface AgentConfig {
    slug: string;
    graphId: string;
    moduleId: ModuleId;
    name: string;
    role: string;
    subtitle: string;
    icon: LucideIcon;
    initials: string;
    greeting: string;
    workingStatus: string;
    inputBuilder: (url: string, extras?: Record<string, unknown>, workspaceId?: string) => Record<string, unknown>;
    inputPlaceholder: string;
    connectionSource?: 'magento';
    startLabel?: string;
    startMessage?: string;
}

export const AGENTS: Record<string, AgentConfig> = {
    'content-architect': {
        slug: 'content-architect',
        graphId: 'content_architect',
        moduleId: 'content-architect',
        name: 'Alex',
        role: 'Content Strategist',
        subtitle: 'Crawls your website, maps the page structure, and writes SEO-optimized content for each page',
        icon: FileText,
        initials: 'A',
        greeting: "Hi, I'm Alex. I'll analyze your site's structure, understand your brand, and draft content for any page.",
        workingStatus: 'Analyzing your site…',
        inputBuilder: (url, _extras, workspaceId) => ({
            workspace_id: workspaceId ?? '',
            site_url: url,
        }),
        inputPlaceholder: 'Workspace domain is used automatically…',
    },
    'magento-content': {
        slug: 'magento-content',
        graphId: 'magento_content',
        moduleId: 'magento-content',
        name: 'Mia',
        role: 'Magento Content Lead',
        subtitle: 'Name the pages you want from your Magento catalog — she writes them and runs automated quality checks on every one',
        icon: Store,
        initials: 'M',
        greeting: "Hi, I'm Mia. Name the product, category, collection, or brand pages you want — I'll write them and run automated quality checks on each one before handing them over.",
        workingStatus: 'Reading your Magento catalog…',
        inputBuilder: (_url, _extras, workspaceId) => ({
            workspace_id: workspaceId ?? '',
        }),
        inputPlaceholder: 'Your connected Magento store is used automatically…',
        connectionSource: 'magento',
        startLabel: 'Start Writing',
        startMessage: 'Read my Magento catalog and start writing',
    },
    'interactive-website-architect': {
        slug: 'interactive-website-architect',
        graphId: 'interactive_website_architect',
        moduleId: 'interactive-website-architect',
        name: 'Iris',
        role: 'Website Architect',
        subtitle: 'Reviews your site interactively, confirms page choices with you, and crafts tailored content step by step',
        icon: Globe,
        initials: 'I',
        greeting: "Hi, I'm Iris. We'll go through your site together — page by page — to build content that fits perfectly.",
        workingStatus: 'Mapping your site structure…',
        inputPlaceholder: 'Workspace domain is used automatically…',
        inputBuilder: (url) => ({
            human_input: url,
        }),
    },
};

export const AGENT_LIST = Object.values(AGENTS);

export function getAgent(slug: string): AgentConfig | undefined {
    return AGENTS[slug];
}
