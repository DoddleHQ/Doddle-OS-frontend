'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, TerminalSquare, Zap } from 'lucide-react';
import { AGENTS } from '@/lib/demo/data';
import { DemoIcon } from '@/lib/demo/icons';
import { useOS } from '@/lib/demo/osStore';

const AGENT_INK: Record<string, string> = {
  data: 'var(--line-green)',
  writer: 'var(--line-amber)',
};

interface SoloMsg {
  id: string;
  from: 'operator' | 'agent';
  text: string;
}

const SOLO_ARTIFACT = `// solo agent payload — generated under Acme_SaaS context
function generateArtifact() {
  const brief = context.persona.voice;
  return render(brief, { channel: "landing", tone: "confident" });
}`;

function TypingDots({ ink }: { ink: string }) {
  return (
    <span className="feed-bubble h-9 flex items-center gap-1.5" style={{ borderColor: `color-mix(in srgb, ${ink} 40%, transparent)` }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: ink }} />
      ))}
    </span>
  );
}

function SoloSession({ agentId }: { agentId: 'data' | 'writer' }) {
  const agent = AGENTS[agentId];
  const ink = AGENT_INK[agentId];
  const pushToast = useOS((s) => s.pushToast);
  const [msgs, setMsgs] = useState<SoloMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [task, setTask] = useState('');
  const [artifact, setArtifact] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMsgs([{ id: `m-${agentId}-0`, from: 'agent', text: 'Context loaded. Operating solo. Ready.' }]);
    setArtifact(null);
    setTask('');
  }, [agentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs.length, typing]);

  const send = () => {
    const text = task.trim();
    if (!text || typing) return;
    setMsgs((m) => [...m, { id: `m-${Date.now()}-u`, from: 'operator', text }]);
    setTask('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { id: `m-${Date.now()}-a`, from: 'agent', text: 'Task executed under Acme_SaaS context. Artifact generated in adjacent canvas.' }]);
      setArtifact(SOLO_ARTIFACT);
      pushToast(`${agent.handle} finished the solo task`, 'success');
    }, 1500);
  };

  return (
    <>
      <section className="lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r agency-border flex flex-col min-h-[360px] lg:min-h-0 relative z-20">
        <div className="h-14 px-5 border-b agency-border flex items-center gap-2.5 shrink-0">
          <span className="w-6 h-6 rounded-[5px] flex items-center justify-center" style={{ border: `1.5px solid ${ink}` }}>
            <DemoIcon name={agent.icon} className="w-3 h-3" />
          </span>
          <h2 className="text-sm font-bold font-mono">{agent.handle}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {msgs.map((m) => (
            <div key={m.id} className={`feed-row ${m.from === 'operator' ? 'flex-row-reverse' : ''}`}>
              <span className="feed-avatar" style={m.from === 'agent' ? { borderColor: ink } : undefined}>
                {m.from === 'agent'
                  ? <DemoIcon name={agent.icon} className="w-3.5 h-3.5" />
                  : <span className="text-[11px] font-bold font-mono">V</span>}
              </span>
              <div className="flex-1 min-w-0 flex" style={{ justifyContent: m.from === 'operator' ? 'flex-end' : 'flex-start' }}>
                <div className="feed-bubble font-mono max-w-[85%]">{m.text}</div>
              </div>
            </div>
          ))}
          {typing && (
            <div className="feed-row">
              <span className="feed-avatar" style={{ borderColor: ink }}><DemoIcon name={agent.icon} className="w-3.5 h-3.5" /></span>
              <TypingDots ink={ink} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-3.5 border-t agency-border shrink-0">
          <div className="cli-input-wrapper">
            <span className="font-mono text-xs mb-0.5" style={{ color: 'var(--line-green)' }}>&gt;</span>
            <textarea
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
              onClick={send}
              aria-label="Send task"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="flex-1 flex flex-col min-h-[280px] overflow-hidden">
        <div className="h-14 px-5 md:px-7 border-b agency-border flex items-center shrink-0">
          <h2 className="text-sm font-bold font-mono">execution_canvas</h2>
        </div>
        <div className="flex-1 p-6 md:p-8 overflow-y-auto flex items-center justify-center">
          {artifact ? (
            <pre className="terminal-container w-full text-[11px] leading-relaxed slide-in"><code>{artifact}</code></pre>
          ) : (
            <div className="text-center text-[var(--ink-faint)]">
              <TerminalSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-xs font-mono">Awaiting artifact generation.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function DemoPowerAgentsPage() {
  const [selected, setSelected] = useState<'data' | 'writer' | null>(null);

  return (
    <div className="absolute inset-0 flex flex-col z-20 fade-in">
      <header className="flex justify-between items-end px-8 md:px-10 py-5 shrink-0 border-b agency-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Zap className="w-6 h-6 md:w-7 md:h-7" style={{ color: 'var(--line-green)' }} /> Power Agents
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        <aside className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r agency-border agency-panel z-30">
          <div className="hidden lg:flex h-14 px-4 border-b agency-border items-center shrink-0">
            <p className="label-rule">power_agents</p>
          </div>
          <div className="flex lg:flex-col gap-2 p-3 overflow-x-auto">
            {(['data', 'writer'] as const).map((id) => {
              const agent = AGENTS[id];
              const ink = AGENT_INK[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`thread-block min-w-[170px] lg:min-w-0 ${selected === id ? 'is-active' : ''}`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0" style={{ border: `1.5px solid ${ink}` }}>
                      <DemoIcon name={agent.icon} className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold font-mono truncate">{agent.handle}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {selected ? (
          <SoloSession key={selected} agentId={selected} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--ink-faint)]">
            <Zap className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-xs font-mono">Select a Power Agent to begin a solo session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
