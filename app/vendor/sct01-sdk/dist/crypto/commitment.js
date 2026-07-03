// SCT-01 SDK - Commitment & Nullifier Computation
//
// These functions mirror the circuit logic exactly:
//   commitment = Poseidon(asset_id, amount, owner, randomness, nullifier_key)
//   nullifier  = Poseidon(nullifier_key, nullifier_secret)
//
// The Poseidon hash is used for field-native commitments that work
// efficiently in the Circom ZK circuit.
import { poseidonHash, bigintToBytes, bytesToBigint, fieldFromBytes, toField } from "./hash.js";
import { sha256 } from "./hash.js";
import * as StellarSdk from "@stellar/stellar-sdk";
/**
 * Compute a note commitment from a Note.
 *
 * commitment = Poseidon(asset_id, amount, owner, randomness, nullifier_key)
 *
 * This matches the `NoteCommitment` template in `circuits/circom/sct01.circom`.
 */
export function computeCommitment(note) {
    const assetField = addressToField(note.assetId);
    const ownerField = addressToField(note.owner);
    const randomnessField = bytesToField(note.randomness);
    const nullifierKeyField = bytesToField(note.nullifierKey);
    const hash = poseidonHash([
        assetField,
        note.amount,
        ownerField,
        randomnessField,
        nullifierKeyField,
    ]);
    return {
        hash: bigintToBytes(hash),
        noteId: note.id,
    };
}
/**
 * Compute a commitment from raw field inputs (for testing).
 */
export function computeCommitmentFromFields(assetId, amount, owner, randomness, nullifierKey) {
    const hash = poseidonHash([assetId, amount, owner, randomness, nullifierKey]);
    return bigintToBytes(hash);
}
/**
 * Derive a nullifier from a Note.
 *
 * nullifier = Poseidon(nullifier_key, nullifier_secret)
 *
 * This matches the nullifier derivation in the Noir circuits.
 */
export function deriveNullifier(note) {
    const nullifierKeyField = bytesToField(note.nullifierKey);
    const nullifierSecretField = bytesToField(note.nullifierSecret);
    const hash = poseidonHash([nullifierKeyField, nullifierSecretField]);
    return {
        value: bigintToBytes(hash),
        noteId: note.id,
    };
}
/**
 * Derive a nullifier from raw field inputs (for testing).
 */
export function deriveNullifierFromFields(nullifierKey, nullifierSecret) {
    const hash = poseidonHash([nullifierKey, nullifierSecret]);
    return bigintToBytes(hash);
}
/**
 * Compute one Poseidon Merkle parent, matching the wrapper contract.
 */
export function computeTreeRoot(oldRoot, commitment) {
    return bigintToBytes(poseidonHash([bytesToField(oldRoot), bytesToField(commitment)]));
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/**
 * Convert a Stellar address string to a field element.
 * Valid `G...` and `C...` addresses use the same raw 32-byte payload as
 * Soroban `Address::to_payload()`. Non-address strings keep the legacy
 * SHA-256 fallback for tests and offline fixtures.
 */
export function addressToField(address) {
    if (StellarSdk.StrKey.isValidEd25519PublicKey(address)) {
        return bytesToField(new Uint8Array(StellarSdk.StrKey.decodeEd25519PublicKey(address)));
    }
    if (StellarSdk.StrKey.isValidContract(address)) {
        return bytesToField(new Uint8Array(StellarSdk.StrKey.decodeContract(address)));
    }
    const encoder = new TextEncoder();
    const hash = sha256(encoder.encode(address));
    return toField(bytesToBigint(hash));
}
/**
 * Convert a byte array to a field element (big-endian, mod BN254).
 */
function bytesToField(bytes) {
    return fieldFromBytes(bytes);
}
export function computeCommitmentBytes(assetId, amount, owner, randomness, nullifierKey) {
    return bigintToBytes(poseidonHash([
        addressToField(assetId),
        amount,
        addressToField(owner),
        bytesToField(randomness),
        bytesToField(nullifierKey),
    ]));
}
export function deriveNullifierBytes(nullifierKey, nullifierSecret) {
    return bigintToBytes(poseidonHash([bytesToField(nullifierKey), bytesToField(nullifierSecret)]));
}
export function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}
function assertI128(value) {
    if (value < 0n)
        throw new Error("negative i128 not supported");
    if (value >> 127n)
        throw new Error("amount exceeds i128");
}
export function transferBindingHash(root, assetId, nullifier, outputCommitments, encryptedNoteHashes) {
    if (outputCommitments.length !== 2 || encryptedNoteHashes.length !== 2) {
        throw new Error("transfer proof requires exactly two output notes");
    }
    let acc = poseidonHash([2n, bytesToField(root)]);
    acc = poseidonHash([acc, addressToField(assetId)]);
    acc = poseidonHash([acc, bytesToField(nullifier)]);
    acc = poseidonHash([acc, bytesToField(outputCommitments[0])]);
    acc = poseidonHash([acc, bytesToField(outputCommitments[1])]);
    acc = poseidonHash([acc, bytesToField(encryptedNoteHashes[0])]);
    acc = poseidonHash([acc, bytesToField(encryptedNoteHashes[1])]);
    return bigintToBytes(acc);
}
export function unwrapBindingHash(root, assetId, recipient, nullifier, amount) {
    assertI128(amount);
    let acc = poseidonHash([3n, bytesToField(root)]);
    acc = poseidonHash([acc, addressToField(assetId)]);
    acc = poseidonHash([acc, addressToField(recipient)]);
    acc = poseidonHash([acc, bytesToField(nullifier)]);
    acc = poseidonHash([acc, toField(amount)]);
    return bigintToBytes(acc);
}
//# sourceMappingURL=commitment.js.map