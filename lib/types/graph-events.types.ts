export type GraphEventType =
    | 'step_start'
    | 'step_complete'
    | 'system'
    | 'agent_message'
    | 'artifact'
    | 'progress'
    | 'hitl_request'
    | 'error'
    | 'complete';

export interface BaseGraphEvent {
    id: string;
    type: GraphEventType;
    timestamp: string;

    graphId: string;
    threadId: string;

    version: string;

    stepId?: string;
    stepName?: string;
    stepNumber?: number;
    totalSteps?: number;

    nodeId?: string;
}

export interface StepStartPayload {
    stepId: string;
    stepName: string;
    stepNumber: number;
    totalSteps: number;
    description?: string;
}

export interface StepStartEvent extends BaseGraphEvent {
    type: 'step_start';
    payload: StepStartPayload;
}

export interface StepCompletePayload {
    stepId: string;
    stepName: string;
    stepNumber: number;
    totalSteps: number;
    status: 'success' | 'skipped' | 'partial' | 'failed';
    duration?: number;
    summary?: string;
    artifacts?: string[];
}

export interface StepCompleteEvent extends BaseGraphEvent {
    type: 'step_complete';
    payload: StepCompletePayload;
}

export type SystemLevel = 'info' | 'warning' | 'success';
export type SystemSubType = 'phase_start' | 'phase_complete' | 'node_enter' | 'node_exit' | 'custom';

export interface SystemPayload {
    message: string;
    level: SystemLevel;
    subType?: SystemSubType;
    metadata?: Record<string, unknown>;
}

export interface SystemEvent extends BaseGraphEvent {
    type: 'system';
    payload: SystemPayload;
}

export interface AgentMessagePayload {
    content: string;
    sender?: string;
    metadata?: {
        model?: string;
        tokens?: number;
        [key: string]: unknown;
    };
}

export interface AgentMessageEvent extends BaseGraphEvent {
    type: 'agent_message';
    payload: AgentMessagePayload;
}

export type ArtifactType =
    | 'blueprint'
    | 'content'
    | 'code'
    | 'file'
    | 'image'
    | 'report'
    | 'data_table'
    | 'link_list'
    | 'pre_run_report'
    | 'pre_run_audit'
    | 'pre_run_audit_summary'
    | 'site_context'
    | 'tech_stack';

export interface ArtifactAction {
    id: string;
    label: string;
    type: 'download' | 'copy' | 'view' | 'edit' | 'regenerate';
    payload?: unknown;
}

export interface ArtifactPayload {
    artifactId: string;
    artifactType: ArtifactType;
    title: string;
    description?: string;
    content: unknown;
    actions?: ArtifactAction[];
    metadata?: {
        mimeType?: string;
        size?: number;
        [key: string]: unknown;
    };
}

export interface ArtifactEvent extends BaseGraphEvent {
    type: 'artifact';
    payload: ArtifactPayload;
}

export interface HeadingsData {
    h1?: string[];
    h2?: string[];
    h3?: string[];
    h4?: string[];
    h5?: string[];
    h6?: string[];
}

export interface ContentStats {
    paragraphs_count?: number;
    word_count?: number;
    links_count?: number;
}

export interface HomePageData {
    url?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    content_stats?: ContentStats;
    headings?: HeadingsData;
    scrape_method?: string;
}

export type ProgressStatus = 'pending' | 'in_progress' | 'complete' | 'error';

export interface SubProgressItem {
    itemId: string;
    label: string;
    current: number;
    total: number;
    status: ProgressStatus;
}

export interface ProgressPayload {
    current: number;
    total: number;
    message?: string;
    subProgress?: SubProgressItem[];
}

export interface ProgressEvent extends BaseGraphEvent {
    type: 'progress';
    payload: ProgressPayload;
}

export type Priority = 'low' | 'normal' | 'high' | 'critical';

export type HITLType =
    | 'content_review'
    | 'url_selection'
    | 'topic_input'
    | 'confirmation'
    | 'selection'
    | 'multi_selection'
    | 'feedback'
    | 'data_input'
    | 'per_page_feedback';

