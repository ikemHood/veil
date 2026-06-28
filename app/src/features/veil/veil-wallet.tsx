import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiCreditCard,
  FiDownload,
  FiEye,
  FiFileText,
  FiGlobe,
  FiHome,
  FiLock,
  FiLogOut,
  FiPlus,
  FiSend,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  createDisclosureProofId,
  createMockRampQuote,
  createViewKey,
  preparePrivacyProof,
  type ProofResult,
} from "./veil-services";

type OnboardingStep = "sign-in" | "pin" | "username" | "done";
type Screen = "home" | "history" | "profile";
type Sheet = "deposit" | "send" | "withdraw" | "details" | "disclosure" | null;
type FlowStage = "form" | "review" | "pin" | "progress" | "success";
type TxType = "deposit" | "send" | "receive" | "withdraw";
type TxStatus = "completed" | "processing";

type Transaction = {
  id: string;
  type: TxType;
  title: string;
  counterparty: string;
  amount: number;
  status: TxStatus;
  date: string;
  proof: ProofResult;
  destination?: string;
  receiptId?: string;
};

type DisclosureOptions = {
  amount: boolean;
  date: boolean;
  sender: boolean;
  recipient: boolean;
  destination: boolean;
  provenance: boolean;
};

const initialTransactions: Transaction[] = [
  {
    id: "tx_opening_receive",
    type: "receive",
    title: "Private receive",
    counterparty: "maya@veil",
    amount: 240,
    status: "completed",
    date: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    proof: {
      id: "proof_opening_receive",
      commitment: "cm_9Bb4xKpT2LmQpR8sA7vY2nP",
      generatedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      action: "send",
    },
    receiptId: "rcpt_YJ29Q8",
  },
];

const depositSteps = [
  "Waiting for deposit",
  "Deposit received",
  "Securing deposit",
  "Private balance updated",
];

const proofSteps = [
  "Preparing private payment",
  "Generating proof",
  "Submitting securely",
  "Private receipt ready",
];

