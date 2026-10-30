import { OSRoot } from '@/components/v3/shell/OSRoot';
import { ReportsWindow } from '@/components/v3/windows/HistoryWindow';

export default function V3ReportsPage() {
  return (
    <OSRoot>
      <main className="v3-solo-main">
        <div className="v3-solo-inner">
          <ReportsWindow />
        </div>
      </main>
    </OSRoot>
  );
}
