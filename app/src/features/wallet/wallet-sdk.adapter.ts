import * as StellarSdk from "@stellar/stellar-sdk";
import { stellarConfig } from "../contracts/soroban.client";
import type { VeilWallet, WalletSigner } from "./wallet.types";

type StoredWallet = VeilWallet & {
  secretKey: string;
};

const walletPrefix = "veil.wallet.";

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

export async function loadWallet(userId: string) {
  const wallet = read(userId);
  if (!wallet) return null;
  const { secretKey: _secretKey, ...safeWallet } = wallet;
  return safeWallet;
}

export async function provisionWallet(userId: string, username?: string): Promise<VeilWallet> {
  const existing = read(userId);
  if (existing) {
    const next = username ? { ...existing, username } : existing;
    write(next);
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
  const { secretKey: _secretKey, ...safeWallet } = wallet;
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

export async function getSigner(userId: string): Promise<WalletSigner> {
  const wallet = read(userId);
  if (!wallet) throw new Error("Private dollar account is not ready");
  return {
    publicKey: wallet.publicKey,
    signTransaction: async (xdr) => {
      const transaction = new StellarSdk.Transaction(xdr, stellarConfig.networkPassphrase);
      transaction.sign(StellarSdk.Keypair.fromSecret(wallet.secretKey));
      return transaction.toXDR();
    },
  };
}
