import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FiGlobe, FiShield } from "react-icons/fi";
import { getOnboardingState } from "../features/onboarding/onboarding.store";
import { signInWithGoogle } from "../lib/auth/session";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    const session = context.auth.session;
    if (!session) return;
    const state = getOnboardingState(session.user.id);
    if (!state.pinSet) throw redirect({ to: "/onboarding/pin" });
    if (!state.username) throw redirect({ to: "/onboarding/username" });
    throw redirect({ to: "/home" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const signIn = async () => {
    setError("");
    try {
      await signInWithGoogle();
      await navigate({ to: "/onboarding/pin" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed");
    }
  };

  return (
    <main className="veil-root">
      <div className="phone-shell">
        <section className="onboarding-screen">
          <div className="onboarding-top">
            <div className="brand-row large">
              <span className="brand-mark">V</span>
              <span>Veil</span>
            </div>
          </div>
          <div className="onboarding-card">
            <FiGlobe className="hero-icon" />
            <h1>Private global dollars</h1>
            <p>Deposit, send, and withdraw USDC privately with a wallet designed for everyday cross-border payments.</p>
            <button className="primary-button" type="button" onClick={signIn}>
              <FiShield />
              Continue with Google
            </button>
            {error && <p className="pin-error">{error}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
