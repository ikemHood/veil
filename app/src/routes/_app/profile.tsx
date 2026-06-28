import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "../../features/profile/profile-page";
import { getOnboardingState } from "../../features/onboarding/onboarding.store";

export const Route = createFileRoute("/_app/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const { auth } = Route.useRouteContext();
  if (!auth.session) return null;
  const username = getOnboardingState(auth.session.user.id).username ?? "user";
  return <ProfilePage handle={`${username}@veil`} userId={auth.session.user.id} />;
}