export interface HITLOption {
    id: string;
    label: string;
    value: unknown;
    description?: string;
}

export interface HITLInterruptPayload {
    version: number;
    type: 'hitl_request';
    hitl_type: HITLType;
    message: string;
    request_id?: string;
    options?: HITLOption[];
    allow_free_input: boolean;
    default?: unknown;
    data?: Record<string, unknown>;
    timeout_seconds?: number;
    priority: Priority;
}

export interface HITLRequestPayload {
    requestId: string;
    requestType?: HITLType;
    message?: string;
    allowFreeInput?: boolean;
    data?: Record<string, unknown>;
    timeoutSeconds?: number;
    priority?: Priority;
    prompt?: string;
    inputType?: HITLInputType;
    required?: boolean;
    options?: HITLOption[];
    default?: unknown;
    defaultValue?: unknown;
    timeout?: number;
}

export function convertInterruptToHITLRequest(
    interrupt: HITLInterruptPayload,
    taskId: string
): HITLRequestPayload {
    return {
        requestId: interrupt.request_id ?? taskId,
        requestType: interrupt.hitl_type,
        message: interrupt.message,
        options: interrupt.options,
        allowFreeInput: interrupt.allow_free_input,
        default: interrupt.default,
        data: interrupt.data,
        timeoutSeconds: interrupt.timeout_seconds,
        priority: interrupt.priority,
        prompt: interrupt.message,
        inputType: interrupt.hitl_type as any,
        defaultValue: interrupt.default,
        timeout: interrupt.timeout_seconds,
    };
}

export type HITLInputType =
    | 'confirmation'
    | 'single_select'
    | 'multi_select'
    | 'text_input'
    | 'file_upload';

export interface HITLOptionLegacy {
    id: string;
    label: string;
    description?: string;
    value?: unknown;
    selected?: boolean;
}

export interface HITLRequestPayloadLegacy {
    requestId: string;
    prompt: string;
    inputType: HITLInputType;
    options?: HITLOptionLegacy[];
    defaultValue?: unknown;
    required?: boolean;
    timeout?: number;
}

export interface HITLRequestEvent extends BaseGraphEvent {
    type: 'hitl_request';
    payload: HITLRequestPayload;
}

export interface ErrorPayload {
    code: string;
    message: string;
    details?: string;
    retryable?: boolean;
    nodeId?: string;
}

export interface ErrorEvent extends BaseGraphEvent {
    type: 'error';
    payload: ErrorPayload;
}

export type CompleteStatus = 'success' | 'completed' | 'partial' | 'failed';

export interface CompleteSummary {
    itemsProcessed?: number;
    artifactsGenerated?: number;
    duration?: number;
    [key: string]: unknown;
}

export interface CompletePayload {
    status: CompleteStatus;
    message?: string;
    summary?: CompleteSummary;
    artifacts?: string[];
}

export interface CompleteEvent extends BaseGraphEvent {
    type: 'complete';
    payload: CompletePayload;
}

export type GraphEvent =
    | StepStartEvent
    | StepCompleteEvent
    | SystemEvent
    | AgentMessageEvent
    | ArtifactEvent
    | ProgressEvent
    | HITLRequestEvent
    | ErrorEvent
    | CompleteEvent;

export type StreamStatus = 'idle' | 'connecting' | 'running' | 'hitl_pending' | 'complete' | 'error';

export interface GraphStreamState {
    isConnected: boolean;
    threadId: string | null;
    graphId: string | null;

    currentStep: StepStartPayload | null;
    completedSteps: StepCompletePayload[];

    messages: ChatMessage[];

    artifacts: Map<string, ArtifactPayload>;

    progress: ProgressPayload | null;

    pendingHITL: HITLRequestPayload | null;

    status: StreamStatus;
    error: ErrorPayload | null;
    completeEvent: CompletePayload | null;
}

export type ChatMessageType = 'user' | 'system' | 'agent' | 'hitl' | 'artifact' | 'step';

