import { bigintToBytes, bytesToHex, fieldFromBytes, hexToBytes, poseidonHash } from "@sct01/sdk";
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
  const missingLeafIndex = firstMissingLeafIndex(merged, currentCount);
  if (missingLeafIndex !== null) {
    throw new Error(
      `Commitment tree sync incomplete at leaf ${missingLeafIndex}. Synced ${countKnownLeaves(merged, currentCount)} of ${currentCount} leaves. Use a fresh wrapper contract or an RPC endpoint with full wrapper event history.`,
    );
  }
  const syncedRoot = computeMerkleRoot(merged.slice(0, currentCount));
  if (bytesToHex(syncedRoot) !== bytesToHex(currentRoot)) {
    throw new Error(
      `Commitment tree root mismatch after sync. Synced ${currentCount} leaves, but RPC events do not match pool root. Use a fresh wrapper contract or an RPC endpoint with complete wrapper event history.`,
    );
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

function firstMissingLeafIndex(leaves: string[], count: number) {
  for (let index = 0; index < count; index += 1) {
    if (!leaves[index]) return index;
  }
  return null;
}

function countKnownLeaves(leaves: string[], count: number) {
  let known = 0;
  for (let index = 0; index < count; index += 1) {
    if (leaves[index]) known += 1;
  }
  return known;
}

function computeMerkleRoot(leaves: string[], depth = 20) {
  const zeros = zeroes(depth);
  let level = leaves.length > 0 ? leaves.map((leaf) => fieldFromBytes(hexToBytes(leaf))) : [zeros[0]];

  for (let d = 0; d < depth; d += 1) {
    const next: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i] ?? zeros[d];
      const right = i + 1 < level.length ? (level[i + 1] ?? zeros[d]) : zeros[d];
      next.push(poseidonHash([left, right]));
    }
    level = next.length > 0 ? next : [zeros[d + 1]];
  }

  return bigintToBytes(level[0] ?? zeros[depth]);
}

function zeroes(depth: number) {
  const z = [0n];
  for (let i = 0; i < depth; i += 1) z.push(poseidonHash([z[i], z[i]]));
  return z;
}
