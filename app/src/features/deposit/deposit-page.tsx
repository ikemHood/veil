import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { FiCheck, FiShield } from "react-icons/fi";
import { shieldDeposit } from "../privacy/shield.service";
import { formatUsdAmount, parseUsdAmount, proofFromPrivacyResult } from "../privacy/disclosure.service";
import { makeTxId, formatCurrency } from "../transactions/format";
import { useTransactionStore } from "../transactions/transaction.store";
import { faucetWallet } from "../wallet/wallet.service";
import { useWalletStore } from "../wallet/wallet.store";

export function DepositPage({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const wallet = useWalletStore((state) => state.wallet);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const [amount, setAmount] = useState("100");
  const [stage, setStage] = useState<"form" | "progress" | "success">("form");
  const [error, setError] = useState("");
  const numericAmount = Number(amount);

  const run = async () => {
    if (!wallet) return;
    setStage("progress");
    setError("");
    try {
      await faucetWallet(userId);
      const result = await shieldDeposit(userId, wallet.accountId, parseUsdAmount(amount));
      addTransaction({
        id: makeTxId(),
        type: "deposit",
        title: "Your deposit is now private",
        counterparty: "Testnet faucet",
        amount: numericAmount,
        date: new Date().toISOString(),
        proof: proofFromPrivacyResult("deposit", result),
      });
      toast.success("Your deposit is now private");
      setStage("success");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Deposit failed";
      toast.error(message);
      setError(message);
      setStage("form");
    }
  };

  return (
    <div className="screen-content">
      <section className="section-block flush-top">
        <div className="section-heading">
          <h1>Deposit</h1>
          <span>USDC</span>
        </div>
        {stage === "form" && (
          <div className="flow-stack">
            <AmountField amount={amount} setAmount={setAmount} />
            <p className="quiet-line">Request test funds to this account. Veil shields the balance after faucet arrival.</p>
            <button className="primary-button" disabled={!wallet || numericAmount <= 0} type="button" onClick={run}>
              Faucet and shield
            </button>
            {error && <p className="pin-error">{error}</p>}
          </div>
        )}
        {stage === "progress" && (
          <ProgressState steps={["Faucet requested", "Deposit received. Securing your funds", "Updating private balance"]} />
        )}
        {stage === "success" && (
          <div className="success-state">
            <span className="success-icon">
              <FiCheck />
            </span>
            <h3>Your deposit is now private</h3>
            <p>{formatCurrency(numericAmount)} secured</p>
            <button className="primary-button" type="button" onClick={() => navigate({ to: "/home" })}>
              Done
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function AmountField({ amount, setAmount }: { amount: string; setAmount: (amount: string) => void }) {
  return (
    <div>
      <label className="field-label" htmlFor="amount">
        Amount
      </label>
      <div className="money-input">
        <span>$</span>
        <input id="amount" inputMode="decimal" min="0" onChange={(event) => setAmount(event.target.value)} type="number" value={amount} />
      </div>
      <p className="quiet-line">{formatUsdAmount(parseUsdAmount(amount || "0"))}</p>
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
