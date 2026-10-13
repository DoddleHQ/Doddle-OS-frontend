import { Suspense } from 'react';
import { OSRoot } from '@/components/v3/shell/OSRoot';
import { LaunchpadWindow } from '@/components/v3/windows/LaunchpadWindow';

/** /v3/launchpad — the v13 launchpad page, full-bleed under the shared shell.
 *  Suspense-bound because the launcher reads ?type= via useSearchParams. */
export default function V3Page() {
  return (
    <OSRoot>
      <main className="v3-solo-main">
        <div className="v3-solo-inner">
          <Suspense fallback={null}>
            <LaunchpadWindow />
          </Suspense>
        </div>
      </main>
    </OSRoot>
  );
}
