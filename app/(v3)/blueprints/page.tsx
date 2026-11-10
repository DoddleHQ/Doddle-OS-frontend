import { OSRoot } from '@/components/v3/shell/OSRoot';
import { BlueprintsWindow } from '@/components/v3/windows/BlueprintsWindow';

export default function V3BlueprintsPage() {
  return (
    <OSRoot>
      <main className="v3-solo-main">
        <div className="v3-solo-inner">
          <BlueprintsWindow />
        </div>
      </main>
    </OSRoot>
  );
}
