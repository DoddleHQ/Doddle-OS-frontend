import { OSRoot } from '@/components/v3/shell/OSRoot';
import { AssignmentsWindow } from '@/components/v3/windows/AssignmentsWindow';

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
