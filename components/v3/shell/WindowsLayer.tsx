'use client';

import { useRef } from 'react';
import { useV3OS, type V3WindowState } from '@/lib/v3/osStore';
import { V3_APP_META } from '@/lib/v3/apps';
import { v3SessionStatus } from '@/lib/v3/data';
import { HomeWindow } from '@/components/v3/windows/HomeWindow';
import { AgentsWindow } from '@/components/v3/windows/AgentsWindow';
import { LaunchpadWindow } from '@/components/v3/windows/LaunchpadWindow';
import { TriageWindow } from '@/components/v3/windows/TriageWindow';
import { BlueprintsWindow } from '@/components/v3/windows/BlueprintsWindow';
import { ReportsWindow } from '@/components/v3/windows/HistoryWindow';
import { AssignmentsWindow } from '@/components/v3/windows/AssignmentsWindow';
import { EmptyWindow } from '@/components/v3/windows/EmptyWindow';

/** v13 titlebar chips: the reference's per-window state, triage counts live. */
function TitlebarChip({ id, mode }: { id: V3WindowState['id']; mode: V3WindowState['mode'] }) {
  const unread = useV3OS((s) => (id === 'reports' ? s.sessionFeed.filter((x) => v3SessionStatus(x) === 'attention').length : 0));
  const chip = id === 'reports' ? `${unread} waiting` : V3_APP_META[id].chip ?? (mode === 'page' ? 'page' : '⌘');
  return <span className="chip ml-auto">{chip}</span>;
}

function WindowSlot({ id }: { id: V3WindowState['id'] }) {
  if (id === 'home') return <HomeWindow />;
  if (id === 'agents') return <AgentsWindow />;
  if (id === 'launchpad') return <LaunchpadWindow />;
  if (id === 'blueprints') return <BlueprintsWindow />;
  if (id === 'history') return <ReportsWindow />;
  if (id === 'reports') return <TriageWindow />;
  if (id === 'assignments') return <AssignmentsWindow />;
  return <EmptyWindow app={V3_APP_META[id]} />;
}

function OSWindow({ win }: { win: V3WindowState }) {
  const isTop = useV3OS((s) => s.windows[s.windows.length - 1]?.id === win.id);
  const { closeWin, minWin, setMode, focusWin, setWinPos } = useV3OS.getState();
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (win.mode !== 'window' || e.button !== 0) return;
    // drag starts only on the titlebar (this handler), not the traffic lights
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { px: e.clientX, py: e.clientY, x: win.x, y: win.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setWinPos(
      win.id,
      Math.max(0, drag.current.x + (e.clientX - drag.current.px)),
      Math.max(0, drag.current.y + (e.clientY - drag.current.py)),
    );
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const style: React.CSSProperties =
    win.mode === 'page'
      ? { left: 0, top: 0, width: '100%', height: '100%' }
      : { left: win.x, top: win.y, width: win.width, maxHeight: '86%' };

  return (
    <section
      className={`os-window glass${isTop ? ' focused' : ''}${win.mode === 'page' ? ' page' : ''}`}
      style={style}
      onPointerDown={() => focusWin(win.id)}
    >
      <div className="titlebar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <div className="traffic">
          <button className="t-close" aria-label="Close" onClick={() => closeWin(win.id)} />
          <button className="t-min" aria-label="Minimize" onClick={() => minWin(win.id)} />
          <button
            className="t-max"
            aria-label="Zoom"
            onClick={() => setMode(win.id, win.mode === 'page' ? 'window' : 'page')}
          />
        </div>
        <strong className="text-sm">{V3_APP_META[win.id].name}</strong>
        <TitlebarChip id={win.id} mode={win.mode} />
      </div>
      <div className="win-body">
        <WindowSlot id={win.id} />
      </div>
    </section>
  );
}

export function WindowsLayer() {
  const windows = useV3OS((s) => s.windows);
  return (
    <main className="windows-layer">
      {windows.filter((w) => !w.minimized).map((w) => (
        <OSWindow key={w.id} win={w} />
      ))}
    </main>
  );
}
