import { Link } from "@tanstack/react-router";
import type React from "react";
import { FiClock, FiDownload, FiPlus, FiSend, FiShield } from "react-icons/fi";
import { getPrivateBalance } from "../privacy/note-store";
import { formatCurrency } from "../transactions/format";
import { useTransactionStore } from "../transactions/transaction.store";
import { TransactionList } from "../transactions/transaction-list";

export function DashboardPage({ handle }: { handle: string }) {
  const balance = Number(getPrivateBalance()) / 10_000_000;
  const transactions = useTransactionStore((state) => state.transactions);

  return (
    <div className="screen-content">
      <section className="balance-panel">
        <div className="panel-topline">
          <span>Private balance</span>
          <span className="secure-chip">
            <FiShield />
            Privacy ready
          </span>
        </div>
        <strong>{formatCurrency(balance)}</strong>
        <div className="balance-meta">
          <span>{handle}</span>
          <span>Shielded USDC</span>
        </div>
      </section>

      <section className="action-grid" aria-label="Main actions">
        <ActionLink icon={<FiPlus />} label="Deposit" to="/deposit" />
        <ActionLink icon={<FiSend />} label="Send" to="/send" />
        <ActionLink icon={<FiDownload />} label="Withdraw" to="/withdraw" />
        <ActionLink icon={<FiClock />} label="History" to="/history" />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Recent activity</h2>
          <span>{transactions.length ? "Latest" : "Empty"}</span>
        </div>
        <TransactionList transactions={transactions.slice(0, 4)} />
      </section>
    </div>
  );
}

function ActionLink({ icon, label, to }: { icon: React.ReactNode; label: string; to: "/deposit" | "/send" | "/withdraw" | "/history" }) {
  return (
    <Link className="action-button" to={to}>
      <span>{icon}</span>
      {label}
    </Link>
  );
}
