import { type FormEvent, type ReactNode, useState } from "react";
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiDownload,
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
import {
  claimVeilProfile,
  resolveVeilHandle,
  signInWithSocial,
} from "./auth-client";
import {
  connectStellarWallet,
  depositPrivate,
  formatUsdAmount,
  getPrivateBalance,
  hasContractConfig,
  parseUsdAmount,
  sendPrivate,
  unlockPrivateVault,
  withdrawPrivate,
  type PrivateTxResult,
  type WalletConnection,
} from "./stellar-private";
import {
  createDisclosureProofId,
  createViewKey,
  type ProofResult,
} from "./veil-services";

type OnboardingStep = "sign-in" | "pin" | "username" | "done";
type Screen = "home" | "history" | "profile";
type Sheet = "deposit" | "send" | "withdraw" | "details" | "disclosure" | null;
type TxType = "deposit" | "send" | "receive" | "withdraw";

type Transaction = {
  id: string;
  type: TxType;
  title: string;
  counterparty: string;
  amount: number;
  date: string;
  proof: ProofResult;
  destination?: string;
};

type DisclosureOptions = {
  amount: boolean;
  date: boolean;
  sender: boolean;
  recipient: boolean;
  destination: boolean;
  provenance: boolean;
};

function makeTxId() {
  return `tx_${Date.now().toString(36)}`;
}

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

function amountToNumber(amount: bigint) {
  return Number(amount) / 10_000_000;
}

function proofFromResult(action: ProofResult["action"], result: PrivateTxResult): ProofResult {
  return {
    id: result.proofId,
    commitment: result.commitment ?? result.txHash,
    nullifier: result.nullifier,
    generatedAt: new Date().toISOString(),
    action,
  };
}

