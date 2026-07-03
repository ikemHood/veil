import { Link, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { FiClock, FiHome, FiLock, FiSend, FiUser } from "react-icons/fi";
import { ensureDemoPrivateBalance } from "../privacy/demo-balance.service";
import { unlockPrivateNotes } from "../privacy/note-store";
import { getOnboardingState } from "../onboarding/onboarding.store";
import { useTransactionStore } from "../transactions/transaction.store";
import { useVeilWallet } from "../wallet/wallet.hooks";
import type { VeilSession } from "../../lib/auth/client";

export function AppShell({ session }: { session: VeilSession }) {
  const onboarding = getOnboardingState(session.user.id);
  const { wallet } = useVeilWallet(session.user.id, onboarding.username);
  const accountId = wallet?.accountId;
  const setTransactionOwner = useTransactionStore((state) => state.setOwner);

  useEffect(() => {
    if (!accountId || !onboarding.pinHash) return;
    void unlockPrivateNotes(accountId, onboarding.pinHash).then(() =>
      ensureDemoPrivateBalance(session.user.id, accountId).catch((caught: unknown) => {
        console.error("Demo balance setup failed", caught);
      }),
    );
  }, [accountId, onboarding.pinHash, session.user.id]);

  useEffect(() => {
    setTransactionOwner(accountId ?? null);
  }, [accountId, setTransactionOwner]);

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
              <p>{onboarding.username ? `${onboarding.username}@veil` : "Private account"}</p>
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
