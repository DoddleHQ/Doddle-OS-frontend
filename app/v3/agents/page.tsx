import { OSRoot } from '@/components/v3/shell/OSRoot';
import { AgentsWindow } from '@/components/v3/windows/AgentsWindow';

/** /v3/agents — the v13 agents page, full-bleed under the shared shell. */
export default function V3Page() {
  return (
    <OSRoot>
      <main className="v3-solo-main">
        <div className="v3-solo-inner">
          <AgentsWindow />
        </div>
      </main>
    </OSRoot>
  );
}
