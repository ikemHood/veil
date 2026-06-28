import type { DisclosureOptions, ProofResult } from "./privacy.types";

const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function token(length: number) {
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

export function proofFromPrivacyResult(action: ProofResult["action"], result: { proofId: string; commitment?: string; nullifier?: string; txHash: string }) {
  return {
    id: result.proofId,
    commitment: result.commitment ?? result.txHash,
    nullifier: result.nullifier,
    generatedAt: new Date().toISOString(),
    action,
  };
}

export function createDisclosureProof(options: DisclosureOptions) {
  return {
    id: `disc_${token(18)}`,
    options,
    generatedAt: new Date().toISOString(),
  };
}

export function parseUsdAmount(displayAmount: string, decimals = 7): bigint {
  const value = Number.parseFloat(displayAmount);
  if (!Number.isFinite(value) || value <= 0) return 0n;
  return BigInt(Math.round(value * 10 ** decimals));
}

export function amountToNumber(amount: bigint, decimals = 7) {
  return Number(amount) / 10 ** decimals;
}

export function formatUsdAmount(amount: bigint, decimals = 7): string {
  return amountToNumber(amount, decimals).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
