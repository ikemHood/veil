import { bytesToHex } from "@sct01/sdk";
import type { ShieldedPoolContract } from "../contracts/contract.types";
import type { NotesStateBlob } from "./privacy.types";

export async function syncCommitmentLeaves(contract: ShieldedPoolContract, owner: string, state: NotesStateBlob) {
  const syncedLeaves = contract.getCommitmentLeaves ? await contract.getCommitmentLeaves(owner) : [];
  const merged = [...syncedLeaves];

  for (const note of state.notes) {
    if (note.leafIndex === undefined) continue;
    merged[note.leafIndex] = note.commitment;
  }

  const currentRoot = await contract.getRoot(owner);
  const currentCount = await contract.getNoteCount(owner);
  const incompleteTree = merged.length < currentCount || merged.slice(0, currentCount).some((leaf) => !leaf);
  if (incompleteTree) {
    throw new Error("Commitment tree sync incomplete. Set VITE_WRAPPER_START_LEDGER to the wrapper deployment ledger.");
  }

  return {
    state: {
      ...state,
      commitmentLeaves: merged,
    },
    root: currentRoot,
    rootHex: bytesToHex(currentRoot),
  };
}
