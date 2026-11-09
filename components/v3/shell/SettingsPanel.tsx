'use client';

import { useV3OS } from '@/lib/v3/osStore';
import { DataSyncSection } from '@/components/workspace/settings/DataSyncSection';

export function SettingsPanel() {
  const open = useV3OS((s) => s.settingsOpen);
  const workspaceId = useV3OS((s) => s.workspaceId);
  const { toggleSettings } = useV3OS.getState();

  if (!open) return null;

  return (
    <div id="settings-panel" className="glass" role="dialog" aria-label="Settings">
      <div className="flex items-center justify-between mb-3">
        <strong className="text-sm">Settings</strong>
        <button className="chip" onClick={() => toggleSettings(false)}>
          esc
        </button>
      </div>
      {workspaceId ? (
        <div
          className="rounded-lg overflow-y-auto"
          style={{ background: 'var(--v3-settings-surface, #fff)', color: 'var(--ink, #141f3f)', padding: 14, maxHeight: '60vh' }}
        >
          <DataSyncSection workspaceId={workspaceId} />
        </div>
      ) : (
        <p className="font-mono text-xs">Select a workspace to manage its data connections.</p>
      )}
    </div>
  );
}
