export type PrivacyAction = "deposit" | "send" | "withdraw" | "disclosure";

export type ProofResult = {
  id: string;
  commitment: string;
  nullifier?: string;
  generatedAt: string;
  action: PrivacyAction;
};

export type RampQuote = {
  amount: number;
  asset: "USD";
  providerRef: string;
  estimatedArrival: string;
};

const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function token(length: number) {
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

export function createMockRampQuote(amount: number): RampQuote {
  return {
    amount,
    asset: "USD",
    providerRef: `VEIL-RAMP-${token(8).toUpperCase()}`,
    estimatedArrival: "under 1 minute",
  };
}

export async function preparePrivacyProof(
  action: PrivacyAction,
): Promise<ProofResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 520));

  return {
    id: `proof_${token(10)}`,
    commitment: `cm_${token(24)}`,
    nullifier: action === "deposit" ? undefined : `nf_${token(18)}`,
    generatedAt: new Date().toISOString(),
    action,
  };
}

export function createViewKey() {
  return `veil_view_${token(32)}`;
}

export function createDisclosureProofId() {
  return `disc_${token(18)}`;
}

