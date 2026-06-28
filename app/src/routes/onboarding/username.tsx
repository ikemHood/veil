import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { FiCheck, FiUser } from "react-icons/fi";
import { getOnboardingState, setUsername } from "../../features/onboarding/onboarding.store";
import { claimVeilProfile, getVeilProfile } from "../../features/profile/profile.service";
import { walletService } from "../../features/wallet/wallet.service";

export const Route = createFileRoute("/onboarding/username")({
  beforeLoad: async ({ context }) => {
    const session = context.auth.session;
    if (!session) throw redirect({ to: "/" });
    const state = getOnboardingState(session.user.id);
    if (!state.pinSet) throw redirect({ to: "/onboarding/pin" });
    const profile = await getVeilProfile();
    if (profile?.handle) {
      if (state.username !== profile.handle) setUsername(session.user.id, profile.handle);
      throw redirect({ to: "/home" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { auth } = Route.useRouteContext();
  const [usernameDraft, setUsernameDraft] = useState("");
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
      const wallet = await walletService.getOrCreateWallet(userId, clean);
      const profile = await claimVeilProfile(clean, wallet.accountId);
      setUsername(userId, profile.handle);
      await navigate({ to: "/home" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Username claim failed";
      toast.error(message);
      setError(message);
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
