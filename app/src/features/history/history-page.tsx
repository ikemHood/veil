import { useState } from "react";
import type React from "react";
import { FiClock, FiFileText, FiGlobe, FiShield, FiUser } from "react-icons/fi";
import { generateDisclosureReceipt } from "../compliance/disclosure-receipt";
import { formatCurrency, formatDate } from "../transactions/format";
import { TransactionIcon, TransactionList } from "../transactions/transaction-list";
import { useTransactionStore } from "../transactions/transaction.store";

export function HistoryPage({ selectedTxId }: { selectedTxId?: string }) {
  const transactions = useTransactionStore((state) => state.transactions);
  const [localSelectedId, setLocalSelectedId] = useState(selectedTxId ?? "");
  const selected = transactions.find((tx) => tx.id === (selectedTxId ?? localSelectedId));
  const receipt = selected ? generateDisclosureReceipt(selected) : null;

  return (
    <div className="screen-content">
      <section className="section-block flush-top">
        <div className="section-heading">
          <h1>History</h1>
          <span>{transactions.length} items</span>
        </div>
        {!selected && <TransactionList transactions={transactions} />}
        {selected && receipt && (
          <div className="flow-stack">
            <div className="detail-hero">
              <TransactionIcon type={selected.type} />
              <strong>{formatCurrency(selected.amount)}</strong>
              <span>{selected.title}</span>
            </div>
            <div className="settings-list compact">
              <InfoRow icon={<FiUser />} label="Counterparty" value={selected.counterparty} />
              <InfoRow icon={<FiClock />} label="Date" value={formatDate(selected.date)} />
              <InfoRow icon={<FiShield />} label="Proof" value={selected.proof.id} />
              {selected.destination && <InfoRow icon={<FiGlobe />} label="Destination" value={selected.destination} />}
            </div>
            <div className="receipt-card">
              <div className="receipt-header">
                <FiFileText />
                <div>
                  <strong>Generate disclosure receipt</strong>
                  <span>Share only what is needed</span>
                </div>
              </div>
              <ReceiptLine label="View key" value={receipt.viewKey} />
              <ReceiptLine label="Proof" value={receipt.proofId} />
              <ReceiptLine label="Source proof" value={selected.proof.commitment} />
            </div>
            <button className="secondary-button" type="button" onClick={() => setLocalSelectedId("")}>
              Back to history
            </button>
          </div>
        )}
      </section>
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

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="receipt-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
