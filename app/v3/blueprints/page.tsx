import { OSRoot } from '@/components/v3/shell/OSRoot';
import { BlueprintsWindow } from '@/components/v3/windows/BlueprintsWindow';

/** /v3/blueprints — the v13 blueprints page, full-bleed under the shell. */
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
