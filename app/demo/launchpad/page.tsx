'use client';

import { StubView } from '@/components/demo/StubView';

export default function DemoLaunchpadPage() {
  return (
    <StubView
      icon="terminal"
      ink="var(--line-scarlet)"
      title="Launchpad"
      blurb="mission_control_feed + execution_canvas: streaming threads, stdout, timeline, artifacts."
      phase="phase_2"
    />
  );
}
