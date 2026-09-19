'use client';
import { useParams } from 'next/navigation';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Code2, Copy as CopyIcon, Download, Eye, FileText, Loader2, Plus, Send, TerminalSquare, X, Zap } from 'lucide-react';
import { DemoIcon } from '@/lib/demo/icons';
import { useOS } from '@/lib/demo/osStore';

/**
 * Power Agents — solo sessions, LIVE.
 *
 * Original agency/terminal design preserved exactly (feed rows, ink
 * avatars, CLI input, execution canvas). The setTimeout mock core is
 * replaced with the real stack: Vercel AI SDK useChat over the
 * /api/power-agents/chat bridge (LangGraph server, 12 power agents),
 * streaming tokens + inline collapsible tool-call rows in the same
 * visual language.
 */

// ── live agent roster (fetched from the LangGraph server) ──────────────

interface LiveAgent {
  id: string;
  assistantId: string;
}

const INK = {
  audit: 'var(--line-green)',
  content: 'var(--line-amber)',
  devops: 'var(--line-cobalt)',
  shopify: 'var(--line-violet)',
  wordpress: 'var(--line-teal)',
} as const;

interface AgentMeta {
  ink: string;
  icon: string;
  handle: string;
  name: string;
  role: string;
  suite: 'SEO Audit Suite' | 'Website Content Suite' | 'DevOps Suite' | 'Shopify Suite' | 'WordPress Suite';
}

const ROLES: Record<string, { name: string; role: string; icon: string }> = {
  crawlability_audit: { name: 'Crawlability', role: 'Crawler & Indexer', icon: 'bot' },
  technical_foundations_audit: { name: 'Tech Foundations', role: 'Infra & Security', icon: 'server' },
  on_page_audit: { name: 'On-Page', role: 'Meta & Content Elements', icon: 'pen-tool' },
  content_quality_audit: { name: 'Content Quality', role: 'Readability & Depth', icon: 'sparkles' },
  site_structure_audit: { name: 'Site Structure', role: 'Links & Hierarchy', icon: 'folder-tree' },
  performance_audit: { name: 'Performance', role: 'Lighthouse & Vitals', icon: 'activity' },
  product_content: { name: 'Product', role: 'PDP Copywriter', icon: 'database' },
  category_content: { name: 'Category', role: 'PLP Copywriter', icon: 'layers' },
  collection_content: { name: 'Collection', role: 'Curation Copywriter', icon: 'bot' },
  brand_content: { name: 'Brand', role: 'Trust & Identity', icon: 'shield' },
  home_content: { name: 'Home', role: 'Homepage Copywriter', icon: 'layout-dashboard' },
  custom_page_content: { name: 'Custom', role: 'Any Page Type', icon: 'terminal' },
  devops_agent: { name: 'DevOps', role: 'SSH Operator & Fixer', icon: 'terminal-square' },
  shopify_agent: { name: 'Shopify', role: 'Store Manager & Content', icon: 'shopping-bag' },
  wordpress_agent: { name: 'WordPress', role: 'Site Manager & Content', icon: 'globe' },
};


// a 401 from our LangGraph proxies means the backend revoked the session
// (single-session policy: another device logged in) — the JWT cookie can
// still look valid to middleware, so send the user to re-login explicitly
function redirectToLogin(): never {
  window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
  throw new Error('session expired');
}

// a part is "visibly active" when text is streaming or a tool input is
// pending output — used to decide whether the working-dots bubble is needed
const isPartActive = (p: unknown) => {
  const s = (p as { state?: string }).state;
  return s === 'streaming' || s === 'input-streaming' || s === 'input-available';
};

// suite membership by explicit map — robust before suite #4 arrives
const SUITE_OF: Record<string, AgentMeta['suite']> = {
  _content: 'Website Content Suite',
  devops: 'DevOps Suite',
  shopify: 'Shopify Suite',
  wordpress: 'WordPress Suite',
};
const suiteOf = (id: string): AgentMeta['suite'] => {
  for (const [suffix, suite] of Object.entries(SUITE_OF)) {
    if (id === suffix.slice(1) || id.includes(suffix)) return suite;
  }
  return 'SEO Audit Suite';
};

function agentMeta(id: string): AgentMeta {
  const preset = ROLES[id];
  const suite = suiteOf(id);
  const short = id.replace(/_(audit|content|agent)$/, '');
  const name = preset?.name ?? short.replace(/_/g, ' ');
  return {
    ink: suite === 'Website Content Suite'
      ? INK.content
      : suite === 'DevOps Suite'
        ? INK.devops
        : suite === 'Shopify Suite'
          ? INK.shopify
          : suite === 'WordPress Suite'
            ? INK.wordpress
            : INK.audit,
    icon: preset?.icon ?? 'bot',
    handle: '@' + name.replace(/\s/g, '_'),
    name,
    role: preset?.role ?? 'Specialist',
    suite,
  };
}

// ── tool row in the feed's visual language (accordion-controlled) ──────

