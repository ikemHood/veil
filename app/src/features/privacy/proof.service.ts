import {
  addressToField,
  bigintToBytes,
  bytesToHex,
  fieldFromBytes,
  hexToBytes,
  poseidonHash,
  sha256,
  toField,
  transferBindingHash,
  unwrapBindingHash,
  type Groth16Proof,
} from "@sct01/sdk";
import { allowLocalPrivacyFallback, hasContractConfig } from "../contracts/soroban.client";
import { deriveNullifierBytes, encodeNote } from "./note-store";
import type { StoredNote } from "./privacy.types";

const treeDepth = 20;

type SnarkJsProof = {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
};

type ProofPack = {
  proof: SnarkJsProof;
  publicSignals: string[];
};

type MerklePath = {
  pathElements: string[];
  pathIndices: string[];
  root: Uint8Array;
};

declare global {
  interface Window {
    snarkjs?: {
      groth16: {
        fullProve: (
          input: Record<string, unknown>,
          wasmPath: string,
          zkeyPath: string,
        ) => Promise<{ proof: SnarkJsProof; publicSignals: string[] }>;
      };
    };
  }
}

export type TransferProofInput = {
  assetId: string;
  root: Uint8Array;
  source: StoredNote;
  leaves: string[];
  nullifier: Uint8Array;
  outputAmount: bigint;
  outputOwner: string;
  outputRandomness: Uint8Array;
  outputNullifierKey: Uint8Array;
  outputCommitment: Uint8Array;
  changeAmount: bigint;
  changeOwner: string;
  changeRandomness: Uint8Array;
  changeNullifierKey: Uint8Array;
  changeCommitment: Uint8Array;
  encryptedNoteHashes: Uint8Array[];
};

export type WithdrawProofInput = {
  assetId: string;
  root: Uint8Array;
  source: StoredNote;
  leaves: string[];
  nullifier: Uint8Array;
  destination: string;
  amount: bigint;
};

export function getEncryptedNoteHash(note: StoredNote) {
  return sha256(encodeNote(note));
}

export function getNullifier(note: StoredNote) {
  return deriveNullifierBytes(note);
}

export function transferBinding(input: TransferProofInput) {
  return transferBindingHash(input.root, input.assetId, input.nullifier, [input.outputCommitment, input.changeCommitment], input.encryptedNoteHashes);
}

export function withdrawBinding(input: WithdrawProofInput) {
  return unwrapBindingHash(input.root, input.assetId, input.destination, input.nullifier, input.amount);
}

export async function prepareTransferProof(input: TransferProofInput): Promise<Groth16Proof> {
  const bindingHash = transferBinding(input);
  if (!hasContractConfig()) {
    if (allowLocalPrivacyFallback()) return localProof(bindingHash);
    throw new Error("Missing cstellar contract configuration");
  }
  const merklePath = buildMerklePath(input.leaves, input.source.leafIndex ?? -1);
  if (bytesToHex(merklePath.root) !== bytesToHex(input.root)) throw new Error("Local Merkle path root does not match pool root");
  const pack = await prove({
    action: "2",
    binding: signal(bindingHash),
    asset: addressToField(input.assetId).toString(),
    merkleRoot: signal(input.root),
    nullifier: signal(input.nullifier),
    pathElements: merklePath.pathElements,
    pathIndices: merklePath.pathIndices,
    ...noteFieldInputs(input.source),
    outAmount: field(input.outputAmount),
    outOwner: addressToField(input.outputOwner).toString(),
    outRandomness: signal(input.outputRandomness),
    outNullifierKey: signal(input.outputNullifierKey),
    outputCommitment: signal(input.outputCommitment),
    changeAmount: field(input.changeAmount),
    changeOwner: addressToField(input.changeOwner).toString(),
    changeRandomness: signal(input.changeRandomness),
    changeNullifierKey: signal(input.changeNullifierKey),
    changeCommitment: signal(input.changeCommitment),
    encryptedNoteHash0: signal(input.encryptedNoteHashes[0]),
    encryptedNoteHash1: signal(input.encryptedNoteHashes[1]),
    recipient: "0",
    unwrapAmount: "0",
  });
  assertPublicSignals(pack, 2, bindingHash);
  return proofPackToGroth16Proof(pack);
}