const withdrawSteps = [
  "Preparing withdrawal",
  "Unshielding selected amount",
  "Sending to destination",
  "History updated",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function makeTxId() {
  return `tx_${Date.now().toString(36)}`;
}

export function VeilWallet() {
  const [onboardingStep, setOnboardingStep] =
    useState<OnboardingStep>("sign-in");
  const [pin, setPin] = useState("");
  const [pinDraft, setPinDraft] = useState("");
  const [pinError, setPinError] = useState("");
  const [username, setUsername] = useState("ikem");
  const [handle, setHandle] = useState("ikem@veil");
  const [screen, setScreen] = useState<Screen>("home");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [balance, setBalance] = useState(240);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [activeDisclosure, setActiveDisclosure] = useState<{
    tx: Transaction;
    viewKey: string;
    proofId: string;
    options: DisclosureOptions;
  } | null>(null);

  const selectedTx = transactions.find((tx) => tx.id === selectedTxId) ?? null;
  const recentTransactions = transactions.slice(0, 4);
  const completedOnboarding = onboardingStep === "done";

  const openSheet = (nextSheet: Sheet) => {
    setSheet(nextSheet);
    setActiveDisclosure(null);
  };

  const openTx = (txId: string) => {
    setSelectedTxId(txId);
    openSheet("details");
  };

  if (!completedOnboarding) {
    return (
      <main className="veil-root">
        <div className="phone-shell">
          <Onboarding
            handle={handle}
            pinDraft={pinDraft}
            pinError={pinError}
            setPinDraft={setPinDraft}
            setPinError={setPinError}
            setPin={setPin}
            setHandle={setHandle}
            setOnboardingStep={setOnboardingStep}
            setUsername={setUsername}
            step={onboardingStep}
            username={username}
          />
        </div>
      </main>
    );
  }

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
              <p>{handle}</p>
            </div>
            <button className="icon-button" type="button" aria-label="Lock app">
              <FiLock />
            </button>
          </header>

          {screen === "home" && (
            <HomeScreen
              balance={balance}
              handle={handle}
              openSheet={openSheet}
              openTx={openTx}
              recentTransactions={recentTransactions}
              setScreen={setScreen}
            />
          )}

          {screen === "history" && (
            <HistoryScreen openTx={openTx} transactions={transactions} />
          )}

          {screen === "profile" && (
            <ProfileScreen
              handle={handle}
              transactionCount={transactions.length}
              reset={() => {
                setOnboardingStep("sign-in");
                setPin("");
                setPinDraft("");
                setSheet(null);
              }}
            />
          )}

          <BottomNav screen={screen} setScreen={setScreen} />
        </section>

        {sheet === "deposit" && (
          <DepositSheet
            close={() => setSheet(null)}
            onComplete={(amount, proof) => {
              setBalance((current) => current + amount);
              setTransactions((current) => [
                {
                  id: makeTxId(),
                  type: "deposit",
                  title: "Deposit secured",
                  counterparty: "Veil Dollar account",
                  amount,
                  status: "completed",
                  date: new Date().toISOString(),
                  proof,
                  receiptId: `rcpt_${makeTxId().slice(-7).toUpperCase()}`,
                },
                ...current,
              ]);
            }}
          />
        )}

        {sheet === "send" && (
          <SendSheet
            balance={balance}
            close={() => setSheet(null)}
            expectedPin={pin}
            handle={handle}
            onComplete={(amount, recipient, proof) => {
              setBalance((current) => current - amount);
              setTransactions((current) => [
                {
                  id: makeTxId(),
                  type: "send",
                  title: "Private send",
                  counterparty: recipient,
                  amount,
                  status: "completed",
                  date: new Date().toISOString(),
                  proof,
                  receiptId: `rcpt_${makeTxId().slice(-7).toUpperCase()}`,
                },
                ...current,
              ]);
            }}
          />
        )}

        {sheet === "withdraw" && (
          <WithdrawSheet
            balance={balance}
            close={() => setSheet(null)}
            expectedPin={pin}
            onComplete={(amount, destination, proof) => {
              setBalance((current) => current - amount);
              setTransactions((current) => [
                {
                  id: makeTxId(),
                  type: "withdraw",
                  title: "Private balance withdrawal",
                  counterparty: "External wallet",
                  amount,
                  status: "completed",
                  date: new Date().toISOString(),
                  proof,
                  destination,
                  receiptId: `rcpt_${makeTxId().slice(-7).toUpperCase()}`,
                },
                ...current,
              ]);
            }}
          />
        )}

        {sheet === "details" && selectedTx && (
          <TransactionDetailsSheet
            close={() => setSheet(null)}
            openDisclosure={() => openSheet("disclosure")}
            tx={selectedTx}
          />
        )}

        {sheet === "disclosure" && selectedTx && (
          <DisclosureSheet
            activeDisclosure={activeDisclosure}
            close={() => setSheet(null)}
            expectedPin={pin}
            setActiveDisclosure={setActiveDisclosure}
            tx={selectedTx}
          />
        )}
      </div>
    </main>
  );
}

