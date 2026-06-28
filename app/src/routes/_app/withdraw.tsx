import { createFileRoute } from "@tanstack/react-router";
import { WithdrawPage } from "../../features/withdraw/withdraw-page";

export const Route = createFileRoute("/_app/withdraw")({
  component: RouteComponent,
});

function RouteComponent() {
  const { auth } = Route.useRouteContext();
  if (!auth.session) return null;
  return <WithdrawPage userId={auth.session.user.id} />;
}