// Map tool names to human-friendly labels — the user is a store owner
// or marketer, not a developer. Pattern-based so it covers all agents.
const TOOL_LABELS: Record<string, string> = {
  // common
  'read file': 'reading guide',
  'fetch_sitemap_urls': 'discovering URLs',
  'scrape_page': 'reading page',
  'extract_page_structure': 'analyzing structure',
  'check_field_bands': 'validating content',
  // seo audit
  'audit_robots_txt': 'checking robots.txt',
  'audit_llms_txt': 'checking AI guides',
  'audit_sitemaps': 'checking sitemaps',
  'audit_url_status_codes': 'checking page statuses',
  'audit_canonicals': 'checking canonicals',
  'audit_redirects': 'checking redirects',
  'audit_hreflang': 'checking language tags',
  'audit_pagination': 'checking pagination',
  'audit_security_headers': 'checking security',
  'audit_compression': 'checking compression',
  'audit_https': 'checking HTTPS',
  'audit_ssl_certificate': 'checking SSL certificate',
  'audit_server_response': 'checking response',
  'audit_page_speed': 'checking speed',
  'audit_url_structure': 'checking URL structure',
  'audit_mobile_friendly': 'checking mobile',
  'audit_page_performance': 'measuring performance',
  'audit_accessibility': 'checking accessibility',
  'audit_seo_basics': 'checking SEO basics',
  'audit_best_practices': 'checking best practices',
  'audit_agentic_browsing': 'checking AI readability',
  'measure_core_web_vitals': 'measuring vitals',
  'run_lighthouse_audits': 'running diagnostics',
  'run_full_lighthouse_audit': 'running full diagnostics',
  // devops
  'ssh_connect': 'connecting to server',
  'ssh_shell': 'running command',
  'ssh_read_file': 'reading file',
  'ssh_write_file': 'writing file',
  'ssh_tail': 'reading logs',
  'ssh_service': 'managing service',
  'ssh_approve_action': 'recording approval',
  'ssh_disconnect': 'disconnecting',
  // shopify (MCP)
  'get-products': 'browsing products',
  'get-product-by-id': 'reading product',
  'get-shop-info': 'checking store info',
  'get-orders': 'browsing orders',
  'get-order-by-id': 'reading order',
  'get-customers': 'browsing customers',
  'get-customer-by-id': 'reading customer',
  'get-customer-orders': 'checking orders',
  'get-collections': 'browsing collections',
  'get-collection-by-id': 'reading collection',
  'get-inventory-items': 'checking inventory',
  'get-inventory-levels': 'checking stock levels',
  'get-locations': 'checking locations',
  'get-metafields': 'reading custom fields',
  'get-metafield-definitions': 'reading field definitions',
  'get-markets': 'checking markets',
  'create-product': 'creating product',
  'update-product': 'updating product',
  'delete-product': 'removing product',
  'manage-product-variants': 'updating variants',
  'manage-product-options': 'updating options',
  'delete-product-variants': 'removing variants',
  'manage-tags': 'updating tags',
  'set-metafields': 'setting custom fields',
  'delete-metafields': 'removing custom fields',
  'inventory-set-quantities': 'adjusting stock',
  'create-draft-order': 'creating order',
  'complete-draft-order': 'completing order',
  'create-fulfillment': 'fulfilling order',
  'get-fulfillment-orders': 'checking fulfillment',
  'order-cancel': 'cancelling order',
  'order-close-open': 'closing order',
  'order-mark-as-paid': 'marking as paid',
  'refund-create': 'creating refund',
  'get-order-transactions': 'checking payments',
  'get-order-refund-details': 'checking refund info',
  'create-customer': 'creating customer',
  'update-customer': 'updating customer',
  'delete-customer': 'removing customer',
  'customer-merge': 'merging customers',
  'manage-customer-address': 'updating address',
  'get-price-lists': 'checking pricing',
  'get-product-variants-detailed': 'checking variants',
  // wordpress (MCP)
  'wp_list_pages': 'browsing pages',
  'wp_get_page': 'reading page',
  'wp_create_page': 'creating page',
  'wp_update_page': 'updating page',
  'wp_delete_page': 'removing page',
  'wp_get_page_revisions': 'checking history',
  'wp_list_posts': 'browsing posts',
  'wp_create_post': 'creating post',
  'wp_update_post': 'updating post',
  'wp_upload_media': 'uploading media',
  'wp_list_media': 'browsing media',
  'wp_seo_site_audit': 'running SEO audit',
  'wp_seo_analyze_content': 'analyzing content',
  'wp_seo_keyword_research': 'researching keywords',
  'wp_seo_generate_metadata': 'generating metadata',
  'wp_seo_bulk_update_metadata': 'updating metadata',
  'wp_seo_generate_schema': 'generating schema',
  'wp_seo_validate_schema': 'validating schema',
  'wp_seo_suggest_internal_links': 'checking links',
  'wp_seo_get_live_data': 'checking rankings',
  'wp_seo_track_serp': 'tracking rankings',
  'wp_performance_stats': 'checking performance',
  'wp_performance_benchmark': 'benchmarking',
  'wp_performance_optimize': 'optimizing',
  'wp_performance_alerts': 'checking alerts',
  'wp_cache_clear': 'clearing cache',
  'wp_cache_info': 'checking cache',
  'wp_cache_stats': 'cache stats',
  'wp_get_site_settings': 'checking site',
  'wp_update_site_settings': 'updating settings',
  'wp_check_version': 'checking version',
  'wp_search_site': 'searching site',
  'wp_list_categories': 'browsing categories',
  'wp_list_tags': 'browsing tags',
  'wp_list_users': 'browsing users',
  'wp_list_comments': 'browsing comments',
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/[_-]/g, ' ');
}

