import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { FiCheck, FiShield } from "react-icons/fi";
import { verifyTransactionPin } from "../onboarding/onboarding.store";
import { PinPad } from "../onboarding/pin-pad";
import { parseUsdAmount, proofFromPrivacyResult } from "../privacy/disclosure.service";
import { preparePrivateTransfer, submitPrivateTransfer } from "../privacy/transfer.service";
import { usePrivateBalance } from "../privacy/use-private-balance";
import { resolveRecipientAddress } from "../profile/profile.service";
import { formatCurrency, makeTxId } from "../transactions/format";
import { useTransactionStore } from "../transactions/transaction.store";
import { useWalletStore } from "../wallet/wallet.store";

export function SendPage({ handle, userId }: { handle: string; userId: string }) {
  const navigate = useNavigate();
  const wallet = useWalletStore((state) => state.wallet);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const [recipient, setRecipient] = useState(handle);
  const [amount, setAmount] = useState("25");
  const [pin, setPin] = useState("");
  const [stage, setStage] = useState<"form" | "review" | "pin" | "progress" | "success">("form");
  const [error, setError] = useState("");
  const balance = Number(usePrivateBalance()) / 10_000_000;
  const numericAmount = Number(amount);

  const run = async () => {
    if (!wallet) return;
    setStage("progress");
    try {
      const recipientAddress = await resolveRecipientAddress(recipient);
      const prepared = await preparePrivateTransfer(userId, wallet.accountId, parseUsdAmount(amount), recipientAddress);
      const result = await submitPrivateTransfer(prepared, wallet.accountId, recipientAddress);
      addTransaction({
        id: makeTxId(),
        type: "send",
        title: "Send privately",
        counterparty: recipient,
        amount: numericAmount,
        date: new Date().toISOString(),
        proof: proofFromPrivacyResult("send", result),
      });
      toast.success("Payment sent privately");
      setStage("success");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Private send failed";
      toast.error(message);
      setError(message);
      setStage("form");
    }
  };

  return (
    <div className="screen-content">
      <section className="section-block flush-top">
        <div className="section-heading">
          <h1>Send</h1>
          <span>Private by default</span>
        </div>
        {stage === "form" && (
          <form
            className="flow-stack"
            onSubmit={(event) => {
              event.preventDefault();
              setStage("review");
            }}
          >
            <label className="field-label" htmlFor="recipient">
              Recipient
            </label>
            <input
              className="text-field"
              id="recipient"
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="username or address"
              value={recipient}
            />
            <label className="field-label" htmlFor="send-amount">
              Amount
            </label>
            <input className="text-field" id="send-amount" onChange={(event) => setAmount(event.target.value)} type="number" value={amount} />
            <p className="quiet-line">Available {formatCurrency(balance)}</p>
            <button className="primary-button" disabled={!wallet || numericAmount <= 0 || numericAmount > balance} type="submit">
              Review payment
            </button>
            {error && <p className="pin-error">{error}</p>}
          </form>
        )}
        {stage === "review" && (
          <Review
            cta="Confirm with PIN"
            items={[
              ["From", handle],
              ["To", recipient],
              ["Amount", formatCurrency(numericAmount)],
              ["Privacy", "Share only what is needed"],
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
                  toast.error("PIN does not match");
                  setError("PIN does not match");
                  return;
                }
                void run();
              });
            }}
            value={pin}
          />
        )}
        {stage === "progress" && <ProgressState steps={["Generating proof", "Submitting confidential transfer", "Updating history"]} />}
        {stage === "success" && (
          <div className="success-state">
            <span className="success-icon">
              <FiCheck />
            </span>
            <h3>Payment sent privately</h3>
            <p>{formatCurrency(numericAmount)} to {recipient}</p>
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

function Review({
  cta,
  items,
  onBack,
  onContinue,
}: {
  cta: string;
  items: [string, string][];
  onBack: () => void;
  onContinue: () => void;
}) {
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
          {cta}
        </button>
      </div>
    </div>
  );
}
