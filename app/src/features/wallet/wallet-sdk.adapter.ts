import * as StellarSdk from "@stellar/stellar-sdk";
import { stellarConfig } from "../contracts/soroban.client";
import type { VeilWallet, WalletSigner } from "./wallet.types";

type StoredWallet = VeilWallet & {
  secretKey: string;
  fundedAt?: string;
};

const walletPrefix = "veil.wallet.";
const horizon = new StellarSdk.Horizon.Server(stellarConfig.horizonUrl);

function key(userId: string) {
  return `${walletPrefix}${userId}`;
}

function read(userId: string): StoredWallet | null {
  const raw = window.localStorage.getItem(key(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredWallet;
  } catch {
    window.localStorage.removeItem(key(userId));
    return null;
  }
}

function write(wallet: StoredWallet) {
  window.localStorage.setItem(key(wallet.userId), JSON.stringify(wallet));
}

async function accountExists(publicKey: string) {
  try {
    await horizon.loadAccount(publicKey);
    return true;
  } catch {
    return false;
  }
}

async function ensureTestnetAccount(publicKey: string) {
  if (stellarConfig.networkPassphrase !== StellarSdk.Networks.TESTNET) return;
  if (import.meta.env.VITE_AUTO_FUND_TESTNET === "false") return;
  if (await accountExists(publicKey)) return;

  const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  if (!response.ok && response.status !== 400) throw new Error("Unable to prepare account funding");
  if (!(await accountExists(publicKey))) {
    throw new Error("Account funding was requested but the account is not available yet");
  }
}

async function fundWallet(wallet: StoredWallet) {
  if (wallet.fundedAt && (await accountExists(wallet.publicKey))) return wallet;
  await ensureTestnetAccount(wallet.publicKey);
  const next = { ...wallet, fundedAt: new Date().toISOString() };
  write(next);
  return next;
}

export async function loadWallet(userId: string) {
  const wallet = read(userId);
  if (!wallet) return null;
  const { secretKey: _secretKey, ...safeWallet } = wallet;
  return safeWallet;
}

export async function provisionWallet(userId: string, username?: string): Promise<VeilWallet> {
  const existing = read(userId);
  if (existing) {
    const next = await fundWallet(username ? { ...existing, username } : existing);
    const { secretKey: _secretKey, ...safeWallet } = next;
    return safeWallet;
  }

  const keypair = StellarSdk.Keypair.random();
  const wallet: StoredWallet = {
    userId,
    publicKey: keypair.publicKey(),
    accountId: keypair.publicKey(),
    secretKey: keypair.secret(),
    username,
    status: "ready",
  };
  // Temporary local adapter: replace this browser-held key with the selected
  // Stellar Wallet SDK/passkey custody model before production deployment.
  write(wallet);
  const fundedWallet = await fundWallet(wallet);
  const { secretKey: _secretKey, ...safeWallet } = fundedWallet;
  return safeWallet;
}

export async function updateWalletUsername(userId: string, username: string) {
  const wallet = read(userId);
  if (!wallet) throw new Error("Private dollar account is not ready");
  const next = { ...wallet, username };
  write(next);
  const { secretKey: _secretKey, ...safeWallet } = next;
  return safeWallet;
}

export async function requestTestnetFaucet(userId: string) {
  const wallet = read(userId);
  if (!wallet) throw new Error("Private dollar account is not prepared");
  const fundedWallet = await fundWallet(wallet);
  const { secretKey: _secretKey, ...safeWallet } = fundedWallet;
  return safeWallet;
}

export async function getSigner(userId: string): Promise<WalletSigner> {
  const wallet = read(userId);
  if (!wallet) throw new Error("Private dollar account is not ready");
  const fundedWallet = await fundWallet(wallet);
  return {
    publicKey: fundedWallet.publicKey,
    signTransaction: async (xdr) => {
      const transaction = new StellarSdk.Transaction(xdr, stellarConfig.networkPassphrase);
      transaction.sign(StellarSdk.Keypair.fromSecret(fundedWallet.secretKey));
      return transaction.toXDR();
    },
  };
}