export async function prepareWithdrawProof(input: WithdrawProofInput): Promise<Groth16Proof> {
  const bindingHash = withdrawBinding(input);
  if (!hasContractConfig()) {
    if (allowLocalPrivacyFallback()) return localProof(bindingHash);
    throw new Error("Missing cstellar contract configuration");
  }
  const merklePath = buildMerklePath(input.leaves, input.source.leafIndex ?? -1);
  if (bytesToHex(merklePath.root) !== bytesToHex(input.root)) throw new Error("Local Merkle path root does not match pool root");
  const pack = await prove({
    action: "3",
    binding: signal(bindingHash),
    asset: addressToField(input.assetId).toString(),
    merkleRoot: signal(input.root),
    nullifier: signal(input.nullifier),
    pathElements: merklePath.pathElements,
    pathIndices: merklePath.pathIndices,
    ...noteFieldInputs(input.source),
    outAmount: "0",
    outOwner: "0",
    outRandomness: "0",
    outNullifierKey: "0",
    outputCommitment: "0",
    changeAmount: "0",
    changeOwner: "0",
    changeRandomness: "0",
    changeNullifierKey: "0",
    changeCommitment: "0",
    encryptedNoteHash0: "0",
    encryptedNoteHash1: "0",
    recipient: addressToField(input.destination).toString(),
    unwrapAmount: field(input.amount),
  });
  assertPublicSignals(pack, 3, bindingHash);
  return proofPackToGroth16Proof(pack);
}

function localProof(seed: Uint8Array): Groth16Proof {
  const b = new Uint8Array(64);
  b.set(seed.slice(0, 32));
  b.set(seed.slice(0, 32), 32);
  return {
    a: seed.slice(0, 32),
    b,
    c: seed.slice(0, 32),
  };
}

function decimalToBytes32(value: string): Uint8Array {
  const n = BigInt(value);
  const hex = n.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function proofPackToGroth16Proof(pack: ProofPack): Groth16Proof {
  const [g2x, g2y] = pack.proof.pi_b;
  return {
    a: concatBytes([decimalToBytes32(pack.proof.pi_a[0]), decimalToBytes32(pack.proof.pi_a[1])]),
    b: concatBytes([decimalToBytes32(g2x[1]), decimalToBytes32(g2x[0]), decimalToBytes32(g2y[1]), decimalToBytes32(g2y[0])]),
    c: concatBytes([decimalToBytes32(pack.proof.pi_c[0]), decimalToBytes32(pack.proof.pi_c[1])]),
  };
}

function signal(bytes: Uint8Array): string {
  return fieldFromBytes(bytes).toString();
}

function field(n: bigint | number | string): string {
  return toField(BigInt(n)).toString();
}

function noteFieldInputs(note: StoredNote) {
  return {
    noteAmount: field(note.amount),
    noteOwner: addressToField(note.owner).toString(),
    noteRandomness: signal(hexToBytes(note.randomness)),
    noteNullifierKey: signal(hexToBytes(note.nullifierKey)),
    nullifierSecret: signal(hexToBytes(note.nullifierSecret)),
  };
}

function zeroes(depth: number): bigint[] {
  const z = [0n];
  for (let i = 0; i < depth; i += 1) z.push(poseidonHash([z[i], z[i]]));
  return z;
}

function buildMerklePath(commitmentLeaves: string[], leafIndex: number, depth = treeDepth): MerklePath {
  if (leafIndex < 0 || leafIndex >= commitmentLeaves.length) throw new Error("Note leaf index missing from local tree");
  const zeros = zeroes(depth);
  let level = commitmentLeaves.map((leaf) => (leaf ? fieldFromBytes(hexToBytes(leaf)) : zeros[0]));
  const pathElements: string[] = [];
  const pathIndices: string[] = [];
  let index = leafIndex;

  for (let d = 0; d < depth; d += 1) {
    const siblingIndex = index ^ 1;
    const sibling = siblingIndex < level.length && level[siblingIndex] !== undefined ? level[siblingIndex] : zeros[d];
    pathElements.push(sibling.toString());
    pathIndices.push((index & 1).toString());
    const next: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i] ?? zeros[d];
      const right = i + 1 < level.length && level[i + 1] !== undefined ? level[i + 1] : zeros[d];
      next.push(poseidonHash([left, right]));
    }
    level = next.length > 0 ? next : [zeros[d + 1]];
    index = Math.floor(index / 2);
  }

  return {
    pathElements,
    pathIndices,
    root: bigintToBytes(level[0] ?? zeros[depth]),
  };
}

async function loadSnarkjs(): Promise<NonNullable<Window["snarkjs"]>> {
  if (window.snarkjs) return window.snarkjs;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/snarkjs.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load proof runtime"));
    document.head.appendChild(script);
  });
  if (!window.snarkjs) throw new Error("Proof runtime was not initialized");
  return window.snarkjs;
}

async function prove(input: Record<string, unknown>): Promise<ProofPack> {
  const snarkjs = await loadSnarkjs();
  const result = await snarkjs.groth16.fullProve(input, "/circuits/sct01.wasm", "/circuits/sct01_final.zkey");
  return {
    proof: result.proof,
    publicSignals: result.publicSignals.map(String),
  };
}

function assertPublicSignals(pack: ProofPack, action: number, bindingHash: Uint8Array) {
  if (pack.publicSignals[0] !== action.toString()) throw new Error("Proof action public signal does not match operation");
  if (pack.publicSignals[1] !== signal(bindingHash)) throw new Error("Proof binding public signal does not match operation");
}