export function VeilWallet() {
  const [step, setStep] = useState<OnboardingStep>("sign-in");
  const [pin, setPin] = useState("");
  const [pinDraft, setPinDraft] = useState("");
  const [username, setUsername] = useState("ikem");
  const [handle, setHandle] = useState("ikem@veil");
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [privateBalance, setPrivateBalance] = useState<bigint>(0n);
  const [screen, setScreen] = useState<Screen>("home");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const selectedTx = transactions.find((tx) => tx.id === selectedTxId) ?? null;
  const balance = amountToNumber(privateBalance);

  const refreshBalance = () => {
    try {
      setPrivateBalance(getPrivateBalance());
    } catch {
      setPrivateBalance(0n);
    }
  };

  const closeSheet = () => setSheet(null);

  if (step !== "done") {
    return (
      <main className="veil-root">
        <div className="phone-shell">
          <Onboarding
            handle={handle}
            onClaim={async (cleanHandle) => {
              const profile = await claimVeilProfile(cleanHandle, wallet?.address);
              setHandle(`${profile.handle}@veil`);
            }}
            onConnectWallet={async () => {
              const connection = await connectStellarWallet();
              setWallet(connection);
              return connection;
            }}
            onPin={async (value) => {
              setPin(value);
              await unlockPrivateVault(wallet?.address ?? handle, value);
              refreshBalance();
              setStep("username");
            }}
            onSocialSignIn={signInWithSocial}
            pinDraft={pinDraft}
            setHandle={setHandle}
            setPinDraft={setPinDraft}
            setStep={setStep}
            setUsername={setUsername}
            step={step}
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
              openHistory={() => setScreen("history")}
              openSheet={setSheet}
              openTx={(txId) => {
                setSelectedTxId(txId);
                setSheet("details");
              }}
              transactions={transactions.slice(0, 4)}
              wallet={wallet}
            />
          )}

          {screen === "history" && (
            <HistoryScreen
              openTx={(txId) => {
                setSelectedTxId(txId);
                setSheet("details");
              }}
              transactions={transactions}
            />
          )}

          {screen === "profile" && (
            <ProfileScreen
              handle={handle}
              reset={() => {
                setStep("sign-in");
                setPin("");
                setPinDraft("");
                setSheet(null);
              }}
              transactionCount={transactions.length}
              wallet={wallet}
            />
          )}

          <BottomNav screen={screen} setScreen={setScreen} />
        </section>

        {sheet === "deposit" && (
          <DepositSheet
            close={closeSheet}
            onComplete={async (amount) => {
              const result = await depositPrivate(parseUsdAmount(String(amount)));
              setPrivateBalance(result.balance);
              const proof = proofFromResult("deposit", result);
              setTransactions((current) => [
                {
                  id: makeTxId(),
                  type: "deposit",
                  title: "Deposit secured",
                  counterparty: "Stellar private vault",
                  amount,
                  date: new Date().toISOString(),
                  proof,
                },
                ...current,
              ]);
              return proof;
            }}
          />
        )}

        {sheet === "send" && (
          <SendSheet
            balance={balance}
            close={closeSheet}
            expectedPin={pin}
            handle={handle}
            onComplete={async (amount, recipient) => {
              const recipientAddress = recipient.endsWith("@veil")
                ? await resolveVeilHandle(recipient)
                : recipient;
              const result = await sendPrivate(parseUsdAmount(String(amount)), recipientAddress);
              setPrivateBalance(result.balance);
              const proof = proofFromResult("send", result);
              setTransactions((current) => [
                {
                  id: makeTxId(),
                  type: "send",
                  title: "Private send",
                  counterparty: recipient,
                  amount,
                  date: new Date().toISOString(),
                  proof,
                },
                ...current,
              ]);
              return proof;
            }}
          />
        )}

        {sheet === "withdraw" && (
          <WithdrawSheet
            balance={balance}
            close={closeSheet}
            expectedPin={pin}
            onComplete={async (amount, destination) => {
              const result = await withdrawPrivate(parseUsdAmount(String(amount)), destination);
              setPrivateBalance(result.balance);
              const proof = proofFromResult("withdraw", result);
              setTransactions((current) => [
                {
                  id: makeTxId(),
                  type: "withdraw",
                  title: "Private balance withdrawal",
                  counterparty: "External wallet",
                  amount,
                  date: new Date().toISOString(),
                  proof,
                  destination,
                },
                ...current,
              ]);
              return proof;
            }}
          />
        )}

        {sheet === "details" && selectedTx && (
          <TransactionDetailsSheet
            close={closeSheet}
            openDisclosure={() => setSheet("disclosure")}
            tx={selectedTx}
          />
        )}

        {sheet === "disclosure" && selectedTx && (
          <DisclosureSheet close={closeSheet} expectedPin={pin} tx={selectedTx} />
        )}
      </div>
    </main>
  );
}

