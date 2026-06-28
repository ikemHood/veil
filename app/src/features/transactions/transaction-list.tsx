import { Link } from "@tanstack/react-router";
import { FiArrowDownLeft, FiArrowUpRight, FiChevronRight } from "react-icons/fi";
import { formatCurrency, formatDate } from "./format";
import type { TransactionType, VeilTransaction } from "./transaction.types";

export function TransactionList({ transactions }: { transactions: VeilTransaction[] }) {
  if (transactions.length === 0) return <div className="empty-state">No private activity yet.</div>;
  return (
    <div className="transaction-list">
      {transactions.map((tx) => (
        <Link key={tx.id} to="/history" search={{ tx: tx.id }}>
          <TransactionIcon type={tx.type} />
          <span>
            <strong>{tx.title}</strong>
            <small>{tx.counterparty}</small>
          </span>
          <span className="tx-amount">
            {tx.type === "deposit" || tx.type === "receive" ? "+" : "-"}
            {formatCurrency(tx.amount)}
            <small>{formatDate(tx.date)}</small>
          </span>
          <FiChevronRight />
        </Link>
      ))}
    </div>
  );
}

export function TransactionIcon({ type }: { type: TransactionType }) {
  const icon = type === "deposit" || type === "receive" ? <FiArrowDownLeft /> : <FiArrowUpRight />;
  return <span className={`tx-icon ${type}`}>{icon}</span>;
}
