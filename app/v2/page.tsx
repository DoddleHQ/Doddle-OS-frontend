import { HeroSpecimen } from './landing/HeroSpecimen';
import { LiveBoard } from './landing/LiveBoard';
import { Pipeline } from './landing/Pipeline';
import { HowItWorks } from './landing/HowItWorks';
import { OperatorSection } from './landing/OperatorSection';
import { CloseCta } from './landing/CloseCta';
import { SmoothScroll } from './landing/SmoothScroll';
import { RegisterTransition } from './landing/RegisterTransition';

/*
 * /v2 — the landing, Specimen Terminal world.
 *
 * Two-register scroll carrying the real graph-streaming product:
 *   1. Hero (paper) — the thesis
 *   2. Live Board (ink) — one pipeline run, end to end
 *   3. Pipeline (ink) — the real 12-step workflow every agent runs
 *   4. Fleet (paper) — the five real graph agents + KPIs + conflicts
 *   5. Operator (paper) — interactive HITL resolution
 *   6. Close (paper) — the call to enter
 *
 * The scroll IS the product promise: strategy coming alive as autonomous execution.
 */
export default function V2LandingPage() {
  return (
    <SmoothScroll>
      <RegisterTransition />
      <HeroSpecimen />
      <LiveBoard />
      <Pipeline />
      <HowItWorks />
      <OperatorSection />
      <CloseCta />
    </SmoothScroll>
  );
}
