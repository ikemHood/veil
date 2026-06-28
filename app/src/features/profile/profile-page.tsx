import { useNavigate } from "@tanstack/react-router";
import type React from "react";
import { FiFileText, FiLogOut, FiShield } from "react-icons/fi";
import { clearOnboarding } from "../onboarding/onboarding.store";
import { useTransactionStore } from "../transactions/transaction.store";
import { useWalletStore } from "../wallet/wallet.store";
import { signOut } from "../../lib/auth/session";

export function ProfilePage({ handle, userId }: { handle: string; userId: string }) {
  const navigate = useNavigate();
  const wallet = useWalletStore((state) => state.wallet);
  const transactionCount = useTransactionStore((state) => state.transactions.length);

  return (
    <div className="screen-content">
      <section className="profile-panel">
        <span className="avatar">{handle.slice(0, 1).toUpperCase()}</span>
        <h1>{handle}</h1>
        <p>{wallet?.accountId ?? "Your private dollar account is ready"}</p>
      </section>
      <section className="settings-list">
        <InfoRow icon={<FiShield />} label="Default privacy" value="Enabled" />
        <InfoRow icon={<FiFileText />} label="Receipts" value={`${transactionCount}`} />
      </section>
      <button
        className="secondary-button danger"
        type="button"
        onClick={() => {
          clearOnboarding(userId);
          void signOut().then(() => navigate({ to: "/" }));
        }}
      >
        <FiLogOut />
        Sign out
      </button>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
