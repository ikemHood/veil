import { ContractClient, bytesToHex } from "@sct01/sdk";
import * as StellarSdk from "@stellar/stellar-sdk";
import { allowLocalPrivacyFallback, getEventLookbackLedgers, getWrapperStartLedger, hasContractConfig, stellarConfig } from "./soroban.client";
import type { ShieldedPoolContract } from "./contract.types";

function localHash(prefix: string) {
  const values = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_${Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function createShieldedPoolContract(): ShieldedPoolContract {
  if (hasContractConfig()) {
    const rpc = new StellarSdk.rpc.Server(stellarConfig.rpcUrl);
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
      getCommitmentLeaves: () => fetchCommitmentLeaves(rpc),
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
    async getCommitmentLeaves() {
      return [];
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

async function fetchCommitmentLeaves(rpc: StellarSdk.rpc.Server) {
  const latest = await rpc.getLatestLedger();
  const latestLedger = latest.sequence;
  const startLedger = getWrapperStartLedger() ?? Math.max(0, latestLedger - getEventLookbackLedgers());
  const filters = ["wrap", "conf_transfer"].map((name) => ({
    type: "contract" as const,
    contractIds: [stellarConfig.wrapperContractId],
    topics: [[StellarSdk.xdr.ScVal.scvSymbol(name).toXDR("base64")]],
  }));
  const leaves: string[] = [];
  let cursor: string | undefined;

  do {
    const response = cursor ? await rpc.getEvents({ cursor, filters, limit: 200 }) : await getEventsFromLedger(rpc, filters, startLedger);
    for (const event of response.events) leaves.push(...commitmentsFromEvent(event));
    cursor = response.events.length > 0 && response.cursor ? response.cursor : undefined;
  } while (cursor);

  return leaves;
}

async function getEventsFromLedger(
  rpc: StellarSdk.rpc.Server,
  filters: StellarSdk.rpc.Api.EventFilter[],
  startLedger: number,
) {
  try {
    return await rpc.getEvents({ startLedger, filters, limit: 200 });
  } catch (caught) {
    const retryStartLedger = oldestLedgerFromError(caught);
    if (!retryStartLedger || retryStartLedger === startLedger) throw caught;
    return rpc.getEvents({ startLedger: retryStartLedger, filters, limit: 200 });
  }
}

function oldestLedgerFromError(caught: unknown) {
  const message =
    caught instanceof Error
      ? caught.message
      : caught && typeof caught === "object" && "message" in caught && typeof caught.message === "string"
        ? caught.message
        : String(caught);
  const match = message.match(/ledger range:\s*(\d+)\s*-\s*(\d+)/i);
  return match?.[1] ? Number(match[1]) : null;
}

function commitmentsFromEvent(event: StellarSdk.rpc.Api.EventResponse) {
  const eventName = String(StellarSdk.scValToNative(event.topic[0]));
  const value = StellarSdk.scValToNative(event.value) as unknown;
  if (eventName === "wrap") {
    const [commitment] = Array.isArray(value) ? value : [];
    return commitment instanceof Uint8Array ? [bytesToHex(commitment)] : [];
  }
  if (eventName === "conf_transfer") {
    const outputCommitments = Array.isArray(value) ? value[1] : null;
    if (!Array.isArray(outputCommitments)) return [];
    return outputCommitments.flatMap((commitment) => (commitment instanceof Uint8Array ? [bytesToHex(commitment)] : []));
  }
  return [];
}
