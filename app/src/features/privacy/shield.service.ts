import { bytesToHex } from "@sct01/sdk";
import { createShieldedPoolContract } from "../contracts/shielded-pool.contract";
import { requireAssetId } from "../contracts/soroban.client";
import { walletService } from "../wallet/wallet.service";
import { createStoredNote, encodeNote, getPrivateBalance, getNotesState, insertLeaf, saveNotesState } from "./note-store";
import type { PrivacyTxResult } from "./privacy.types";

export async function shieldDeposit(userId: string, owner: string, amount: bigint): Promise<PrivacyTxResult> {
  const assetId = requireAssetId();
  const contract = createShieldedPoolContract();
  const state = getNotesState();
  const leafIndex = await contract.getNoteCount(owner);
  const { note, commitment } = createStoredNote(assetId, amount, owner, leafIndex, "deposit");
  const txHash = await contract.shield(owner, amount, commitment, encodeNote(note), (xdr) => walletService.signTransaction(userId, xdr));
  const nextState = {
    notes: [...state.notes, { ...note, creationTxHash: txHash }],
    commitmentLeaves: insertLeaf(state.commitmentLeaves, bytesToHex(commitment), leafIndex),
  };
  await saveNotesState(nextState);
  return {
    txHash,
    proofId: `shield:${txHash.slice(0, 14)}`,
    commitment: bytesToHex(commitment),
    balance: getPrivateBalance(assetId),
  };
}
