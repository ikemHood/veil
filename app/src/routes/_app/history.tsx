import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "../../features/history/history-page";

export const Route = createFileRoute("/_app/history")({
  validateSearch: (search: Record<string, unknown>) => ({
    tx: typeof search.tx === "string" ? search.tx : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { tx } = Route.useSearch();
  return <HistoryPage selectedTxId={tx} />;
}