function Onboarding({
  handle,
  onClaim,
  onConnectWallet,
  onPin,
  onSocialSignIn,
  pinDraft,
  setHandle,
  setPinDraft,
  setStep,
  setUsername,
  step,
  username,
}: {
  handle: string;
  onClaim: (handle: string) => Promise<void>;
  onConnectWallet: () => Promise<WalletConnection>;
  onPin: (pin: string) => Promise<void>;
  onSocialSignIn: (provider: "google" | "facebook") => Promise<void>;
  pinDraft: string;
  setHandle: (handle: string) => void;
  setPinDraft: (pin: string) => void;
  setStep: (step: OnboardingStep) => void;
  setUsername: (username: string) => void;
  step: OnboardingStep;
  username: string;
}) {
  const [error, setError] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [claiming, setClaiming] = useState(false);

  const claimUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = username.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 18);
    if (!clean) return;
    setClaiming(true);
    setError("");
    try {
      await onClaim(clean);
      setUsername(clean);
      setHandle(`${clean}@veil`);
      setStep("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Handle claim failed");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <section className="onboarding-screen">
      <div className="onboarding-top">
        <div className="brand-row large">
          <span className="brand-mark">V</span>
          <span>Veil</span>
        </div>
        <div className="step-dots" aria-label="Onboarding progress">
          {["sign-in", "pin", "username"].map((item) => (
            <span className={item === step ? "step-dot active" : "step-dot"} key={item} />
          ))}
        </div>
      </div>

      {step === "sign-in" && (
        <div className="onboarding-card">
          <FiGlobe className="hero-icon" />
          <h1>Private dollars, ready anywhere</h1>
          <p>Sign in, connect a Stellar wallet, then keep notes encrypted on this device.</p>
          <div className="social-grid">
            <button
              className="secondary-button dark-surface"
              type="button"
              onClick={() =>
                onSocialSignIn("google").catch((caught: unknown) =>
                  setError(caught instanceof Error ? caught.message : "Google sign-in failed"),
                )
              }
            >
              Google
            </button>
            <button
              className="secondary-button dark-surface"
              type="button"
              onClick={() =>
                onSocialSignIn("facebook").catch((caught: unknown) =>
                  setError(caught instanceof Error ? caught.message : "Facebook sign-in failed"),
                )
              }
            >
              Facebook
            </button>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() =>
              onConnectWallet()
                .then((wallet) => {
                  setWalletAddress(wallet.address);
                  setStep("pin");
                })
                .catch((caught: unknown) =>
                  setError(caught instanceof Error ? caught.message : "Wallet connection failed"),
                )
            }
          >
            <FiShield />
            Connect Stellar wallet
          </button>
          {walletAddress && <div className="handle-preview">{walletAddress}</div>}
          {error && <p className="pin-error">{error}</p>}
        </div>
      )}

      {step === "pin" && (
        <div className="onboarding-card">
          <FiLock className="hero-icon" />
          <h1>Set transaction PIN</h1>
          <p>Your PIN encrypts local notes and approves private actions.</p>
          <PinPad
            error={error}
            onChange={(value) => {
              setPinDraft(value);
              setError("");
            }}
            onComplete={(value) =>
              onPin(value).catch((caught: unknown) => {
                setPinDraft("");
                setError(caught instanceof Error ? caught.message : "Vault unlock failed");
              })
            }
            value={pinDraft}
          />
        </div>
      )}

      {step === "username" && (
        <form className="onboarding-card" onSubmit={claimUsername}>
          <FiUser className="hero-icon" />
          <h1>Claim payment handle</h1>
          <p>Handles resolve to wallet addresses for private sends.</p>
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
          <button className="primary-button" disabled={claiming} type="submit">
            <FiCheck />
            {claiming ? "Claiming..." : "Continue"}
          </button>
          {error && <p className="pin-error">{error}</p>}
        </form>
      )}
    </section>
  );
}

