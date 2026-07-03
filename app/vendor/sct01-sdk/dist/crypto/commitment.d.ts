import type { Note, NoteCommitment, Nullifier } from "../types.js";
/**
 * Compute a note commitment from a Note.
 *
 * commitment = Poseidon(asset_id, amount, owner, randomness, nullifier_key)
 *
 * This matches the `NoteCommitment` template in `circuits/circom/sct01.circom`.
 */
export declare function computeCommitment(note: Note): NoteCommitment;
/**
 * Compute a commitment from raw field inputs (for testing).
 */
export declare function computeCommitmentFromFields(assetId: bigint, amount: bigint, owner: bigint, randomness: bigint, nullifierKey: bigint): Uint8Array;
/**
 * Derive a nullifier from a Note.
 *
 * nullifier = Poseidon(nullifier_key, nullifier_secret)
 *
 * This matches the nullifier derivation in the Noir circuits.
 */
export declare function deriveNullifier(note: Note): Nullifier;
/**
 * Derive a nullifier from raw field inputs (for testing).
 */
export declare function deriveNullifierFromFields(nullifierKey: bigint, nullifierSecret: bigint): Uint8Array;
/**
 * Compute one Poseidon Merkle parent, matching the wrapper contract.
 */
export declare function computeTreeRoot(oldRoot: Uint8Array, commitment: Uint8Array): Uint8Array;
/**
 * Convert a Stellar address string to a field element.
 * Valid `G...` and `C...` addresses use the same raw 32-byte payload as
 * Soroban `Address::to_payload()`. Non-address strings keep the legacy
 * SHA-256 fallback for tests and offline fixtures.
 */
export declare function addressToField(address: string): bigint;
export declare function computeCommitmentBytes(assetId: string, amount: bigint, owner: string, randomness: Uint8Array, nullifierKey: Uint8Array): Uint8Array;
export declare function deriveNullifierBytes(nullifierKey: Uint8Array, nullifierSecret: Uint8Array): Uint8Array;
export declare function concatBytes(parts: Uint8Array[]): Uint8Array;
export declare function transferBindingHash(root: Uint8Array, assetId: string, nullifier: Uint8Array, outputCommitments: Uint8Array[], encryptedNoteHashes: Uint8Array[]): Uint8Array;
export declare function unwrapBindingHash(root: Uint8Array, assetId: string, recipient: string, nullifier: Uint8Array, amount: bigint): Uint8Array;
//# sourceMappingURL=commitment.d.ts.map