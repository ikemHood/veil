import { requireAssetId, stellarConfig } from "../contracts/soroban.client";
import { faucetWallet } from "../wallet/wallet.service";
import { parseUsdAmount } from "./disclosure.service";
import { getNotesState, getPrivateBalance } from "./note-store";
import { shieldDeposit } from "./shield.service";

const demoBalance = parseUsdAmount("200");
const seedPrefix = "veil.demo-private-balance.";
const inFlight = new Set<string>();

function seedKey(owner: string) {
  return `${seedPrefix}${stellarConfig.wrapperContractId || "local"}:${requireAssetId()}:${owner}`;
}

export async function ensureDemoPrivateBalance(userId: string, owner: string) {
  const key = seedKey(owner);
  if (inFlight.has(key) || window.localStorage.getItem(key)) return;
  const state = getNotesState();
  if (state.notes.length > 0 || getPrivateBalance() > 0n) return;

  inFlight.add(key);
  try {
    await faucetWallet(userId);
    await shieldDeposit(userId, owner, demoBalance);
    window.localStorage.setItem(key, new Date().toISOString());
  } finally {
    inFlight.delete(key);
  }
}