function ToolRow({
  ink,
  toolName,
  state,
  input,
  output,
  isOpen,
  onToggle,
}: {
  ink: string;
  toolName: string;
  state: 'running' | 'complete' | 'failed';
  input: unknown;
  output?: unknown;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const label = toolLabel(toolName ?? 'tool');
  let target = '';
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    for (const key of ['url', 'file_path', 'skill_id', 'site', 'report_name', 'audit_ids']) {
      const v = obj[key];
      if (typeof v === 'string' && v) { target = v.length > 48 ? v.slice(0, 45) + '…' : v; break; }
      if (Array.isArray(v) && v.length) { target = `${v.length} items`; break; }
    }
  }

  return (
    <div
      className="feed-bubble font-mono min-w-0 max-w-full whitespace-normal"
      style={{ borderColor: `color-mix(in srgb, ${ink} 25%, transparent)` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 text-left text-[12px]"
        aria-expanded={isOpen}
      >
        {state === 'running' ? (
          <Loader2 className="w-3 h-3 shrink-0 animate-spin" style={{ color: ink }} />
        ) : state === 'failed' ? (
          <X className="w-3 h-3 shrink-0" style={{ color: 'var(--line-scarlet, crimson)' }} />
        ) : (
          <Check className="w-3 h-3 shrink-0" style={{ color: ink }} />
        )}
        <span className="font-bold">{label}</span>
        {target && <span className="truncate opacity-60">{target}</span>}
        <span className="ml-auto shrink-0 opacity-50">
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>
      {isOpen && (
        <div className="mt-2 space-y-2 border-t pt-2" style={{ borderColor: `color-mix(in srgb, ${ink} 20%, transparent)` }}>
          <div className="text-[10px] opacity-60 font-bold">input</div>
          <pre className="terminal-container w-full text-[10px] leading-relaxed max-h-40 overflow-auto"><code>{JSON.stringify(input ?? {}, null, 2)}</code></pre>
          {output !== undefined && (
            <>
              <div className="text-[10px] opacity-60 font-bold">{state === 'failed' ? 'error' : 'result'}</div>
              <pre className="terminal-container w-full text-[10px] leading-relaxed max-h-56 overflow-auto"><code>{typeof output === 'string' ? output.slice(0, 6000) : JSON.stringify(output, null, 2)?.slice(0, 6000)}</code></pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── report/long-message accordion row ──────────────────────────────────

/** Derive a short title from report markdown: first heading, or first
 * sentence, or ellipsized body. */
function reportTitle(text: string): string {
  const heading = text.match(/^#{1,3}\s+(.+)/m);
  if (heading) return heading[1].trim().slice(0, 60);
  const firstLine = text
    .split('\n')
    .map((l) => l.replace(/[#*`>|-]/g, '').trim())
    .find((l) => l.length > 10);
  if (firstLine) return firstLine.slice(0, 60);
  return text.replace(/\s+/g, ' ').slice(0, 57) + '…';
}

// one artifact-card action button: distinct palette color + hover tooltip
function ArtifactAction({
  tip,
  color,
  onClick,
  children,
}: {
  tip: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className="relative group">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 rounded-[4px] border px-1.5 py-0.5 hover:opacity-100 transition-opacity"
        style={{ borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }}
      >
        {children}
      </button>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded-[4px] border px-1.5 py-0.5 text-[9px] z-10"
        style={{
          borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
          color,
          background: 'var(--background, #fff)',
        }}
      >
        {tip}
      </span>
    </span>
  );
}

function ReportRow({
  ink,
  title,
  body,
  isOpen,
  onToggle,
}: {
  ink: string;
  title: string;
  body: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [rawView, setRawView] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (permissions/insecure ctx) — no-op */
    }
  };

  const downloadBody = () => {
    const slug =
      (title || 'report')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'report';
    const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="feed-bubble font-mono min-w-0 max-w-full whitespace-normal"
      style={{ borderColor: `color-mix(in srgb, ${ink} 25%, transparent)` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 text-left text-[12px]"
        aria-expanded={isOpen}
      >
        <FileText className="w-3 h-3 shrink-0" style={{ color: ink }} />
        <span className="font-bold truncate">{title}</span>
        <span className="ml-auto shrink-0 opacity-50">
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>
      {!isOpen && (
        <p className="mt-1 text-[10px] opacity-50 truncate pl-5">
          {body.replace(/[#*`>|-]/g, ' ').trim().slice(0, 100)}…
        </p>
      )}
      {isOpen && (
        <>
          {/* artifact actions — copy, download, render/raw toggle; each with
              its own palette color and a hover tooltip */}
          <div className="mt-2 flex items-center gap-1.5 text-[10px]">
            <ArtifactAction tip="Copy report markdown to clipboard" color="var(--line-cobalt)" onClick={copyBody}>
              {copied ? (
                <Check className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--line-cobalt)' }} />
              ) : (
                <CopyIcon className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--line-cobalt)' }} />
              )}
              <span style={{ color: 'var(--line-cobalt)' }}>{copied ? 'Copied' : 'Copy'}</span>
            </ArtifactAction>
            <ArtifactAction tip="Download this report as a .md file" color="var(--line-green)" onClick={downloadBody}>
              <Download className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--line-green)' }} />
              <span style={{ color: 'var(--line-green)' }}>Download</span>
            </ArtifactAction>
            <ArtifactAction
              tip={rawView ? 'Render the markdown' : 'Show the raw markdown source'}
              color="var(--line-amber)"
              onClick={() => setRawView((v) => !v)}
            >
              {rawView ? (
                <Eye className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--line-amber)' }} />
              ) : (
                <Code2 className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--line-amber)' }} />
              )}
              <span style={{ color: 'var(--line-amber)' }}>{rawView ? 'Render' : 'Raw'}</span>
            </ArtifactAction>
          </div>
          <div className="mt-2 border-t pt-2" style={{ borderColor: `color-mix(in srgb, ${ink} 20%, transparent)` }}>
            {rawView ? (
              <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed opacity-90">{body}</pre>
            ) : (
              <div className="md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── the solo session (design intact, engine real) ──────────────────────

interface SessionChip {
  id: string;
  title: string;
}

function SoloSession({ agent, onDone }: { agent: LiveAgent; onDone: (label: string) => void }) {
  const meta = agentMeta(agent.id);
  const [task, setTask] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const doneFiredRef = useRef(false);
  const titlePatchedRef = useRef<string | null>(null);

  // ── multi-thread state: sessions list + active thread ──────────────
  const [sessions, setSessions] = useState<SessionChip[]>([]);
  const [activeThread, setActiveThread] = useState<string | undefined>(undefined);
  const activeThreadRef = useRef<string | undefined>(undefined);
  activeThreadRef.current = activeThread;

  // accordion: only one canvas panel open at a time (tool or report)
  const [openId, setOpenId] = useState<string | null>(null);

  // rename state: which session chip is being edited
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // track which tool groups are expanded (to show individual pills)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function startRename(s: SessionChip) {
    setRenamingId(s.id);
    setRenameText(s.title);
  }

  async function commitRename() {
    if (!renamingId) return;
    const title = renameText.trim().slice(0, 60) || 'Untitled';
    setRenamingId(null);
    setSessions((prev) =>
      prev.map((c) => (c.id === renamingId ? { ...c, title } : c)),
    );
    try {
      await fetch(`/api/power-agents/threads/${renamingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
    } catch { /* optimistic — server sync is best-effort */ }
  }

  const refreshSessions = async () => {
    try {
      const res = await fetch(`/api/power-agents/threads?agentKey=${agent.id}`);
      if (res.status === 401) redirectToLogin();
      if (res.ok) setSessions(await res.json());
    } catch { /* list is best-effort */ }
  };

  useEffect(() => {
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  const { messages, setMessages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/power-agents/chat',
      prepareSendMessagesRequest: ({
        id, messages: chatMessages, trigger, requestMetadata, api, headers, body, credentials,
      }) => ({
        id, trigger, requestMetadata, api, headers, credentials,
        body: {
          ...(body as Record<string, unknown> | undefined),
          assistantId: agent.assistantId,
          agentKey: agent.id,
          threadId: activeThreadRef.current,
          messages: chatMessages.map((m) => ({
            role: m.role,
            content: m.parts?.map((p) => (p.type === 'text' ? p.text : '')).join(''),
          })),
        },
      }),
    }),
    // capture the thread id emitted as a data part by the bridge, auto-title
    onFinish: (options) => {
      const message = options.message;
      const part = message.parts?.find(
        (p: { type: string }) => p.type === 'data-thread-id',
      ) as unknown as { type: string; data?: string[] } | undefined;
      const id = part?.data?.[0];
      if (id && id !== activeThreadRef.current) {
        setActiveThread(id);
        activeThreadRef.current = id;
        setSessions((s) =>
          s.some((c) => c.id === id) ? s : [{ id, title: 'New session' }, ...s],
        );
      }
      // first reply in an untitled session: auto-title from context
      const chip = sessions.find((c) => c.id === (id ?? activeThreadRef.current));
      if (chip && (chip.title === 'New session' || !chip.title) && titlePatchedRef.current !== chip.id) {
        titlePatchedRef.current = chip.id;
        // prefer the agent's opening line (contextual), fallback to user text
        const agentLine = options.message.parts
          ?.filter((p: { type: string }) => p.type === 'text')
          .map((p: { type: string; text?: string }) => p.text ?? '')
          .join('')
          .split(/[.!?\n]/)
          .map((s: string) => s.replace(/[#*`>-]/g, '').trim())
          .find((s: string) => s.length > 15) ?? '';
        const userText =
          messages
            .filter((m) => m.role === 'user')
            .map((m) =>
              m.parts?.map((p) => (p.type === 'text' ? p.text : '')).join(''),
            )
            .filter(Boolean)
            .pop() ?? '';
        const title =
          (agentLine || userText).trim().slice(0, 48) || 'New session';
        fetch(`/api/power-agents/threads/${chip.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        }).then(refreshSessions).catch(() => {});
      } else {
        refreshSessions();
      }
    },
  });

  async function newSession() {
    if (busy) stop(); // kill active stream before starting fresh
    try {
      const res = await fetch('/api/power-agents/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentKey: agent.id, assistantId: agent.assistantId }),
      });
      if (res.ok) {
        const t = (await res.json()) as SessionChip;
        setSessions((s) => [t, ...s]);
        setActiveThread(t.id);
        activeThreadRef.current = t.id;
        setMessages([]);
      }
    } catch { /* keep current session on failure */ }
  }

  async function switchSession(id: string) {
    if (id === activeThread) return;
    // kill any active stream to prevent old-session parts bleeding in
    if (busy) stop();

    try {
      const res = await fetch(`/api/power-agents/threads/${id}`);
      if (res.status === 401) redirectToLogin();
      if (res.status === 404) {
        // session was deleted out from under this tab (another tab,
        // backend cleanup) — drop the stale chip
        setSessions((s) => s.filter((c) => c.id !== id));
        return;
      }
      if (!res.ok) return;
      const t = (await res.json()) as {
        messages: Array<Record<string, unknown>>;
        busy?: boolean;
      };
      setActiveThread(id);
      activeThreadRef.current = id;
      setMessages(t.messages as any);

      // if this thread has an active run, join its live stream
      // for token-level resume
      if (t.busy) {
        joinActiveStream(id);
      }
    } catch { /* stay on current */ }
  }

  /** Attach to a running stream on a thread and feed parts into messages. */
  async function joinActiveStream(threadId: string) {
    try {
      const res = await fetch(`/api/power-agents/threads/${threadId}/join`);
      if (!res.ok || !res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let joinedText = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, '');
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;

          let part: Record<string, unknown>;
          try {
            part = JSON.parse(data);
          } catch { continue; }

          if (part.type === 'text-delta') {
            joinedText += part.delta as string;
            // update the last assistant message's text
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role === 'assistant') {
                  const msg = { ...next[i] };
                  const parts = [...(msg.parts ?? [])];
                  // find or create the streaming text part
                  const textIdx = parts.findIndex(
                    (p: { type: string }) => p.type === 'text',
                  );
                  if (textIdx >= 0) {
                    parts[textIdx] = {
                      ...parts[textIdx],
                      type: 'text',
                      text: joinedText,
                      state: 'streaming',
                    };
                  } else {
                    parts.push({ type: 'text', text: joinedText, state: 'streaming' });
                  }
                  msg.parts = parts;
                  next[i] = msg;
                  break;
                }
              }
              return next;
            });
          } else if (part.type === 'finish') {
            // mark the text part as done
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role === 'assistant') {
                  const msg = { ...next[i] };
                  msg.parts = (msg.parts ?? []).map(
                    (p: any) =>
                      p.type === 'text' ? { ...p, state: 'done' } : p,
                  );
                  next[i] = msg;
                  break;
                }
              }
              return next;
            });
            refreshSessions();
            return;
          }
 else if (part.type === 'data-no-active-run') {
            return; // run finished between our check and the join
          }
        }
      }
    } catch {
      /* join is best-effort */
    }
  }

  async function deleteSession(id: string) {
    if (busy) stop(); // kill active stream before deleting
    try {
      const res = await fetch(`/api/power-agents/threads/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) return; // 404 = already gone, proceed
    } catch { return; }
    setSessions((s) => s.filter((c) => c.id !== id));
    if (id === activeThread) {
      setActiveThread(undefined);
      activeThreadRef.current = undefined;
      setMessages([]);
    }
  }

  const busy = status === 'submitted' || status === 'streaming';

  // avatar+dots working row: shows whenever the turn is busy and nothing is
  // visibly streaming — before the first assistant row, and mid-turn during
  // model thinking or collapsed tool runs. Active text (cursor) and visible
  // tool spinners suppress it.
  const lastMsg = messages[messages.length - 1];
  const showWorkingRow =
    busy &&
    !(lastMsg?.role === 'assistant' && (lastMsg.parts ?? []).some(isPartActive));

  const lastAssistantText = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant');
    return last?.parts?.map((p) => (p.type === 'text' ? p.text : '')).join('') ?? '';
  }, [messages]);

  // tool execution trace, in order, across all assistant turns —
  // rendered in the execution_canvas (not the chat feed)
  const toolTrace = useMemo(() => {
    const trace: Array<{
      key: string; toolName: string; state: 'running' | 'complete' | 'failed';
      input: unknown; output?: unknown;
    }> = [];
    for (const m of messages) {
      if (m.role !== 'assistant') continue;
      for (const part of m.parts ?? []) {
        if (!part.type.startsWith('tool-')) continue;
        const tp = part as unknown as {
          type: string; toolCallId: string; state: string;
          input?: unknown; output?: unknown;
        };
        // AI SDK 5 tool parts encode the name in the type ("tool-read_file");
        // there is no separate toolName field
        const partToolName = tp.type.slice('tool-'.length) || 'tool';
        trace.push({
          key: `${m.id}:${tp.toolCallId}`,
          toolName: partToolName,
          state:
            tp.state === 'input-streaming' || tp.state === 'input-available'
              ? 'running'
              : tp.state === 'output-error'
                ? 'failed'
                : 'complete',
          input: tp.input,
          output: tp.output,
        });
      }
    }
    return trace;
  }, [messages]);

  // all long assistant messages → report accordions for the canvas
  const reportAccordions = useMemo(() => {
    const reports: Array<{ key: string; title: string; body: string }> = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role !== 'assistant') continue;
      const text = m.parts
        ?.map((p) => (p.type === 'text' ? p.text : ''))
        .join('')
        .trim();
      if (text && text.length > 500) {
        reports.push({
          key: `report-${i}`,
          title: reportTitle(text),
          body: text,
        });
      }
    }
    return reports;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, busy]);

  useEffect(() => {
    if (busy) { doneFiredRef.current = false; return; }
    if (lastAssistantText && !doneFiredRef.current) {
      doneFiredRef.current = true;
      onDone(meta.handle);
    }
  }, [busy, lastAssistantText, onDone, meta.handle]);

  async function send() {
    const text = task.trim();
    if (!text || busy) return;
    setTask('');
    await sendMessage({ text });
  }

  // sending clears the text but the onChange auto-grow leaves a stale inline
  // height — collapse back to the resting single-line style whenever the
  // composer is empty
  const taskInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!task && taskInputRef.current) {
      taskInputRef.current.style.height = 'auto';
    }
  }, [task]);

  return (
    <>
      <section className="w-full lg:w-[420px] xl:w-[460px] shrink-0 border-b lg:border-b-0 lg:border-r agency-border flex flex-col min-h-[50vh] lg:min-h-0 relative z-20">
        <div className="h-14 px-3 sm:px-5 border-b agency-border flex items-center gap-2 sm:gap-2.5 shrink-0">
          <span className="w-6 h-6 rounded-[5px] flex items-center justify-center shrink-0" style={{ border: `1.5px solid ${meta.ink}` }}>
            <DemoIcon name={meta.icon} className="w-3 h-3" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold font-mono leading-tight truncate">{meta.handle}</h2>
            <p className="text-[10px] font-mono opacity-50 leading-tight truncate hidden sm:block">{meta.role}</p>
          </div>
          <span className="ml-auto text-[10px] font-mono opacity-50 shrink-0">{busy ? 'streaming…' : 'online'}</span>
        </div>

        {/* sessions strip: switch context / new / delete (per-agent threads) */}
        <div className="flex-wrap sm:flex-nowrap flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b agency-border overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={newSession}
            disabled={busy}
            className="shrink-0 flex items-center gap-1 rounded-[6px] border px-2 py-1 text-[10px] font-mono font-bold hover:border-[var(--hairline-strong)] disabled:opacity-40"
            style={{ borderColor: `color-mix(in srgb, ${meta.ink} 30%, transparent)` }}
            title="Start a new session (fresh context)"
          >
            <Plus className="w-3 h-3" /> new_session
          </button>
          {sessions.map((s) => {
            const active = s.id === activeThread;
            const isRenaming = renamingId === s.id;
            return (
              <span
                key={s.id}
                className={`shrink-0 group flex items-center gap-1 rounded-[6px] border px-2 py-1 text-[10px] font-mono max-w-[180px] ${active ? '' : 'opacity-60 hover:opacity-100'}`}
                style={{
                  borderColor: active
                    ? `color-mix(in srgb, ${meta.ink} 55%, transparent)`
                    : 'var(--hairline)',
                  background: active
                    ? `color-mix(in srgb, ${meta.ink} 8%, transparent)`
                    : 'transparent',
                }}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="w-[120px] bg-transparent outline-none border-b pb-0.5 text-[10px] font-mono"
                    style={{ borderBottomColor: meta.ink }}
                    placeholder="Session name…"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => switchSession(s.id)}
                    onDoubleClick={() => startRename(s)}
                    className="truncate"
                    title={`${s.title} (double-click to rename)`}
                  >
                    {s.title}
                  </button>
                )}
                {!isRenaming && (
                  <button
                    type="button"
                    onClick={() => deleteSession(s.id)}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100"
                    aria-label={`Delete session: ${s.title}`}
                    title="Delete session"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-3.5">
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="feed-row flex-row-reverse">
                <span className="feed-avatar">
                  <span className="text-[11px] font-bold font-mono">V</span>
                </span>
                <div className="flex-1 min-w-0 flex" style={{ justifyContent: 'flex-end' }}>
                  <div className="feed-bubble font-mono max-w-[92%] sm:max-w-[85%]">
                    {m.parts?.map((p, i) => (p.type === 'text' ? <span key={i}>{p.text}</span> : null))}
                  </div>
                </div>
              </div>
            ) : (m.parts ?? []).some(
                (p) => p.type === 'text' || p.type.startsWith('tool-'),
              ) ? (
              <div key={m.id} className="feed-row">
                <span className="feed-avatar" style={{ borderColor: meta.ink }}>
                  <DemoIcon name={meta.icon} className="w-3.5 h-3.5" />
                </span>
                <div className="flex-1 min-w-0 space-y-2">
                  {(() => {
                    // pre-group consecutive tool parts for compact rendering
                    type ToolInfo = { idx: number; name: string; state: string };
                    const items: Array<
                      | { kind: 'text'; idx: number; part: unknown }
                      | { kind: 'tool'; idx: number; name: string; state: string }
                      | { kind: 'toolgroup'; key: string; tools: ToolInfo[] }
                    > = [];
                    let toolRun: ToolInfo[] = [];
                    const flushRun = () => {
                      if (toolRun.length === 0) return;
                      const key = `grp-${m.id}-${toolRun[0].idx}`;
                      if (toolRun.length <= 3) {
                        // small run: render individually
                        for (const t of toolRun) {
                          items.push({ kind: 'tool', ...t });
                        }
                      } else {
                        // large run: collapse into a group
                        items.push({ kind: 'toolgroup', key, tools: [...toolRun] });
                      }
                      toolRun = [];
                    };
                    (m.parts ?? []).forEach((part, i) => {
                      if (part.type.startsWith('tool-')) {
                        const tp = part as unknown as { state: string };
                        toolRun.push({
                          idx: i,
                          name: toolLabel(part.type.slice(5)),
                          state: tp.state,
                        });
                      } else {
                        flushRun();
                        if (part.type === 'text' && part.text) {
                          items.push({ kind: 'text', idx: i, part });
                        }
                      }
                    });
                    flushRun();

                    return items.map((item) => {
                      if (item.kind === 'text') {
                        const part = item.part as { type: string; text: string; state?: string };
                        const isLong = part.text.length > 500;

                        if (isLong && part.state !== 'streaming') {
                          return (
                            <div
                              key={item.idx}
                              className="feed-bubble font-mono max-w-[92%] sm:max-w-[85%] flex items-center gap-2 !py-1.5 text-[10px] opacity-50"
                              style={{ borderColor: 'transparent' }}
                            >
                              <FileText className="w-3 h-3 shrink-0" style={{ color: meta.ink }} />
                              <span className="italic">Report generated — see execution canvas</span>
                            </div>
                          );
                        }

                        return (
                          <div key={item.idx} className="feed-bubble font-mono max-w-[92%] sm:max-w-[85%]">
                            <div className="md">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {part.text}
                              </ReactMarkdown>
                            </div>
                            {part.state === 'streaming' && (
                              <span className="inline-block w-[6px] h-3.5 ml-0.5 animate-pulse align-middle" style={{ background: meta.ink }} />
                            )}
                          </div>
                        );
                      }

                      if (item.kind === 'tool') {
                        const running = item.state === 'input-streaming' || item.state === 'input-available';
                        const failed = item.state === 'output-error';
                        return (
                          <div
                            key={item.idx}
                            className="feed-bubble font-mono max-w-[92%] sm:max-w-[85%] flex items-center gap-2 !py-1.5 text-[11px]"
                            style={{ borderColor: `color-mix(in srgb, ${meta.ink} 20%, transparent)` }}
                          >
                            {running ? (
                              <Loader2 className="w-3 h-3 shrink-0 animate-spin" style={{ color: meta.ink }} />
                            ) : failed ? (
                              <X className="w-3 h-3 shrink-0" style={{ color: 'var(--line-scarlet, crimson)' }} />
                            ) : (
                              <Check className="w-3 h-3 shrink-0" style={{ color: meta.ink }} />
                            )}
                            <span className="font-bold" style={{ color: meta.ink }}>{item.name}</span>
                            {running && <span className="opacity-50">…</span>}
                          </div>
                        );
                      }

                      // toolgroup: slim row + count badge for 4+ consecutive tool calls
                      const isExpanded = expandedGroups.has(item.key);
                      const allSameName = item.tools.every((t) => t.name === item.tools[0].name);
                      const anyRunning = item.tools.some(
                        (t) => t.state === 'input-streaming' || t.state === 'input-available',
                      );
                      const anyFailed = item.tools.some((t) => t.state === 'output-error');
                      const label = allSameName ? item.tools[0].name : 'steps';
                      return (
                        <div key={item.key} className="space-y-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedGroups((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.key)) next.delete(item.key);
                                else next.add(item.key);
                                return next;
                              })
                            }
                            className="feed-bubble font-mono max-w-[92%] sm:max-w-[85%] w-full flex items-center gap-2 !py-1 text-[11px] text-left"
                            style={{ borderColor: `color-mix(in srgb, ${meta.ink} 15%, transparent)` }}
                          >
                            {anyRunning ? (
                              <Loader2 className="w-3 h-3 shrink-0 animate-spin" style={{ color: meta.ink }} />
                            ) : anyFailed ? (
                              <X className="w-3 h-3 shrink-0" style={{ color: 'var(--line-scarlet, crimson)' }} />
                            ) : (
                              <Check className="w-3 h-3 shrink-0" style={{ color: meta.ink }} />
                            )}
                            <span className="font-bold truncate" style={{ color: meta.ink }}>{label}</span>
                            <span
                              className="ml-auto shrink-0 flex items-center justify-center rounded-full text-[9px] font-bold leading-none"
                              style={{
                                minWidth: '18px',
                                height: '18px',
                                padding: '0 4px',
                                background: `color-mix(in srgb, ${meta.ink} 12%, transparent)`,
                                color: meta.ink,
                                border: `1px solid color-mix(in srgb, ${meta.ink} 30%, transparent)`,
                              }}
                            >
                              {item.tools.length}
                            </span>
                            <span
                              className="shrink-0 opacity-30 transition-transform"
                              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            >
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="space-y-1 pl-4">
                              {item.tools.map((t) => (
                                <div
                                  key={t.idx}
                                  className="flex items-center gap-2 text-[12px] opacity-90"
                                >
                                  {t.state === 'output-error' ? (
                                    <X className="w-3 h-3 shrink-0" style={{ color: 'var(--line-scarlet, crimson)' }} />
                                  ) : (
                                    <Check className="w-3 h-3 shrink-0" style={{ color: meta.ink }} />
                                  )}
                                  <span style={{ color: meta.ink }}>{t.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : null,
          )}

          {/* working row — agent avatar + typing dots; one rule for both
              pre-first-part and mid-turn thinking gaps */}
          {showWorkingRow && (
            <div className="feed-row">
              <span className="feed-avatar" style={{ borderColor: meta.ink }}>
                <DemoIcon name={meta.icon} className="w-3.5 h-3.5" />
              </span>
              <span className="feed-bubble h-9 flex items-center gap-1.5" style={{ borderColor: `color-mix(in srgb, ${meta.ink} 40%, transparent)` }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: meta.ink }} />
                ))}
              </span>
            </div>
          )}

          {error && (
            <div className="feed-bubble font-mono max-w-full" style={{ borderColor: 'color-mix(in srgb, crimson 40%, transparent)' }}>
              <span className="text-[11px]">
                {String(error).includes('session expired') || String(error).includes('401')
                  ? 'Your session has expired. Please sign in again to continue.'
                  : String(error).includes('session no longer exists')
                    ? 'This session is no longer available. Start a new session to continue.'
                    : String(error).includes('network') || String(error).includes('fetch')
                      ? 'Connection interrupted. Please check your internet and try again.'
                      : 'Something went wrong sending your message. Please try again, or start a new session if the issue persists.'}
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-2 sm:p-3.5 border-t agency-border shrink-0">
          <div className="cli-input-wrapper">
            <span className="font-mono text-xs mb-0.5" style={{ color: 'var(--line-green)' }}>&gt;</span>
            <textarea
              ref={taskInputRef}
              rows={1}
              value={task}
              placeholder="Assign solo task..."
              className="cli-input"
              onChange={(e) => {
                setTask(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
            />
            <button
              type="button"
              className="text-[var(--ink-dim)] hover:text-[var(--ink)] shrink-0 mb-0.5"
              onClick={() => (busy ? stop() : send())}
              aria-label={busy ? 'Stop generation' : 'Send task'}
            >
              {busy ? <X className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </section>

      <section className="flex-1 hidden md:flex flex-col min-h-[280px] overflow-hidden">
        <div className="h-14 px-3 sm:px-5 md:px-7 border-b agency-border flex items-center shrink-0">
          <h2 className="text-sm font-bold font-mono">Execution Canvas</h2>
          {status === 'streaming' && (
            <Loader2 className="w-3.5 h-3.5 ml-3 animate-spin opacity-60" />
          )}
          {reportAccordions.length > 0 && (
            <span className="ml-auto text-[10px] font-mono opacity-50 shrink-0">
              {reportAccordions.length} report{reportAccordions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex-1 p-3 sm:p-4 md:p-5 overflow-y-auto">
          {reportAccordions.length > 0 ? (
            <div className="space-y-2">
              {/* reports only — tool calls live in the conversation feed */}
              {reportAccordions.map((r) => (
                <ReportRow
                  key={r.key}
                  ink={meta.ink}
                  title={r.title}
                  body={r.body}
                  isOpen={openId === r.key}
                  onToggle={() => setOpenId(prev => prev === r.key ? null : r.key)}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-[var(--ink-faint)]">
              <div>
                <TerminalSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-xs font-mono">Awaiting report generation.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// ── page shell (unchanged layout; roster is live) ──────────────────────

export default function DemoPowerAgentsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loadError, setLoadError] = useState<string>('');
  const toastedRef = useRef<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/power-agents')
      .then((r) => (r.status === 401 ? redirectToLogin() : r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((list: LiveAgent[]) => {
        setAgents(list);
        const first = list.find((a) => a.id === 'crawlability_audit') ?? list[0];
        if (first) setSelectedId(first.id);
      })
      .catch((e) => setLoadError(String(e)));
  }, []);

  const selected = agents.find((a) => a.id === selectedId) ?? null;
  const pushToast = useOS((s) => s.pushToast);

  return (
    <div className="absolute inset-0 flex flex-col z-20 fade-in">
      {/* full-bleed on desktop — the execution canvas (flex-1) absorbs the
          extra width; the sidebar and feed keep their fixed sizes */}
      <div className="flex flex-col flex-1 min-h-0 w-full">
      <header className="flex justify-between items-end px-4 sm:px-8 md:px-10 py-3 sm:py-5 shrink-0 border-b agency-border">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" style={{ color: 'var(--line-green)' }} /> Power Agents
          </h1>
          {loadError && (
            <p className="text-[10px] font-mono mt-1 opacity-60">
              Agents are unavailable right now — the service may be restarting. Refresh in a moment.
            </p>
          )}
        </div>
        <p className="label-rule hidden md:block">live · {agents.length} agents</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">

        {/* Mobile agent picker — visible below lg where the sidebar is hidden */}
        <div className="lg:hidden px-3 py-2 border-b agency-border shrink-0 flex items-center gap-2 overflow-x-auto">
          <select
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); toastedRef.current = ''; }}
            className="flex-1 min-w-0 rounded-md border bg-background px-2 py-1.5 text-xs font-mono"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {agentMeta(a.id).handle} — {agentMeta(a.id).role}
              </option>
            ))}
          </select>
        </div>

        <aside
          className={`hidden lg:flex shrink-0 border-b lg:border-b-0 lg:border-r agency-border agency-panel z-30 flex-col lg:min-h-0 transition-[width] duration-200 ${
            sidebarCollapsed ? 'lg:w-[56px]' : 'lg:w-64'
          }`}
        >
          {/* header with collapse toggle */}
          <div className="hidden lg:flex h-14 border-b agency-border items-center shrink-0 px-3">
            {!sidebarCollapsed && <p className="label-rule flex-1 truncate">Power Agents</p>}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded hover:bg-muted/40 shrink-0 ml-auto"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 opacity-50" />
              ) : (
                <ChevronLeft className="w-4 h-4 opacity-50" />
              )}
            </button>
          </div>

          <div className="hidden lg:flex lg:flex-col gap-2 overflow-y-auto lg:flex-1 lg:min-h-0" style={{ padding: sidebarCollapsed ? '0.5rem 0.375rem' : '0.75rem' }}>
            {(['SEO Audit Suite', 'Website Content Suite', 'DevOps Suite', 'Shopify Suite', 'WordPress Suite'] as const).map((suite) => {
              const suiteAgents = agents.filter((a) => agentMeta(a.id).suite === suite);
              if (!suiteAgents.length) return null;
              const suiteInk =
                suite === 'SEO Audit Suite'
                  ? INK.audit
                  : suite === 'DevOps Suite'
                    ? INK.devops
                    : suite === 'Shopify Suite'
                      ? INK.shopify
                      : suite === 'WordPress Suite'
                        ? INK.wordpress
                        : INK.content;
              return (
                <div key={suite} className="flex lg:flex-col gap-2 lg:min-w-0">
                  {!sidebarCollapsed && (
                    <p
                      className="label-rule shrink-0 hidden lg:block"
                      style={{ color: suiteInk }}
                    >
                      {suite.toLowerCase().replace(/\s+/g, '_')}
                    </p>
                  )}
                  {sidebarCollapsed && (
                    <div className="h-px shrink-0 my-1" style={{ background: 'var(--hairline)' }} />
                  )}
                  {suiteAgents.map((a) => {
                    const meta = agentMeta(a.id);
                    const isActive = selectedId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setSelectedId(a.id); toastedRef.current = ''; }}
                        className={
                          sidebarCollapsed
                            ? isActive
                              ? '!px-0 !py-1.5 flex justify-center rounded-lg cursor-pointer'
                              : '!px-0 !py-1.5 flex justify-center rounded-lg cursor-pointer hover:bg-muted/40 transition-colors'
                            : isActive
                              ? 'thread-block min-w-0 is-active'
                              : 'min-w-0 rounded-lg cursor-pointer px-3 py-1.5 hover:bg-muted/40 transition-colors text-left'
                        }
                        style={
                          isActive
                            ? {
                                background: `color-mix(in srgb, ${meta.ink} 10%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${meta.ink} 30%, transparent)`,
                              }
                            : undefined
                        }
                        title={`${meta.name} — ${meta.role}`}
                      >
                        <span className={`flex items-center ${sidebarCollapsed ? '' : 'gap-2.5'}`}>
                          <span
                            className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 transition-[border-color]"
                            style={{
                              border: 'none',
                            }}
                          >
                            <DemoIcon name={meta.icon} className="w-3.5 h-3.5" />
                          </span>
                          {!sidebarCollapsed && (
                            <span className="min-w-0">
                              <span className="block text-xs font-bold font-mono truncate">{meta.handle}</span>
                              <span className="block text-[10px] font-mono opacity-50 truncate">{meta.role}</span>
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </aside>

        {selected ? (
          <SoloSession
            key={selected.id}
            agent={selected}
            onDone={(handle) => {
              if (toastedRef.current === handle + selected.id) return;
              toastedRef.current = handle + selected.id;
              pushToast(`${handle} finished the solo task`, 'success');
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--ink-faint)]">
            <Zap className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-xs font-mono">Select an agent to begin a solo session.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
