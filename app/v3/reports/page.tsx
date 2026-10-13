import { OSRoot } from '@/components/v3/shell/OSRoot';
import { HistoryWindow } from '@/components/v3/windows/HistoryWindow';

/** /v3/reports — the artefacts gallery page. */
export default function V3ReportsPage() {
  return (
    <OSRoot>
      <main className="v3-solo-main">
        <div className="v3-solo-inner">
          <HistoryWindow />
        </div>
      </main>
    </OSRoot>
  );
}