function Onboarding({
  handle,
  pinDraft,
  pinError,
  setHandle,
  setOnboardingStep,
  setPin,
  setPinDraft,
  setPinError,
  setUsername,
  step,
  username,
}: {
  handle: string;
  pinDraft: string;
  pinError: string;
  setHandle: (handle: string) => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  setPin: (pin: string) => void;
  setPinDraft: (pin: string) => void;
  setPinError: (message: string) => void;
  setUsername: (username: string) => void;
  step: OnboardingStep;
  username: string;
}) {
  const steps: OnboardingStep[] = ["sign-in", "pin", "username", "done"];
  const activeIndex = steps.indexOf(step);

  const claimUsername = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = username
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 18);
    if (!clean) return;
    setUsername(clean);
    setHandle(`${clean}@veil`);
    setOnboardingStep("done");
  };

  return (
    <section className="onboarding-screen">
      <div className="onboarding-top">
        <div className="brand-row large">
          <span className="brand-mark">V</span>
          <span>Veil</span>
        </div>
        <div className="step-dots" aria-label="Onboarding progress">
          {[0, 1, 2].map((index) => (
            <span
              className={index <= activeIndex ? "step-dot active" : "step-dot"}
              key={index}
            />
          ))}
        </div>
      </div>

      {step === "sign-in" && (
        <div className="onboarding-card">
          <FiGlobe className="hero-icon" />
          <h1>Private dollars, ready anywhere</h1>
          <p>
            Access a global dollar wallet with private transfers on by default.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={() => setOnboardingStep("pin")}
          >
            <FiShield />
            Sign in
          </button>
        </div>
      )}

      {step === "pin" && (
        <div className="onboarding-card">
          <FiLock className="hero-icon" />
          <h1>Set transaction PIN</h1>
          <p>Use this PIN to approve sends, withdrawals, and disclosures.</p>
          <PinPad
            error={pinError}
            onChange={(value) => {
              setPinDraft(value);
              setPinError("");
            }}
            onComplete={(value) => {
              setPin(value);
              setPinDraft("");
              setOnboardingStep("username");
            }}
            value={pinDraft}
          />
        </div>
      )}

      {step === "username" && (
        <form className="onboarding-card" onSubmit={claimUsername}>
          <FiUser className="hero-icon" />
          <h1>Claim payment handle</h1>
          <p>People can pay you by username instead of address.</p>
          <label className="field-label" htmlFor="username">
            Username
          </label>
          <div className="handle-input">
            <input
              id="username"
              maxLength={18}
              onChange={(event) => setUsername(event.target.value)}
              value={username}
            />
            <span>@veil</span>
          </div>
          <div className="handle-preview">{handle}</div>
          <button className="primary-button" type="submit">
            <FiCheck />
            Continue
          </button>
        </form>
      )}
    </section>
  );
}

function HomeScreen({
  balance,
  handle,
  openSheet,
  openTx,
  recentTransactions,
  setScreen,
}: {
  balance: number;
  handle: string;
  openSheet: (sheet: Sheet) => void;
  openTx: (txId: string) => void;
  recentTransactions: Transaction[];
  setScreen: (screen: Screen) => void;
}) {
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
          <span>Disclosure ready</span>
        </div>
      </section>

      <section className="action-grid" aria-label="Main actions">
        <ActionButton icon={<FiPlus />} label="Deposit" onClick={() => openSheet("deposit")} />
        <ActionButton icon={<FiSend />} label="Send" onClick={() => openSheet("send")} />
        <ActionButton icon={<FiDownload />} label="Withdraw" onClick={() => openSheet("withdraw")} />
        <ActionButton icon={<FiClock />} label="History" onClick={() => setScreen("history")} />
      </section>

      <section className="status-grid">
        <StatusCard
          icon={<FiLock />}
          label="Privacy status"
          value="Private by default"
        />
        <StatusCard
          icon={<FiFileText />}
          label="Compliance"
          value="Receipts available"
        />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Recent activity</h2>
          <span>Latest</span>
        </div>
        <TransactionList onOpen={openTx} transactions={recentTransactions} />
      </section>
    </div>
  );
}

function HistoryScreen({
  openTx,
  transactions,
}: {
  openTx: (txId: string) => void;
  transactions: Transaction[];
}) {
  return (
    <div className="screen-content">
      <section className="section-block flush-top">
        <div className="section-heading">
          <h1>History</h1>
          <span>{transactions.length} items</span>
        </div>
        <TransactionList onOpen={openTx} transactions={transactions} />
      </section>
    </div>
  );
}

function ProfileScreen({
  handle,
  reset,
  transactionCount,
}: {
  handle: string;
  reset: () => void;
  transactionCount: number;
}) {
  return (
    <div className="screen-content">
      <section className="profile-panel">
        <span className="avatar">{handle.slice(0, 1).toUpperCase()}</span>
        <h1>{handle}</h1>
        <p>Private dollar wallet active</p>
      </section>
      <section className="settings-list">
        <InfoRow icon={<FiShield />} label="Default privacy" value="Enabled" />
        <InfoRow icon={<FiFileText />} label="Disclosure tools" value="Ready" />
        <InfoRow icon={<FiFileText />} label="Receipts" value={`${transactionCount}`} />
      </section>
      <button className="secondary-button danger" type="button" onClick={reset}>
        <FiLogOut />
        Sign out
      </button>
    </div>
  );
}

