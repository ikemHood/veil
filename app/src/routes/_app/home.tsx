import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "../../features/dashboard/dashboard-page";
import { getOnboardingState } from "../../features/onboarding/onboarding.store";

export const Route = createFileRoute("/_app/home")({
  component: RouteComponent,
});

function RouteComponent() {
  const { auth } = Route.useRouteContext();
  if (!auth.session) return null;
  const username = getOnboardingState(auth.session.user.id).username ?? "user";
  return <DashboardPage handle={`${username}@veil`} />;
}
