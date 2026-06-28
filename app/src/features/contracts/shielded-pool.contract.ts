import { ContractClient, bytesToHex } from "@sct01/sdk";
import { allowLocalPrivacyFallback, hasContractConfig, stellarConfig } from "./soroban.client";
import type { ShieldedPoolContract } from "./contract.types";

function localHash(prefix: string) {
  const values = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_${Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function createShieldedPoolContract(): ShieldedPoolContract {
  if (hasContractConfig()) {
    const client = new ContractClient({
      rpcUrl: stellarConfig.rpcUrl,
      horizonUrl: stellarConfig.horizonUrl,
      networkPassphrase: stellarConfig.networkPassphrase,
      wrapperContractId: stellarConfig.wrapperContractId,
      verifierContractId: stellarConfig.verifierContractId,
    });

    return {
      getNoteCount: (owner) => client.getNoteCount(owner),
      getRoot: (owner) => client.getRoot(owner),
      wrap: (owner, amount, commitment, encryptedNote, signer) => client.deposit(owner, amount, commitment, encryptedNote, signer),
      confidentialTransfer: (owner, proof, root, assetId, nullifiers, commitments, encryptedNotes, signer) =>
        client.transfer(owner, proof, root, assetId, nullifiers, commitments, encryptedNotes, signer),
      unwrap: (owner, proof, nullifier, destination, amount, root, assetId, signer) =>
        client.withdraw(owner, proof, nullifier, destination, amount, root, assetId, signer),
    };
  }

  if (!allowLocalPrivacyFallback()) {
    throw new Error("Missing cstellar contract configuration");
  }

  return {
    async getNoteCount(owner) {
      return Number(window.localStorage.getItem(`veil.local-note-count.${owner}`) ?? "0");
    },
    async getRoot(owner) {
      const bytes = new TextEncoder().encode(`local-root:${owner}`);
      return crypto.subtle.digest("SHA-256", bytes).then((digest) => new Uint8Array(digest));
    },
    async wrap(owner, _amount, commitment) {
      const current = Number(window.localStorage.getItem(`veil.local-note-count.${owner}`) ?? "0");
      window.localStorage.setItem(`veil.local-note-count.${owner}`, String(current + 1));
      return localHash(`wrap_${bytesToHex(commitment).slice(0, 10)}`);
    },
    async confidentialTransfer(owner, _proof, _root, _assetId, _nullifiers, commitments) {
      const current = Number(window.localStorage.getItem(`veil.local-note-count.${owner}`) ?? "0");
      window.localStorage.setItem(`veil.local-note-count.${owner}`, String(current + commitments.length));
      return localHash("confidential_transfer");
    },
    async unwrap() {
      return localHash("unwrap");
    },
  };
}