function DepositSheet({
  close,
  onComplete,
}: {
  close: () => void;
  onComplete: (amount: number, proof: ProofResult) => void;
}) {
  const [amount, setAmount] = useState("300");
  const [stage, setStage] = useState<FlowStage>("form");
  const [stepIndex, setStepIndex] = useState(0);
  const [proof, setProof] = useState<ProofResult | null>(null);
  const numericAmount = Number(amount);
  const quote = useMemo(
    () => createMockRampQuote(Number.isFinite(numericAmount) ? numericAmount : 0),
    [numericAmount],
  );

  const runDeposit = async () => {
    if (!numericAmount || numericAmount <= 0) return;
    setStage("progress");
    setStepIndex(0);
    for (let index = 0; index < depositSteps.length; index += 1) {
      setStepIndex(index);
      await new Promise((resolve) => window.setTimeout(resolve, 620));
    }
    const nextProof = await preparePrivacyProof("deposit");
    setProof(nextProof);
    onComplete(numericAmount, nextProof);
    setStage("success");
  };

  return (
    <BottomSheet close={close} title="Deposit">
      {stage === "form" && (
        <div className="flow-stack">
          <AmountField amount={amount} setAmount={setAmount} />
          <div className="preset-row">
            {[100, 300, 500].map((value) => (
              <button key={value} type="button" onClick={() => setAmount(String(value))}>
                {formatCurrency(value)}
              </button>
            ))}
          </div>
          <div className="instruction-card">
            <span>Deposit instructions</span>
            <strong>{quote.providerRef}</strong>
            <p>
              Add dollars by card or bank transfer. Funds are secured into your
              private balance after arrival.
            </p>
          </div>
          <button className="primary-button" type="button" onClick={runDeposit}>
            <FiCreditCard />
            Continue
          </button>
        </div>
      )}

      {stage === "progress" && (
        <ProgressState steps={depositSteps} activeIndex={stepIndex} />
      )}

      {stage === "success" && proof && (
        <SuccessState
          action="Deposit secured"
          detail={`${formatCurrency(numericAmount)} added to private balance`}
          proof={proof}
        />
      )}
    </BottomSheet>
  );
}

function SendSheet({
  balance,
  close,
  expectedPin,
  handle,
  onComplete,
}: {
  balance: number;
  close: () => void;
  expectedPin: string;
  handle: string;
  onComplete: (amount: number, recipient: string, proof: ProofResult) => void;
}) {
  const [recipient, setRecipient] = useState("maya@veil");
  const [amount, setAmount] = useState("75");
  const [stage, setStage] = useState<FlowStage>("form");
  const [stepIndex, setStepIndex] = useState(0);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [proof, setProof] = useState<ProofResult | null>(null);
  const numericAmount = Number(amount);
  const canContinue =
    recipient.includes("@veil") && numericAmount > 0 && numericAmount <= balance;

  const runSend = async () => {
    setStage("progress");
    for (let index = 0; index < proofSteps.length; index += 1) {
      setStepIndex(index);
      await new Promise((resolve) => window.setTimeout(resolve, 560));
    }
    const nextProof = await preparePrivacyProof("send");
    setProof(nextProof);
    onComplete(numericAmount, recipient, nextProof);
    setStage("success");
  };

  return (
    <BottomSheet close={close} title="Send">
      {stage === "form" && (
        <form
          className="flow-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (canContinue) setStage("review");
          }}
        >
          <label className="field-label" htmlFor="recipient">
            Recipient username
          </label>
          <input
            className="text-field"
            id="recipient"
            onChange={(event) => setRecipient(event.target.value)}
            value={recipient}
          />
          <AmountField amount={amount} setAmount={setAmount} />
          <p className="quiet-line">Available {formatCurrency(balance)}</p>
          <button className="primary-button" disabled={!canContinue} type="submit">
            Review payment
          </button>
        </form>
      )}

      {stage === "review" && (
        <ReviewBlock
          cta="Confirm with PIN"
          items={[
            ["From", handle],
            ["To", recipient],
            ["Amount", formatCurrency(numericAmount)],
            ["Privacy", "Private by default"],
          ]}
          onBack={() => setStage("form")}
          onContinue={() => setStage("pin")}
        />
      )}

      {stage === "pin" && (
        <PinPad
          error={pinError}
          onChange={(value) => {
            setEnteredPin(value);
            setPinError("");
          }}
          onComplete={(value) => {
            if (value !== expectedPin) {
              setEnteredPin("");
              setPinError("PIN does not match");
              return;
            }
            void runSend();
          }}
          value={enteredPin}
        />
      )}

      {stage === "progress" && (
        <ProgressState steps={proofSteps} activeIndex={stepIndex} />
      )}

      {stage === "success" && proof && (
        <SuccessState
          action="Payment sent privately"
          detail={`${formatCurrency(numericAmount)} to ${recipient}`}
          proof={proof}
        />
      )}
    </BottomSheet>
  );
}

