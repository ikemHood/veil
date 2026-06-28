import { createFileRoute } from "@tanstack/react-router";
import { VeilWallet } from "../features/veil/veil-wallet";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <VeilWallet />;
}
