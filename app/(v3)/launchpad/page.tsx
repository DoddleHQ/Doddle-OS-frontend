import { Suspense } from 'react';
import { OSRoot } from '@/components/v3/shell/OSRoot';
import { LaunchpadWindow } from '@/components/v3/windows/LaunchpadWindow';

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