function WithdrawSheet({
  balance,
  close,
  expectedPin,
  onComplete,
}: {
  balance: number;
  close: () => void;
  expectedPin: string;
  onComplete: (amount: number, destination: string, proof: ProofResult) => void;
}) {
  const [destination, setDestination] = useState("GDL4QPRZ...J9KW");
  const [amount, setAmount] = useState("50");
  const [stage, setStage] = useState<FlowStage>("form");
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [proof, setProof] = useState<ProofResult | null>(null);
  const numericAmount = Number(amount);
  const canContinue = destination.length >= 8 && numericAmount > 0 && numericAmount <= balance;

  const runWithdraw = async () => {
    setStage("progress");
    for (let index = 0; index < withdrawSteps.length; index += 1) {
      setStepIndex(index);
      await new Promise((resolve) => window.setTimeout(resolve, 580));
    }
    const nextProof = await preparePrivacyProof("withdraw");
    setProof(nextProof);
    onComplete(numericAmount, destination, nextProof);
    setStage("success");
  };

  return (
    <BottomSheet close={close} title="Withdraw">
      {stage === "form" && (
        <form
          className="flow-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (canContinue) setStage("review");
          }}
        >
          <label className="field-label" htmlFor="destination">
            Destination address
          </label>
          <input
            className="text-field"
            id="destination"
            onChange={(event) => setDestination(event.target.value)}
            value={destination}
          />
          <AmountField amount={amount} setAmount={setAmount} />
          <button className="primary-button" disabled={!canContinue} type="submit">
            Review withdrawal
          </button>
        </form>
      )}

      {stage === "review" && (
        <ReviewBlock
          cta="Confirm with PIN"
          items={[
            ["Destination", destination],
            ["Amount", formatCurrency(numericAmount)],
            ["Private balance after", formatCurrency(balance - numericAmount)],
            ["Privacy impact", "Only selected amount leaves private balance"],
          ]}
          onBack={() => setStage("form")}
          onContinue={() => setStage("pin")}
        />
      )}

      {stage === "pin" && (
        <PinPad
          error={pinError}
          onChange={(value) => {
            setEnteredPin(value);
            setPinError("");
          }}
          onComplete={(value) => {
            if (value !== expectedPin) {
              setEnteredPin("");
              setPinError("PIN does not match");
              return;
            }
            void runWithdraw();
          }}
          value={enteredPin}
        />
      )}

      {stage === "progress" && (
        <ProgressState steps={withdrawSteps} activeIndex={stepIndex} />
      )}

      {stage === "success" && proof && (
        <SuccessState
          action="Withdrawal complete"
          detail={`${formatCurrency(numericAmount)} sent out`}
          proof={proof}
        />
      )}
    </BottomSheet>
  );
}

