'use client';

import { HeroSpecimen } from '@/components/v2/HeroSpecimen';
import { LiveBoard } from '@/components/v2/LiveBoard';
import { Pipeline } from '@/components/v2/Pipeline';
import { HowItWorks } from '@/components/v2/HowItWorks';
import { OperatorSection } from '@/components/v2/OperatorSection';
import { CloseCta } from '@/components/v2/CloseCta';
import { SmoothScroll } from '@/components/v2/SmoothScroll';
import { RegisterTransition } from '@/components/v2/RegisterTransition';

export default function RootPage() {
  return (
    <div className="v2-scope">
      <SmoothScroll>
        <RegisterTransition />
        <HeroSpecimen />
        <LiveBoard />
        <Pipeline />
        <HowItWorks />
        <OperatorSection />
        <CloseCta />
      </SmoothScroll>
    </div>
  );
}
