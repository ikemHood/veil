import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "react-hot-toast";
import type { AuthContextType } from "../providers/auth-provider";
import PWABadge from "../shared/components/pwa-badge/PWABadge";

interface MyRouterContext {
  queryClient: QueryClient;
  auth: AuthContextType;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <Outlet />

      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            maxWidth: "340px",
            border: "1px solid rgba(16, 21, 31, 0.12)",
            borderRadius: "8px",
            background: "#10151f",
            color: "#f9fbf8",
            fontWeight: 800,
          },
          error: {
            iconTheme: {
              primary: "#ff6b7a",
              secondary: "#10151f",
            },
          },
          success: {
            iconTheme: {
              primary: "#7ee0a1",
              secondary: "#10151f",
            },
          },
        }}
      />
      <PWABadge />
      <TanStackRouterDevtools />
      <ReactQueryDevtools buttonPosition="bottom-right" />
    </>
  ),
});