function DisclosureSheet({
  activeDisclosure,
  close,
  expectedPin,
  setActiveDisclosure,
  tx,
}: {
  activeDisclosure: {
    tx: Transaction;
    viewKey: string;
    proofId: string;
    options: DisclosureOptions;
  } | null;
  close: () => void;
  expectedPin: string;
  setActiveDisclosure: (value: {
    tx: Transaction;
    viewKey: string;
    proofId: string;
    options: DisclosureOptions;
  } | null) => void;
  tx: Transaction;
}) {
  const [options, setOptions] = useState<DisclosureOptions>({
    amount: true,
    date: true,
    sender: tx.type !== "deposit",
    recipient: tx.type !== "withdraw",
    destination: tx.type === "withdraw",
    provenance: true,
  });
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");
  const [needsPin, setNeedsPin] = useState(true);

  const toggle = (key: keyof DisclosureOptions) => {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <BottomSheet close={close} title="Disclosure">
      {!activeDisclosure && needsPin && (
        <div className="flow-stack">
          <p className="quiet-line">
            Confirm PIN before generating a view key, disclosure proof, or
            compliance receipt.
          </p>
          <PinPad
            error={pinError}
            onChange={(value) => {
              setPinValue(value);
              setPinError("");
            }}
            onComplete={(value) => {
              if (value !== expectedPin) {
                setPinValue("");
                setPinError("PIN does not match");
                return;
              }
              setNeedsPin(false);
            }}
            value={pinValue}
          />
        </div>
      )}

      {!activeDisclosure && !needsPin && (
        <div className="flow-stack">
          <div className="disclosure-options">
            {Object.entries(options).map(([key, checked]) => (
              <label key={key}>
                <span>{disclosureLabel(key as keyof DisclosureOptions)}</span>
                <input
                  checked={checked}
                  onChange={() => toggle(key as keyof DisclosureOptions)}
                  type="checkbox"
                />
              </label>
            ))}
          </div>
          <div className="privacy-note">
            Selected fields are revealed. Balance, PIN, unrelated activity, and
            private contacts remain hidden.
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() =>
              setActiveDisclosure({
                tx,
                viewKey: createViewKey(),
                proofId: createDisclosureProofId(),
                options,
              })
            }
          >
            <FiFileText />
            Generate compliance receipt
          </button>
        </div>
      )}

      {activeDisclosure && (
        <div className="receipt-card">
          <div className="receipt-header">
            <FiFileText />
            <div>
              <strong>Compliance receipt</strong>
              <span>{activeDisclosure.proofId}</span>
            </div>
          </div>
          <ReceiptLine label="View key" value={activeDisclosure.viewKey} />
          {activeDisclosure.options.amount && (
            <ReceiptLine label="Amount" value={formatCurrency(tx.amount)} />
          )}
          {activeDisclosure.options.date && (
            <ReceiptLine label="Date" value={formatDate(tx.date)} />
          )}
          {activeDisclosure.options.sender && (
            <ReceiptLine label="Sender" value={tx.type === "send" ? "You" : tx.counterparty} />
          )}
          {activeDisclosure.options.recipient && (
            <ReceiptLine label="Recipient" value={tx.type === "send" ? tx.counterparty : "You"} />
          )}
          {activeDisclosure.options.destination && tx.destination && (
            <ReceiptLine label="Withdrawal destination" value={tx.destination} />
          )}
          {activeDisclosure.options.provenance && (
            <ReceiptLine label="Source proof" value={tx.proof.commitment} />
          )}
          <button className="secondary-button" type="button" onClick={close}>
            Done
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

function TransactionDetailsSheet({
  close,
  openDisclosure,
  tx,
}: {
  close: () => void;
  openDisclosure: () => void;
  tx: Transaction;
}) {
  return (
    <BottomSheet close={close} title="Transaction">
      <div className="detail-hero">
        <TransactionIcon type={tx.type} />
        <strong>{formatCurrency(tx.amount)}</strong>
        <span>{tx.title}</span>
      </div>
      <div className="settings-list compact">
        <InfoRow icon={<FiUser />} label="Counterparty" value={tx.counterparty} />
        <InfoRow icon={<FiClock />} label="Date" value={formatDate(tx.date)} />
        <InfoRow icon={<FiShield />} label="Status" value={tx.status} />
        {tx.destination && (
          <InfoRow icon={<FiGlobe />} label="Destination" value={tx.destination} />
        )}
        <InfoRow icon={<FiEye />} label="Proof" value={tx.proof.id} />
      </div>
      <button className="primary-button" type="button" onClick={openDisclosure}>
        <FiFileText />
        Disclosure tools
      </button>
    </BottomSheet>
  );
}

function BottomSheet({
  children,
  close,
  title,
}: {
  children: ReactNode;
  close: () => void;
  title: string;
}) {
  return (
    <div className="sheet-backdrop">
      <section className="bottom-sheet" aria-label={title}>
        <div className="sheet-header">
          <h2>{title}</h2>
          <button className="icon-button dark" type="button" onClick={close} aria-label="Close">
            <FiX />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function AmountField({
  amount,
  setAmount,
}: {
  amount: string;
  setAmount: (amount: string) => void;
}) {
  return (
    <div>
      <label className="field-label" htmlFor="amount">
        Amount
      </label>
      <div className="money-input">
        <span>$</span>
        <input
          id="amount"
          inputMode="decimal"
          min="0"
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          value={amount}
        />
      </div>
    </div>
  );
}

function PinPad({
  error,
  onChange,
  onComplete,
  value,
}: {
  error: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  value: string;
}) {
  const press = (digit: string) => {
    if (value.length >= 4) return;
    const next = `${value}${digit}`;
    onChange(next);
    if (next.length === 4) onComplete(next);
  };

  return (
    <div className="pin-pad">
      <div className="pin-dots" aria-label={`${value.length} of 4 PIN digits entered`}>
        {[0, 1, 2, 3].map((index) => (
          <span className={index < value.length ? "filled" : ""} key={index} />
        ))}
      </div>
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((key) =>
          key === "" ? (
            <span key="spacer" />
          ) : (
            <button
              className="key-button"
              key={key}
              onClick={() => {
                if (key === "back") {
                  onChange(value.slice(0, -1));
                  return;
                }
                press(key);
              }}
              type="button"
            >
              {key === "back" ? "⌫" : key}
            </button>
          ),
        )}
      </div>
      {error && <p className="pin-error">{error}</p>}
    </div>
  );
}

function ProgressState({
  activeIndex,
  steps,
}: {
  activeIndex: number;
  steps: string[];
}) {
  return (
    <div className="progress-state">
      <div className="spinner-ring">
        <FiShield />
      </div>
      <div className="progress-list">
        {steps.map((step, index) => (
          <div className={index <= activeIndex ? "done" : ""} key={step}>
            <span>{index < activeIndex ? <FiCheck /> : index + 1}</span>
            <p>{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuccessState({
  action,
  detail,
  proof,
}: {
  action: string;
  detail: string;
  proof: ProofResult;
}) {
  return (
    <div className="success-state">
      <span className="success-icon">
        <FiCheck />
      </span>
      <h3>{action}</h3>
      <p>{detail}</p>
      <div className="receipt-card mini">
        <ReceiptLine label="Private receipt" value={proof.id} />
        <ReceiptLine label="Commitment" value={proof.commitment} />
      </div>
    </div>
  );
}

function ReviewBlock({
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
          <ReceiptLine key={label} label={label} value={value} />
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

function BottomNav({
  screen,
  setScreen,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
}) {
  const items: Array<[Screen, ReactNode, string]> = [
    ["home", <FiHome />, "Home"],
    ["history", <FiClock />, "History"],
    ["profile", <FiUser />, "Profile"],
  ];

  return (
    <nav className="bottom-nav">
      {items.map(([value, icon, label]) => (
        <button
          className={screen === value ? "active" : ""}
          key={value}
          onClick={() => setScreen(value)}
          type="button"
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function TransactionList({
  onOpen,
  transactions,
}: {
  onOpen: (txId: string) => void;
  transactions: Transaction[];
}) {
  if (transactions.length === 0) {
    return <div className="empty-state">No private activity yet.</div>;
  }

  return (
    <div className="transaction-list">
      {transactions.map((tx) => (
        <button key={tx.id} type="button" onClick={() => onOpen(tx.id)}>
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
        </button>
      ))}
    </div>
  );
}

function TransactionIcon({ type }: { type: TxType }) {
  const icon =
    type === "deposit" || type === "receive" ? <FiArrowDownLeft /> : <FiArrowUpRight />;
  return <span className={`tx-icon ${type}`}>{icon}</span>;
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="action-button" type="button" onClick={onClick}>
      <span>{icon}</span>
      {label}
    </button>
  );
}

function StatusCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="status-card">
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
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

function disclosureLabel(key: keyof DisclosureOptions) {
  const labels: Record<keyof DisclosureOptions, string> = {
    amount: "Amount",
    date: "Date",
    sender: "Sender",
    recipient: "Recipient",
    destination: "Withdrawal destination",
    provenance: "Source proof",
  };
  return labels[key];
}
