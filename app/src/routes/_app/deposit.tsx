import { createFileRoute } from "@tanstack/react-router";
import { DepositPage } from "../../features/deposit/deposit-page";

export const Route = createFileRoute("/_app/deposit")({
  component: RouteComponent,
});

function RouteComponent() {
  const { auth } = Route.useRouteContext();
  if (!auth.session) return null;
  return <DepositPage userId={auth.session.user.id} />;
}
