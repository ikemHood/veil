import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { FiCheck, FiUser } from "react-icons/fi";
import { getOnboardingState, setUsername } from "../../features/onboarding/onboarding.store";
import { claimVeilProfile } from "../../features/profile/profile.service";
import { walletService } from "../../features/wallet/wallet.service";

export const Route = createFileRoute("/onboarding/username")({
  beforeLoad: ({ context }) => {
    const session = context.auth.session;
    if (!session) throw redirect({ to: "/" });
    const state = getOnboardingState(session.user.id);
    if (!state.pinSet) throw redirect({ to: "/onboarding/pin" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext();
  const [usernameDraft, setUsernameDraft] = useState("ikem");
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState(false);

  const claim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userId = auth.session?.user.id;
    if (!userId) return;
    const clean = usernameDraft.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 18);
    if (!clean) return;
    setClaiming(true);
    setError("");
    try {
      setUsername(userId, clean);
      const wallet = await walletService.getOrCreateWallet(userId, clean);
      await claimVeilProfile(clean, wallet.accountId);
      await navigate({ to: "/home" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Username claim failed");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <form className="onboarding-card" onSubmit={claim}>
      <FiUser className="hero-icon" />
      <h1>Your private dollar account</h1>
      <p>Claim a payment username for private sends and disclosure receipts.</p>
      <label className="field-label" htmlFor="username">
        Username
      </label>
      <div className="handle-input">
        <input id="username" maxLength={18} onChange={(event) => setUsernameDraft(event.target.value)} value={usernameDraft} />
        <span>@veil</span>
      </div>
      <div className="handle-preview">{usernameDraft || "username"}@veil</div>
      <button className="primary-button" disabled={claiming} type="submit">
        <FiCheck />
        {claiming ? "Preparing account..." : "Continue"}
      </button>
      {error && <p className="pin-error">{error}</p>}
    </form>
  );
}