export interface ChatMessage {
    id: string;
    type: ChatMessageType;
    content: string;
    timestamp: Date;
    sender?: string;
    metadata?: {
        eventId?: string;
        stepId?: string;
        stepNumber?: number;
        totalSteps?: number;
        artifactId?: string;
        artifactType?: ArtifactType;
        [key: string]: unknown;
    };
}

export interface StartGraphRequest {
    graphId: string;
    input: Record<string, unknown>;
    workspaceId?: string;
    options?: {
        timeout?: number;
        metadata?: Record<string, unknown>;
    };
}

export interface StartGraphResponse {
    threadId: string;
    status: 'started' | 'error';
    streamUrl: string;
    message?: string;
}

export interface HITLResponseRequest {
    threadId: string;
    requestId: string;
    response: unknown;
}

export interface HITLResponseResult {
    success: boolean;
    message?: string;
}

export const BROWSING_ARCHITECT_STEPS = [
    { id: 'url_validation', name: 'URL Validation', description: 'Validate and normalize the website URL' },
    { id: 'home_scraping', name: 'Home Page Scraping', description: 'Scrape and analyze the home page' },
    { id: 'site_context', name: 'Site Context Extraction', description: 'Extract business context from home page' },
    { id: 'link_discovery', name: 'Link Discovery', description: 'Discover and classify navigation links' },
    { id: 'tech_selection', name: 'Tech Stack Selection', description: 'Present detected tech stack for user confirmation' },
    { id: 'tech_research', name: 'Tech Stack Research', description: 'Research conventions for confirmed tech stack' },
    { id: 'page_selection', name: 'Page Selection', description: 'User selects URLs to process' },
    { id: 'pre_run_audit', name: 'Pre-Run Audit', description: 'Generate audit report and get user approval' },
    { id: 'page_scraping', name: 'Page Scraping', description: 'Scrape all selected pages' },
    { id: 'blueprint_generation', name: 'Blueprint Generation', description: 'Generate per-page blueprints' },
    { id: 'content_generation', name: 'Content Generation', description: 'Generate content using blueprints' },
    { id: 'reporting', name: 'Structure Report', description: 'Generate final summary report' },
] as const;

export type BrowsingArchitectStepId = typeof BROWSING_ARCHITECT_STEPS[number]['id'];

export function getStepInfo(stepId: string, graphId: string) {
    if (graphId === 'content_architect') {
        return BROWSING_ARCHITECT_STEPS.find(s => s.id === stepId);
    }
    if (graphId === 'gtm_strategy') {
        return BROWSING_ARCHITECT_STEPS.find(s => s.id === stepId);
    }
    return undefined;
}

export function calculateOverallProgress(
    stepNumber: number,
    totalSteps: number,
    stepProgress?: number
): number {
    const baseProgress = ((stepNumber - 1) / totalSteps) * 100;
    const stepContribution = stepProgress ? (stepProgress / totalSteps) : 0;
    return Math.round(baseProgress + stepContribution);
}

export function isStepStartEvent(event: GraphEvent): event is StepStartEvent {
    return event.type === 'step_start';
}

export function isStepCompleteEvent(event: GraphEvent): event is StepCompleteEvent {
    return event.type === 'step_complete';
}

export function isSystemEvent(event: GraphEvent): event is SystemEvent {
    return event.type === 'system';
}

export function isAgentMessageEvent(event: GraphEvent): event is AgentMessageEvent {
    return event.type === 'agent_message';
}

export function isArtifactEvent(event: GraphEvent): event is ArtifactEvent {
    return event.type === 'artifact';
}

export function isProgressEvent(event: GraphEvent): event is ProgressEvent {
    return event.type === 'progress';
}

export function isHITLRequestEvent(event: GraphEvent): event is HITLRequestEvent {
    return event.type === 'hitl_request';
}

export function isErrorEvent(event: GraphEvent): event is ErrorEvent {
    return event.type === 'error';
}

export function isCompleteEvent(event: GraphEvent): event is CompleteEvent {
    return event.type === 'complete';
}
