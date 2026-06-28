import { createFileRoute } from "@tanstack/react-router";
import { SendPage } from "../../features/send/send-page";
import { getOnboardingState } from "../../features/onboarding/onboarding.store";

export const Route = createFileRoute("/_app/send")({
  component: RouteComponent,
});

function RouteComponent() {
  const { auth } = Route.useRouteContext();
  if (!auth.session) return null;
  const username = getOnboardingState(auth.session.user.id).username ?? "user";
  return <SendPage handle={`${username}@veil`} userId={auth.session.user.id} />;
}
