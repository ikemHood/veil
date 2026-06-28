import { bytesToHex } from "@sct01/sdk";
import { createShieldedPoolContract } from "../contracts/shielded-pool.contract";
import { requireAssetId } from "../contracts/soroban.client";
import { walletService } from "../wallet/wallet.service";
import { findExactNote, getPrivateBalance, getNotesState, saveNotesState } from "./note-store";
import { getNullifier, prepareWithdrawProof } from "./proof.service";
import { preparePrivateTransfer, submitPrivateTransfer } from "./transfer.service";
import type { PrivacyTxResult } from "./privacy.types";

export async function withdrawPrivate(userId: string, owner: string, amount: bigint, destination: string): Promise<PrivacyTxResult> {
  const assetId = requireAssetId();
  let state = getNotesState();
  let source = findExactNote(state.notes, assetId, amount);

  if (!source) {
    const preparedSplit = await preparePrivateTransfer(userId, owner, amount, owner);
    await submitPrivateTransfer(preparedSplit, owner, owner);
    state = getNotesState();
    source = findExactNote(state.notes, assetId, amount);
  }

  if (!source) throw new Error("Unable to prepare selected withdrawal amount");

  const contract = createShieldedPoolContract();
  const root = await contract.getRoot(owner);
  const nullifier = getNullifier(source);
  const proof = await prepareWithdrawProof({
    assetId,
    root,
    source,
    leaves: state.commitmentLeaves,
    nullifier,
    destination,
    amount,
  });
  const txHash = await contract.unwrap(owner, proof, nullifier, destination, amount, root, assetId, (xdr) =>
    walletService.signTransaction(userId, xdr),
  );
  await saveNotesState({
    ...state,
    notes: state.notes.map((note) => (note.id === source.id ? { ...note, spent: true, creationTxHash: txHash } : note)),
  });
  return {
    txHash,
    proofId: `unwrap:${txHash.slice(0, 14)}`,
    nullifier: bytesToHex(nullifier),
    balance: getPrivateBalance(assetId),
  };
}
