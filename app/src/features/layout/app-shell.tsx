import { Link, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { FiClock, FiHome, FiLock, FiSend, FiUser } from "react-icons/fi";
import { unlockPrivateNotes } from "../privacy/note-store";
import { getOnboardingState } from "../onboarding/onboarding.store";
import { useVeilWallet } from "../wallet/wallet.hooks";
import type { VeilSession } from "../../lib/auth/client";

export function AppShell({ session }: { session: VeilSession }) {
  const onboarding = getOnboardingState(session.user.id);
  const { wallet } = useVeilWallet(session.user.id, onboarding.username);

  useEffect(() => {
    if (!wallet || !onboarding.pinHash) return;
    void unlockPrivateNotes(wallet.accountId, onboarding.pinHash);
  }, [onboarding.pinHash, wallet]);

  return (
    <main className="veil-root">
      <div className="phone-shell">
        <section className="app-chrome">
          <header className="app-header">
            <div>
              <div className="brand-row">
                <span className="brand-mark">V</span>
                <span>Veil</span>
              </div>
              <p>{onboarding.username ? `${onboarding.username}@veil` : "Your private dollar account"}</p>
            </div>
            <button className="icon-button" type="button" aria-label="Lock app">
              <FiLock />
            </button>
          </header>
          <Outlet />
          <nav className="bottom-nav">
            <Link to="/home" activeProps={{ className: "active" }}>
              <FiHome />
              <span>Home</span>
            </Link>
            <Link to="/send" activeProps={{ className: "active" }}>
              <FiSend />
              <span>Send</span>
            </Link>
            <Link to="/history" search={{ tx: undefined }} activeProps={{ className: "active" }}>
              <FiClock />
              <span>History</span>
            </Link>
            <Link to="/profile" activeProps={{ className: "active" }}>
              <FiUser />
              <span>Profile</span>
            </Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
