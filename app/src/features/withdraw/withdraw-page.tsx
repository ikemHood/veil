import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FiCheck, FiShield } from "react-icons/fi";
import { verifyTransactionPin } from "../onboarding/onboarding.store";
import { PinPad } from "../onboarding/pin-pad";
import { parseUsdAmount, proofFromPrivacyResult } from "../privacy/disclosure.service";
import { getPrivateBalance } from "../privacy/note-store";
import { withdrawPrivate } from "../privacy/withdraw.service";
import { formatCurrency, makeTxId } from "../transactions/format";
import { useTransactionStore } from "../transactions/transaction.store";
import { useWalletStore } from "../wallet/wallet.store";

export function WithdrawPage({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const wallet = useWalletStore((state) => state.wallet);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const [destination, setDestination] = useState("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
  const [amount, setAmount] = useState("25");
  const [pin, setPin] = useState("");
  const [stage, setStage] = useState<"form" | "review" | "pin" | "progress" | "success">("form");
  const [error, setError] = useState("");
  const balance = Number(getPrivateBalance()) / 10_000_000;
  const numericAmount = Number(amount);

  const run = async () => {
    if (!wallet) return;
    setStage("progress");
    try {
      const result = await withdrawPrivate(userId, wallet.accountId, parseUsdAmount(amount), destination);
      addTransaction({
        id: makeTxId(),
        type: "withdraw",
        title: "Private balance withdrawal",
        counterparty: "External destination",
        amount: numericAmount,
        date: new Date().toISOString(),
        proof: proofFromPrivacyResult("withdraw", result),
        destination,
      });
      setStage("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Withdrawal failed");
      setStage("form");
    }
  };

  return (
    <div className="screen-content">
      <section className="section-block flush-top">
        <div className="section-heading">
          <h1>Withdraw</h1>
          <span>Selected amount</span>
        </div>
        {stage === "form" && (
          <form
            className="flow-stack"
            onSubmit={(event) => {
              event.preventDefault();
              setStage("review");
            }}
          >
            <label className="field-label" htmlFor="destination">
              Destination address
            </label>
            <input className="text-field" id="destination" onChange={(event) => setDestination(event.target.value)} value={destination} />
            <label className="field-label" htmlFor="withdraw-amount">
              Amount
            </label>
            <input className="text-field" id="withdraw-amount" onChange={(event) => setAmount(event.target.value)} type="number" value={amount} />
            <p className="quiet-line">Available {formatCurrency(balance)}</p>
            <button className="primary-button" disabled={!wallet || numericAmount <= 0 || numericAmount > balance} type="submit">
              Review withdrawal
            </button>
            {error && <p className="pin-error">{error}</p>}
          </form>
        )}
        {stage === "review" && (
          <Review
            items={[
              ["Destination", destination],
              ["Amount", formatCurrency(numericAmount)],
              ["Private balance after", formatCurrency(balance - numericAmount)],
              ["Disclosure", "Only selected amount exits"],
            ]}
            onBack={() => setStage("form")}
            onContinue={() => setStage("pin")}
          />
        )}
        {stage === "pin" && (
          <PinPad
            error={error}
            onChange={(value) => {
              setPin(value);
              setError("");
            }}
            onComplete={(value) => {
              verifyTransactionPin(userId, value).then((valid) => {
                if (!valid) {
                  setPin("");
                  setError("PIN does not match");
                  return;
                }
                void run();
              });
            }}
            value={pin}
          />
        )}
        {stage === "progress" && <ProgressState steps={["Preparing proof", "Unshielding selected amount", "Submitting withdrawal"]} />}
        {stage === "success" && (
          <div className="success-state">
            <span className="success-icon">
              <FiCheck />
            </span>
            <h3>Withdrawal complete</h3>
            <p>{formatCurrency(numericAmount)} sent out</p>
            <button className="primary-button" type="button" onClick={() => navigate({ to: "/home" })}>
              Done
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ProgressState({ steps }: { steps: string[] }) {
  return (
    <div className="progress-state">
      <div className="spinner-ring">
        <FiShield />
      </div>
      <div className="progress-list">
        {steps.map((step, index) => (
          <div className="done" key={step}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Review({ items, onBack, onContinue }: { items: [string, string][]; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="flow-stack">
      <div className="review-card">
        {items.map(([label, value]) => (
          <div className="receipt-line" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="dual-actions">
        <button className="secondary-button" type="button" onClick={onBack}>
          Back
        </button>
        <button className="primary-button" type="button" onClick={onContinue}>
          Confirm with PIN
        </button>
      </div>
    </div>
  );
}
