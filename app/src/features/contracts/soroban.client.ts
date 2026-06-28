import * as StellarSdk from "@stellar/stellar-sdk";
import type { ContractConfig } from "./contract.types";

export const stellarConfig: ContractConfig = {
  network: import.meta.env.VITE_STELLAR_NETWORK ?? "testnet",
  rpcUrl: import.meta.env.VITE_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
  horizonUrl: import.meta.env.VITE_STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  networkPassphrase: import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE ?? StellarSdk.Networks.TESTNET,
  wrapperContractId: import.meta.env.VITE_WRAPPER_CONTRACT_ID ?? "",
  verifierContractId: import.meta.env.VITE_VERIFIER_CONTRACT_ID ?? "",
  aspContractId: import.meta.env.VITE_ASP_CONTRACT_ID ?? "",
  assetAddress: import.meta.env.VITE_ASSET_ADDRESS ?? "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
};

export function hasContractConfig() {
  return Boolean(stellarConfig.wrapperContractId && stellarConfig.verifierContractId);
}

export function requireAssetId() {
  return stellarConfig.assetAddress;
}
