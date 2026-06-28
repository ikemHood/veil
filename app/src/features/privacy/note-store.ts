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
import { getLegacyLocalAssetId, requireAssetId } from "../contracts/soroban.client";
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

function vaultKey(owner: string) {
  return `veil:notes:${requireAssetId()}:${owner}`;
}

function legacyVaultKey(owner: string) {
  return `veil:notes:${getLegacyLocalAssetId()}:${owner}`;
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
  const legacyKey = legacyVaultKey(owner);
  if (!state && legacyKey !== key) {
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
  vault = { status: "unlocked", owner, storage, state };
  emitNotesChanged();
  return state;
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
