import { OnboardingDesk } from '@/components/v2/onboarding/OnboardingDesk';

/*
 * /onboarding — "The Agent's Desk" brand persona setup.
 *
 * A standalone route (like the auth pages) where a GTM strategist agent
 * interviews the user to build their brand persona. Mock flow — no backend
 * wiring yet. Design-only.
 */

export default function OnboardingPage() {
  return <OnboardingDesk />;
}
