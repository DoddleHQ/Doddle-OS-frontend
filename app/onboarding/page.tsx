import { WorkspaceCreate } from '@/components/v2/onboarding/WorkspaceCreate';

/*
 * /onboarding — simplified workspace creation.
 *
 * Previously ran the brand_persona_generator graph (minutes-long conversation).
 * Now a quick name + domain form. Brand persona setup moved inside each
 * workspace as a separate post-creation step at /workspaces/{id}/brand-persona.
 */
export default function OnboardingPage() {
  return <WorkspaceCreate />;
}
