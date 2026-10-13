import { OSRoot } from '@/components/v3/shell/OSRoot';
import { AssignmentsWindow } from '@/components/v3/windows/AssignmentsWindow';

/** /v3/assignments — the v13 assignments page, full-bleed under the shared shell. */
export default function V3Page() {
  return (
    <OSRoot>
      <main className="v3-solo-main">
        <div className="v3-solo-inner">
          <AssignmentsWindow />
        </div>
      </main>
    </OSRoot>
  );
}
