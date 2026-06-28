import { createFileRoute, Outlet } from "@tanstack/react-router";
import { redirectCompletedOnboarding } from "../lib/auth/guards";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ context }) => {
    await redirectCompletedOnboarding(context.auth);
  },
  component: () => (
    <main className="veil-root">
      <div className="phone-shell">
        <section className="onboarding-screen">
          <div className="onboarding-top">
            <div className="brand-row large">
              <span className="brand-mark">V</span>
              <span>Veil</span>
            </div>
            <div className="step-dots" aria-label="Onboarding progress">
              <span className="step-dot active" />
              <span className="step-dot" />
              <span className="step-dot" />
            </div>
          </div>
          <Outlet />
        </section>
      </div>
    </main>
  ),
});
