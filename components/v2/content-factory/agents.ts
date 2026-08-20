import { FileText, Globe, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleId } from '@/lib/types/thread.types';

/*
 * Agent config registry — single source of truth for all content factory agents.
 *
 * Each agent has a human name and personality to make the interaction feel like
 * talking to a real colleague, not operating a tool. Inspired by the
 * "named worker" UX pattern (e.g. EnrichLabs' "Helena").
 *
 * Agents operate on the CURRENT workspace's domain — no external URLs.
 * The workspace's websiteDomain (set at creation, immutable) is the input.
 *
 * Each agent is identified by its URL slug. The config drives:
 * - The v2 landing page (agent cards)
 * - The streaming page (graphId + input builder)
 * - The thread list page (moduleId for API calls)
 */

export interface AgentConfig {
    slug: string;
    graphId: string;
    moduleId: ModuleId;
    /** Human-facing name (shown to user, not the graphId) */
    name: string;
    /** Role/position */
    role: string;
    subtitle: string;
    icon: LucideIcon;
    /** Initials for avatar */
    initials: string;
    /** Greeting shown when the conversation starts */
    greeting: string;
    /** What this agent says when they start working */
    workingStatus: string;
    /** Builds the graph input payload from user-provided URL + extras + workspaceId */
    inputBuilder: (url: string, extras?: Record<string, unknown>, workspaceId?: string) => Record<string, unknown>;
    /** Placeholder text for the URL input */
    inputPlaceholder: string;
    /**
     * Data-source connection this agent requires. When set, the welcome
     * screen checks the connection and gates the start button on it.
     */
    connectionSource?: 'magento';
    /** Start button label (default "Start Analysis") */
    startLabel?: string;
    /** User message posted when the start button is clicked (default "Analyze {domain}") */
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
    // 'magento-content-writer' (Maya, v1) retired from the v2 roster —
    // replaced by 'magento-content' (Mia, datalake-driven). The v1 launch
    // page still exists for old threads.
    'magento-content': {
        slug: 'magento-content',
        graphId: 'magento_content',
        moduleId: 'magento-content',
        name: 'Mia',
        role: 'Magento Content Lead',
        subtitle: 'Reads your synced Magento catalog from the datalake and writes product, category, collection, and brand page content — you review, then push to your store',
        icon: Store,
        initials: 'M',
        greeting: "Hi, I'm Mia. I'll read your Magento catalog from the datalake and draft content for your product, category, collection, and brand pages.",
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
