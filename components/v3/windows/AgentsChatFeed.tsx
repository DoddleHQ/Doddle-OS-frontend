'use client';

import { useState } from 'react';
import { Wrench, ChevronDown, UserRound } from 'lucide-react';
import type { UIMessage } from 'ai';
import type { V3Agent } from '@/lib/v3/powerAgents';
import { SUITE_TINT } from '@/lib/v3/powerAgents';
import { V3Markdown } from '@/components/v3/ui/V3Markdown';

export function ChatFeed({ messages, agent }: { messages: UIMessage[]; agent?: V3Agent }) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const tint = agent ? SUITE_TINT[agent.suite] : undefined;
  const Avatar = agent?.icon;

  type ToolInfo = { key: string; name: string; state: string };
  type Item =
    | { kind: 'user'; key: string; text: string; time: string | null }
    | { kind: 'text'; key: string; text: string; time: string | null }
    | { kind: 'tool'; tool: ToolInfo }
    | { kind: 'toolgroup'; key: string; label: string; tools: ToolInfo[] };

  const timeOf = (m: UIMessage): string | null => {
    const t = (m as { createdAt?: unknown }).createdAt;
    if (!t) return null;
    const d = t instanceof Date ? t : new Date(String(t));
    if (Number.isNaN(d.getTime())) return null;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const items: Item[] = [];
  let toolRun: ToolInfo[] = [];
  const flushRun = () => {
    if (toolRun.length === 0) return;
    const byName = new Map<string, ToolInfo[]>();
    toolRun.forEach((t) => {
      const list = byName.get(t.name) ?? [];
      list.push(t);
      byName.set(t.name, list);
    });
    byName.forEach((tools, name) => {
      if (tools.length === 1) {
        items.push({ kind: 'tool', tool: tools[0] });
      } else {
        items.push({ kind: 'toolgroup', key: `grp-${name}-${items.length}`, tools, label: name });
      }
    });
    toolRun = [];
  };

  messages.forEach((m) => {
    const time = timeOf(m);
    if (m.role === 'user') {
      flushRun();
      const text = m.parts?.map((p) => (p.type === 'text' ? (p as { text?: string }).text ?? '' : '')).join('');
      if (text) items.push({ kind: 'user', key: `usr-${m.id}`, text, time });
      return;
    }
    (m.parts ?? []).forEach((p, i) => {
      if (p.type.startsWith('tool-')) {
        const tp = p as unknown as { toolCallId?: string; state?: string };
        toolRun.push({ key: `${m.id}-${tp.toolCallId ?? i}`, name: p.type.slice('tool-'.length) || 'tool', state: tp.state ?? '' });
      } else {
        flushRun();
        if (p.type === 'text' && (p as { text?: string }).text) {
          items.push({ kind: 'text', key: `txt-${m.id}-${i}`, text: (p as { text: string }).text, time });
        }
      }
    });
  });
  flushRun();

  const toolState = (state: string): 'running' | 'failed' | 'done' =>
    state === 'input-streaming' || state === 'input-available' ? 'running' : state === 'output-error' ? 'failed' : 'done';

  const toolRow = (t: ToolInfo, className = '') => {
    const st = toolState(t.state);
    return (
      <p key={t.key} className={`v3-tool-row font-mono text-[10px] ${className}${st === 'running' ? ' running' : ''}${st === 'failed' ? ' failed' : ''}`}>
        <Wrench size={10} style={{ display: 'inline', verticalAlign: '-1px' }} /> {t.name}
        {st === 'running' ? ' · running…' : st === 'failed' ? ' · failed' : ' · done'}
      </p>
    );
  };

  return (
    <>
      {items.map((item) => {
        if (item.kind === 'user') {
          return (
            <div key={item.key} className="v3-cmsg v3-msg-user">
              <span className="v3-cavatar" aria-hidden="true">
                <UserRound size={15} />
              </span>
              <span className="v3-cbody">
                <span className="v3-chead">
                  <span className="v3-cname">you</span>
                  {item.time && <span className="v3-ctime">{item.time}</span>}
                </span>
                <span className="v3-cbubble v3-cbubble-user">
                  <span className="v3-msg-prompt">$</span>
                  <span className="font-mono text-xs">{item.text}</span>
                </span>
              </span>
            </div>
          );
        }
        if (item.kind === 'text') {
          return (
            <div key={item.key} className="v3-cmsg v3-msg-assistant">
              <span className="v3-cavatar" style={tint ? { background: tint.bg, color: tint.color } : undefined} aria-hidden="true">
                {Avatar && <Avatar size={15} />}
              </span>
              <span className="v3-cbody">
                <span className="v3-chead">
                  <span className="v3-cname">{agent?.handle ?? 'agent'}</span>
                  {item.time && <span className="v3-ctime">{item.time}</span>}
                </span>
                <span className="v3-cbubble">
                  <V3Markdown>{item.text}</V3Markdown>
                </span>
              </span>
            </div>
          );
        }
        if (item.kind === 'tool') return toolRow(item.tool);

        const anyRunning = item.tools.some((t) => toolState(t.state) === 'running');
        const anyFailed = item.tools.some((t) => toolState(t.state) === 'failed');
        const label = item.label;
        const expanded = expandedGroups.has(item.key);
        return (
          <div key={item.key} className="v3-tool-group">
            <button
              type="button"
              className={`v3-tool-row v3-tool-group-head font-mono text-[10px]${anyRunning ? ' running' : ''}${anyFailed ? ' failed' : ''}`}
              aria-expanded={expanded}
              onClick={() =>
                setExpandedGroups((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.key)) next.delete(item.key);
                  else next.add(item.key);
                  return next;
                })
              }
            >
              <Wrench size={10} style={{ display: 'inline', verticalAlign: '-1px' }} />
              <span className="truncate">{label}</span>
              <span className="v3-tool-count">×{item.tools.length}</span>
              <ChevronDown size={10} className="v3-tool-chev" style={{ display: 'inline', verticalAlign: '-1px' }} />
            </button>
            {expanded && item.tools.map((t) => toolRow(t, 'v3-tool-child '))}
          </div>
        );
      })}
    </>
  );
}
