import * as StellarSdk from "@stellar/stellar-sdk";
import type { ContractConfig } from "./contract.types";

const localFallbackAsset = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

export const stellarConfig: ContractConfig = {
  network: import.meta.env.VITE_STELLAR_NETWORK ?? "testnet",
  rpcUrl: import.meta.env.VITE_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
  horizonUrl: import.meta.env.VITE_STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  networkPassphrase: import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE ?? StellarSdk.Networks.TESTNET,
  wrapperContractId: import.meta.env.VITE_WRAPPER_CONTRACT_ID ?? "",
  verifierContractId: import.meta.env.VITE_VERIFIER_CONTRACT_ID ?? "",
  aspContractId: import.meta.env.VITE_ASP_CONTRACT_ID ?? "",
  assetAddress: import.meta.env.VITE_ASSET_ADDRESS ?? "",
};

export function hasContractConfig() {
  return Boolean(stellarConfig.wrapperContractId && stellarConfig.verifierContractId && stellarConfig.assetAddress);
}

export function allowLocalPrivacyFallback() {
  return import.meta.env.VITE_ALLOW_LOCAL_PRIVACY_FALLBACK === "true";
}

export function getWrapperStartLedger() {
  const value = Number(import.meta.env.VITE_WRAPPER_START_LEDGER);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

export function getEventLookbackLedgers() {
  const value = Number(import.meta.env.VITE_EVENT_LOOKBACK_LEDGERS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 200_000;
}

export function requireAssetId() {
  if (!stellarConfig.assetAddress && !allowLocalPrivacyFallback()) {
    throw new Error("Missing cstellar asset contract configuration");
  }
  return stellarConfig.assetAddress || localFallbackAsset;
}

export function getLegacyLocalAssetId() {
  return localFallbackAsset;
}
