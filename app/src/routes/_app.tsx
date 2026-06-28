import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "../features/layout/app-shell";
import { requireOnboardingComplete } from "../lib/auth/guards";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => requireOnboardingComplete(context.auth, location.href),
  component: RouteComponent,
});

function RouteComponent() {
  const { auth } = Route.useRouteContext();
  if (!auth.session) return null;
  return <AppShell session={auth.session} />;
}
