import {
  EncryptedJsonStorage,
  IndexedDbBlobStorage,
  addressToField,
  bigintToBytes,
  bytesToHex,
  fieldFromBytes,
  hexToBytes,
  poseidonHash,
  randomBytes,
} from "@sct01/sdk";
import { getLegacyLocalAssetId, requireAssetId, stellarConfig } from "../contracts/soroban.client";
import type { NotesStateBlob, StoredNote } from "./privacy.types";

type Vault =
  | { status: "locked" }
  | {
      status: "unlocked";
      owner: string;
      storage: EncryptedJsonStorage<NotesStateBlob>;
      state: NotesStateBlob;
    };

let vault: Vault = { status: "locked" };
const notesChangedEvent = "veil:notes-changed";
const mistakenDemoSeedPrefix = "veil.demo-private-balance.";
const mistakenDemoAmount = "2000000000";

function vaultKey(owner: string) {
  return `veil:notes:${stellarConfig.wrapperContractId || "local"}:${requireAssetId()}:${owner}`;
}

function legacyVaultKey(owner: string) {
  return `veil:notes:${getLegacyLocalAssetId()}:${owner}`;
}

function legacyAssetVaultKey(owner: string) {
  return `veil:notes:${requireAssetId()}:${owner}`;
}

function mistakenDemoSeedKey(owner: string) {
  return `${mistakenDemoSeedPrefix}${stellarConfig.wrapperContractId || "local"}:${requireAssetId()}:${owner}`;
}

function emitNotesChanged() {
  window.dispatchEvent(new Event(notesChangedEvent));
}

export function subscribeNotesChanged(listener: () => void) {
  window.addEventListener(notesChangedEvent, listener);
  return () => window.removeEventListener(notesChangedEvent, listener);
}

export async function unlockPrivateNotes(owner: string, pin: string) {
  const storage = new EncryptedJsonStorage<NotesStateBlob>(
    new IndexedDbBlobStorage({ dbName: "veil-private-vault", storeName: "notes" }),
    { passcode: pin },
  );
  const key = vaultKey(owner);
  let state = await storage.load(key);
  const legacyAssetKey = legacyAssetVaultKey(owner);
  if (legacyAssetKey !== key) {
    const legacyAssetState = await storage.load(legacyAssetKey);
    if (legacyAssetState) {
      state = mergeState(state, legacyAssetState);
      await storage.save(key, state);
    }
  }
  const legacyKey = legacyVaultKey(owner);
  if (!state && !stellarConfig.wrapperContractId && legacyKey !== key) {
    const legacyState = await storage.load(legacyKey);
    if (legacyState) {
      state = legacyState;
      await storage.save(key, legacyState);
    }
  }
  state ??= {
    notes: [],
    commitmentLeaves: [],
  };
  state = removeMistakenDemoSeed(owner, state);
  await storage.save(key, state);
  vault = { status: "unlocked", owner, storage, state };
  emitNotesChanged();
  return state;
}

function mergeState(current: NotesStateBlob | null, incoming: NotesStateBlob): NotesStateBlob {
  if (!current) return incoming;
  const commitments = new Set(current.notes.map((note) => note.commitment));
  const notes = [...current.notes];
  for (const note of incoming.notes) {
    if (!commitments.has(note.commitment)) notes.push(note);
  }
  const commitmentLeaves = [...current.commitmentLeaves];
  incoming.commitmentLeaves.forEach((leaf, index) => {
    if (leaf && !commitmentLeaves[index]) commitmentLeaves[index] = leaf;
  });
  return { notes, commitmentLeaves };
}

function removeMistakenDemoSeed(owner: string, state: NotesStateBlob): NotesStateBlob {
  const seedAt = window.localStorage.getItem(mistakenDemoSeedKey(owner));
  if (!seedAt) return state;
  const seedTime = Date.parse(seedAt);
  if (!Number.isFinite(seedTime)) return state;
  const notes = state.notes.filter((note) => {
    const fromMistakenSeed =
      note.amount === mistakenDemoAmount &&
      note.memo === "deposit" &&
      Math.abs(seedTime - note.createdAt) < 60 * 60 * 1000;
    return !fromMistakenSeed;
  });
  window.localStorage.removeItem(mistakenDemoSeedKey(owner));
  return { ...state, notes };
}

