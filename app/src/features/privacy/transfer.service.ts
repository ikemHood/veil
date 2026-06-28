import { bytesToHex, hexToBytes } from "@sct01/sdk";
import { createShieldedPoolContract } from "../contracts/shielded-pool.contract";
import { requireAssetId } from "../contracts/soroban.client";
import { walletService } from "../wallet/wallet.service";
import {
  createStoredNote,
  encodeNote,
  getPrivateBalance,
  getNotesState,
  insertLeaf,
  saveNotesState,
  selectSpendableNote,
} from "./note-store";
import { getEncryptedNoteHash, getNullifier, prepareTransferProof } from "./proof.service";
import type { PrivacyTxResult } from "./privacy.types";

export async function preparePrivateTransfer(userId: string, owner: string, amount: bigint, recipientAddress: string) {
  const assetId = requireAssetId();
  const contract = createShieldedPoolContract();
  const state = getNotesState();
  const source = selectSpendableNote(state.notes, assetId, amount);
  const total = BigInt(source.amount);
  const changeAmount = total - amount;
  const outputLeafIndex = await contract.getNoteCount(owner);
  const output = createStoredNote(assetId, amount, recipientAddress, outputLeafIndex, "send");
  const change = createStoredNote(assetId, changeAmount, owner, outputLeafIndex + 1, "change");
  const root = await contract.getRoot(owner);
  const nullifier = getNullifier(source);
  const encryptedNotes = [encodeNote(output.note), encodeNote(change.note)];
  const encryptedNoteHashes = [getEncryptedNoteHash(output.note), getEncryptedNoteHash(change.note)];
  const proof = await prepareTransferProof({
    assetId,
    root,
    source,
    leaves: state.commitmentLeaves,
    nullifier,
    outputAmount: amount,
    outputOwner: recipientAddress,
    outputRandomness: hexToBytes(output.note.randomness),
    outputNullifierKey: hexToBytes(output.note.nullifierKey),
    outputCommitment: output.commitment,
    changeAmount,
    changeOwner: owner,
    changeRandomness: hexToBytes(change.note.randomness),
    changeNullifierKey: hexToBytes(change.note.nullifierKey),
    changeCommitment: change.commitment,
    encryptedNoteHashes,
  });
  return { assetId, change, changeAmount, encryptedNotes, nullifier, output, proof, root, source, state, userId };
}

export async function submitPrivateTransfer(
  prepared: Awaited<ReturnType<typeof preparePrivateTransfer>>,
  owner: string,
  recipientAddress: string,
): Promise<PrivacyTxResult> {
  const contract = createShieldedPoolContract();
  const commitments = [prepared.output.commitment, prepared.change.commitment];
  const txHash = await contract.transfer(
    owner,
    prepared.proof,
    prepared.root,
    prepared.assetId,
    [prepared.nullifier],
    commitments,
    prepared.encryptedNotes,
    (xdr) => walletService.signTransaction(prepared.userId, xdr),
  );
  const notes = prepared.state.notes.map((note) =>
    note.id === prepared.source.id ? { ...note, spent: true, creationTxHash: txHash } : note,
  );
  if (recipientAddress === owner) notes.push({ ...prepared.output.note, creationTxHash: txHash });
  if (prepared.changeAmount > 0n) notes.push({ ...prepared.change.note, creationTxHash: txHash });
  await saveNotesState({
    notes,
    commitmentLeaves: insertLeaf(
      insertLeaf(prepared.state.commitmentLeaves, bytesToHex(prepared.output.commitment), prepared.output.note.leafIndex ?? 0),
      bytesToHex(prepared.change.commitment),
      prepared.change.note.leafIndex ?? 0,
    ),
  });
  return {
    txHash,
    proofId: `transfer:${txHash.slice(0, 14)}`,
    nullifier: bytesToHex(prepared.nullifier),
    commitment: bytesToHex(prepared.output.commitment),
    balance: getPrivateBalance(prepared.assetId),
  };
}