function HomeScreen({
  balance,
  handle,
  openHistory,
  openSheet,
  openTx,
  transactions,
  wallet,
}: {
  balance: number;
  handle: string;
  openHistory: () => void;
  openSheet: (sheet: Sheet) => void;
  openTx: (txId: string) => void;
  transactions: Transaction[];
  wallet: WalletConnection | null;
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

      <section className={hasContractConfig() ? "wallet-strip" : "setup-warning"}>
        <FiShield />
        <span>
          {hasContractConfig()
            ? wallet?.address ?? "Connect Stellar wallet"
            : "Set VITE_WRAPPER_CONTRACT_ID, VITE_VERIFIER_CONTRACT_ID, and VITE_ASSET_ADDRESS."}
        </span>
      </section>

      <section className="action-grid" aria-label="Main actions">
        <ActionButton icon={<FiPlus />} label="Deposit" onClick={() => openSheet("deposit")} />
        <ActionButton icon={<FiSend />} label="Send" onClick={() => openSheet("send")} />
        <ActionButton icon={<FiDownload />} label="Withdraw" onClick={() => openSheet("withdraw")} />
        <ActionButton icon={<FiClock />} label="History" onClick={openHistory} />
      </section>

      <section className="status-grid">
        <StatusCard icon={<FiLock />} label="Notes vault" value="Encrypted locally" />
        <StatusCard icon={<FiFileText />} label="ZK proofs" value="Circom Groth16" />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Recent activity</h2>
          <span>{transactions.length ? "Latest" : "Empty"}</span>
        </div>
        <TransactionList onOpen={openTx} transactions={transactions} />
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
  wallet,
}: {
  handle: string;
  reset: () => void;
  transactionCount: number;
  wallet: WalletConnection | null;
}) {
  return (
    <div className="screen-content">
      <section className="profile-panel">
        <span className="avatar">{handle.slice(0, 1).toUpperCase()}</span>
        <h1>{handle}</h1>
        <p>{wallet?.address ?? "No wallet connected"}</p>
      </section>
      <section className="settings-list">
        <InfoRow icon={<FiShield />} label="Default privacy" value="Enabled" />
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
  onComplete: (amount: number) => Promise<ProofResult>;
}) {
  const [amount, setAmount] = useState("100");
  const [stage, setStage] = useState<"form" | "progress" | "success">("form");
  const [error, setError] = useState("");
  const [proof, setProof] = useState<ProofResult | null>(null);
  const numericAmount = Number(amount);

  const run = async () => {
    setError("");
    setStage("progress");
    try {
      const nextProof = await onComplete(numericAmount);
      setProof(nextProof);
      setStage("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deposit failed");
      setStage("form");
    }
  };

  return (
    <BottomSheet close={close} title="Deposit">
      {stage === "form" && (
        <div className="flow-stack">
          <AmountField amount={amount} setAmount={setAmount} />
          <p className="quiet-line">Deposit submits `wrap` to the cstellar adapter and saves the note encrypted.</p>
          <button className="primary-button" type="button" onClick={run}>
            Continue
          </button>
          {error && <p className="pin-error">{error}</p>}
        </div>
      )}
      {stage === "progress" && <ProgressState steps={["Preparing note", "Submitting wrap", "Saving encrypted note"]} />}
      {stage === "success" && proof && (
        <SuccessState action="Deposit secured" detail={`${formatCurrency(numericAmount)} shielded`} proof={proof} />
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
  onComplete: (amount: number, recipient: string) => Promise<ProofResult>;
}) {
  const [recipient, setRecipient] = useState("maya@veil");
  const [amount, setAmount] = useState("25");
  const [stage, setStage] = useState<"form" | "review" | "pin" | "progress" | "success">("form");
  const [pinValue, setPinValue] = useState("");
  const [error, setError] = useState("");
  const [proof, setProof] = useState<ProofResult | null>(null);
  const numericAmount = Number(amount);

  const run = async () => {
    setStage("progress");
    setError("");
    try {
      const nextProof = await onComplete(numericAmount, recipient);
      setProof(nextProof);
      setStage("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Private send failed");
      setStage("form");
    }
  };

  return (
    <BottomSheet close={close} title="Send">
      {stage === "form" && (
        <form className="flow-stack" onSubmit={(event) => { event.preventDefault(); setStage("review"); }}>
          <label className="field-label" htmlFor="recipient">Recipient</label>
          <input className="text-field" id="recipient" onChange={(event) => setRecipient(event.target.value)} value={recipient} />
          <AmountField amount={amount} setAmount={setAmount} />
          <p className="quiet-line">Available {formatCurrency(balance)}</p>
          <button className="primary-button" disabled={numericAmount <= 0 || numericAmount > balance} type="submit">Review payment</button>
          {error && <p className="pin-error">{error}</p>}
        </form>
      )}
      {stage === "review" && (
        <ReviewBlock
          cta="Confirm with PIN"
          items={[["From", handle], ["To", recipient], ["Amount", formatCurrency(numericAmount)], ["Privacy", "Private by default"]]}
          onBack={() => setStage("form")}
          onContinue={() => setStage("pin")}
        />
      )}
      {stage === "pin" && (
        <PinPad
          error={error}
          onChange={(value) => { setPinValue(value); setError(""); }}
          onComplete={(value) => {
            if (value !== expectedPin) {
              setPinValue("");
              setError("PIN does not match");
              return;
            }
            void run();
          }}
          value={pinValue}
        />
      )}
      {stage === "progress" && <ProgressState steps={["Generating proof", "Submitting private transfer", "Updating notes"]} />}
      {stage === "success" && proof && (
        <SuccessState action="Payment sent privately" detail={`${formatCurrency(numericAmount)} to ${recipient}`} proof={proof} />
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
  onComplete: (amount: number, destination: string) => Promise<ProofResult>;
}) {
  const [destination, setDestination] = useState("G...");
  const [amount, setAmount] = useState("25");
  const [stage, setStage] = useState<"form" | "review" | "pin" | "progress" | "success">("form");
  const [pinValue, setPinValue] = useState("");
  const [error, setError] = useState("");
  const [proof, setProof] = useState<ProofResult | null>(null);
  const numericAmount = Number(amount);

  const run = async () => {
    setStage("progress");
    setError("");
    try {
      const nextProof = await onComplete(numericAmount, destination);
      setProof(nextProof);
      setStage("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Withdrawal failed");
      setStage("form");
    }
  };

  return (
    <BottomSheet close={close} title="Withdraw">
      {stage === "form" && (
        <form className="flow-stack" onSubmit={(event) => { event.preventDefault(); setStage("review"); }}>
          <label className="field-label" htmlFor="destination">Destination address</label>
          <input className="text-field" id="destination" onChange={(event) => setDestination(event.target.value)} value={destination} />
          <AmountField amount={amount} setAmount={setAmount} />
          <button className="primary-button" disabled={numericAmount <= 0 || numericAmount > balance} type="submit">Review withdrawal</button>
          {error && <p className="pin-error">{error}</p>}
        </form>
      )}
      {stage === "review" && (
        <ReviewBlock
          cta="Confirm with PIN"
          items={[["Destination", destination], ["Amount", formatCurrency(numericAmount)], ["Private balance after", formatCurrency(balance - numericAmount)], ["Privacy impact", "Only selected amount exits"]]}
          onBack={() => setStage("form")}
          onContinue={() => setStage("pin")}
        />
      )}
      {stage === "pin" && (
        <PinPad
          error={error}
          onChange={(value) => { setPinValue(value); setError(""); }}
          onComplete={(value) => {
            if (value !== expectedPin) {
              setPinValue("");
              setError("PIN does not match");
              return;
            }
            void run();
          }}
          value={pinValue}
        />
      )}
      {stage === "progress" && <ProgressState steps={["Preparing proof", "Unshielding selected amount", "Submitting withdrawal"]} />}
      {stage === "success" && proof && (
        <SuccessState action="Withdrawal complete" detail={`${formatCurrency(numericAmount)} sent out`} proof={proof} />
      )}
    </BottomSheet>
  );
}

function DisclosureSheet({
  close,
  expectedPin,
  tx,
}: {
  close: () => void;
  expectedPin: string;
  tx: Transaction;
}) {
  const [pinValue, setPinValue] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    viewKey: string;
    proofId: string;
    options: DisclosureOptions;
  } | null>(null);
  const options: DisclosureOptions = {
    amount: true,
    date: true,
    sender: tx.type !== "deposit",
    recipient: tx.type !== "withdraw",
    destination: tx.type === "withdraw",
    provenance: true,
  };

  return (
    <BottomSheet close={close} title="Disclosure">
      {!receipt && (
        <div className="flow-stack">
          <p className="quiet-line">Confirm PIN before generating a view key, disclosure proof, or receipt.</p>
          <PinPad
            error={error}
            onChange={(value) => { setPinValue(value); setError(""); }}
            onComplete={(value) => {
              if (value !== expectedPin) {
                setPinValue("");
                setError("PIN does not match");
                return;
              }
              setReceipt({ viewKey: createViewKey(), proofId: createDisclosureProofId(), options });
            }}
            value={pinValue}
          />
        </div>
      )}
      {receipt && (
        <div className="receipt-card">
          <div className="receipt-header">
            <FiFileText />
            <div>
              <strong>Compliance receipt</strong>
              <span>{receipt.proofId}</span>
            </div>
          </div>
          <ReceiptLine label="View key" value={receipt.viewKey} />
          {receipt.options.amount && <ReceiptLine label="Amount" value={formatCurrency(tx.amount)} />}
          {receipt.options.date && <ReceiptLine label="Date" value={formatDate(tx.date)} />}
          {receipt.options.sender && <ReceiptLine label="Sender" value={tx.type === "send" ? "You" : tx.counterparty} />}
          {receipt.options.recipient && <ReceiptLine label="Recipient" value={tx.type === "send" ? tx.counterparty : "You"} />}
          {receipt.options.destination && tx.destination && <ReceiptLine label="Withdrawal destination" value={tx.destination} />}
          {receipt.options.provenance && <ReceiptLine label="Source proof" value={tx.proof.commitment} />}
          <button className="secondary-button" type="button" onClick={close}>Done</button>
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
        <InfoRow icon={<FiShield />} label="Proof" value={tx.proof.id} />
        {tx.destination && <InfoRow icon={<FiGlobe />} label="Destination" value={tx.destination} />}
      </div>
      <button className="primary-button" type="button" onClick={openDisclosure}>
        <FiFileText />
        Disclosure tools
      </button>
    </BottomSheet>
  );
}

function BottomSheet({ children, close, title }: { children: ReactNode; close: () => void; title: string }) {
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

function AmountField({ amount, setAmount }: { amount: string; setAmount: (amount: string) => void }) {
  return (
    <div>
      <label className="field-label" htmlFor="amount">Amount</label>
      <div className="money-input">
        <span>$</span>
        <input id="amount" inputMode="decimal" min="0" onChange={(event) => setAmount(event.target.value)} type="number" value={amount} />
      </div>
      <p className="quiet-line">{formatUsdAmount(parseUsdAmount(amount || "0"))}</p>
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
      <div className="pin-dots">
        {[0, 1, 2, 3].map((index) => <span className={index < value.length ? "filled" : ""} key={index} />)}
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
                if (key === "back") onChange(value.slice(0, -1));
                else press(key);
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

function SuccessState({ action, detail, proof }: { action: string; detail: string; proof: ProofResult }) {
  return (
    <div className="success-state">
      <span className="success-icon"><FiCheck /></span>
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
        {items.map(([label, value]) => <ReceiptLine key={label} label={label} value={value} />)}
      </div>
      <div className="dual-actions">
        <button className="secondary-button" type="button" onClick={onBack}>Back</button>
        <button className="primary-button" type="button" onClick={onContinue}>{cta}</button>
      </div>
    </div>
  );
}

function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const items: Array<[Screen, ReactNode, string]> = [
    ["home", <FiHome />, "Home"],
    ["history", <FiClock />, "History"],
    ["profile", <FiUser />, "Profile"],
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([value, icon, label]) => (
        <button className={screen === value ? "active" : ""} key={value} onClick={() => setScreen(value)} type="button">
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function TransactionList({ onOpen, transactions }: { onOpen: (txId: string) => void; transactions: Transaction[] }) {
  if (transactions.length === 0) return <div className="empty-state">No private activity yet.</div>;
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
  const icon = type === "deposit" || type === "receive" ? <FiArrowDownLeft /> : <FiArrowUpRight />;
  return <span className={`tx-icon ${type}`}>{icon}</span>;
}

function ActionButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="action-button" type="button" onClick={onClick}>
      <span>{icon}</span>
      {label}
    </button>
  );
}

function StatusCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="status-card">
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
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