export async function saveNotesState(state: NotesStateBlob) {
  if (vault.status !== "unlocked") return;
  vault.state = state;
  await vault.storage.save(vaultKey(vault.owner), state);
  emitNotesChanged();
}

export function getNotesState(): NotesStateBlob {
  if (vault.status !== "unlocked") {
    return { notes: [], commitmentLeaves: [] };
  }
  return vault.state;
}

export function getPrivateBalance(assetId = requireAssetId()) {
  return getNotesState().notes.reduce((sum, note) => {
    if (note.spent || note.assetId !== assetId) return sum;
    return sum + BigInt(note.amount);
  }, 0n);
}

export async function mergeNotesState(notes: StoredNote[], leaves: string[] = []) {
  const state = getNotesState();
  const existingCommitments = new Set(state.notes.map((note) => note.commitment));
  const nextNotes = [...state.notes];
  let nextLeaves = [...state.commitmentLeaves];

  for (const note of notes) {
    if (!existingCommitments.has(note.commitment)) {
      nextNotes.push(note);
      existingCommitments.add(note.commitment);
    }
    if (note.leafIndex !== undefined) nextLeaves = insertLeaf(nextLeaves, note.commitment, note.leafIndex);
  }
  for (const leaf of leaves) {
    if (!leaf) continue;
    const index = nextLeaves.findIndex((item) => item === leaf);
    if (index === -1) nextLeaves.push(leaf);
  }

  await saveNotesState({ notes: nextNotes, commitmentLeaves: nextLeaves });
}

export function createStoredNote(assetId: string, amount: bigint, owner: string, leafIndex: number, memo: string) {
  const note: StoredNote = {
    id: `note_${Date.now()}_${bytesToHex(randomBytes(4))}`,
    assetId,
    amount: amount.toString(),
    owner,
    randomness: bytesToHex(randomBytes(32)),
    nullifierKey: bytesToHex(randomBytes(32)),
    nullifierSecret: bytesToHex(randomBytes(32)),
    commitment: "",
    leafIndex,
    memo,
    spent: false,
    createdAt: Date.now(),
  };
  const commitment = computeCommitmentBytes(note);
  note.commitment = bytesToHex(commitment);
  return { note, commitment };
}

export function encodeNote(note: StoredNote) {
  return new TextEncoder().encode(JSON.stringify(note));
}

export function insertLeaf(leaves: string[], commitment: string, index: number) {
  const next = [...leaves];
  next[index] = commitment;
  return next;
}

export function selectSpendableNote(notes: StoredNote[], assetId: string, amount: bigint) {
  const note = notes
    .filter((item) => !item.spent && item.assetId === assetId && BigInt(item.amount) >= amount)
    .sort((a, b) => Number(BigInt(a.amount) - BigInt(b.amount)))[0];
  if (!note) throw new Error("Insufficient private balance");
  return note;
}

export function findExactNote(notes: StoredNote[], assetId: string, amount: bigint) {
  return notes.find((item) => !item.spent && item.assetId === assetId && BigInt(item.amount) === amount);
}

export function computeCommitmentBytes(note: StoredNote) {
  return bigintToBytes(
    poseidonHash([
      addressToField(note.assetId),
      BigInt(note.amount),
      addressToField(note.owner),
      fieldFromBytes(hexToBytes(note.randomness)),
      fieldFromBytes(hexToBytes(note.nullifierKey)),
    ]),
  );
}

export function deriveNullifierBytes(note: StoredNote) {
  return bigintToBytes(
    poseidonHash([fieldFromBytes(hexToBytes(note.nullifierKey)), fieldFromBytes(hexToBytes(note.nullifierSecret))]),
  );
}
