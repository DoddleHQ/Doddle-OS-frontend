'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OSRoot } from '@/components/v3/shell/OSRoot';
import { TriageWindow } from '@/components/v3/windows/TriageWindow';
import { useV3OS } from '@/lib/v3/osStore';
import { v3SessionStatus } from '@/lib/v3/data';

/** /v3/triage — the v13 triage page. Cross-page guard: an empty queue
 *  lands on assignments, exactly like the reference. */
export default function V3TriagePage() {
  const router = useRouter();
  const feedError = useV3OS((s) => s.sessionFeedError);
  const feedLoaded = useV3OS((s) => s.sessionFeedLoaded);
  const queueEmpty = useV3OS((s) => !s.sessionFeed.some((x) => v3SessionStatus(x) === 'attention'));

  useEffect(() => {
    // wait for the feed before deciding — an unloaded feed is not an empty queue
    if (feedLoaded && queueEmpty && !feedError) router.replace('/v3/assignments');
  }, [feedLoaded, queueEmpty, feedError, router]);

  return (
    <OSRoot>
      <main className="v3-solo-main">
        <div className="v3-solo-inner">
          <TriageWindow />
        </div>
      </main>
    </OSRoot>
  );
}
