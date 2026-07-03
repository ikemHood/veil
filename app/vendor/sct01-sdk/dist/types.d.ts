/** A confidential note representing private spendable value. */
export interface Note {
    /** Unique note ID (local) */
    id: string;
    /** Asset identifier (SAC address) */
    assetId: string;
    /** Note amount (in stroops / smallest unit) */
    amount: bigint;
    /** Owner's public key (Stellar address) */
    owner: string;
    /** Randomness for commitment blinding */
    randomness: Uint8Array;
    /** Secret key for nullifier derivation */
    nullifierKey: Uint8Array;
    /** Secret for nullifier computation */
    nullifierSecret: Uint8Array;
    /** Optional memo */
    memo?: string;
    /** Whether this note has been spent */
    spent: boolean;
    /** Transaction hash where this note was created */
    creationTxHash?: string;
    /** Timestamp of creation */
    createdAt: number;
}
/** A note commitment (hash of note data, stored on-chain). */
export interface NoteCommitment {
    /** The 32-byte commitment hash */
    hash: Uint8Array;
    /** The note ID this commitment corresponds to */
    noteId: string;
}
/** A nullifier (unique per-note spend guard). */
export interface Nullifier {
    /** The 32-byte nullifier value */
    value: Uint8Array;
    /** The note ID this nullifier was derived from */
    noteId: string;
}
/** Encrypted note payload for sharing with recipients. */
export interface EncryptedNote {
    /** Encrypted note data */
    ciphertext: Uint8Array;
    /** Ephemeral public key for ECDH */
    ephemeralPubKey: Uint8Array;
    /** Nonce used for encryption */
    nonce: Uint8Array;
    /** Note commitment hash */
    commitment: Uint8Array;
}
/** Transfer public inputs (visible on-chain). */
export interface TransferPublicInputs {
    merkleRoot: Uint8Array;
    assetId: string;
    outputCommitments: Uint8Array[];
    encryptedNoteHashes: Uint8Array[];
}
/** Unwrap public inputs (visible on-chain). */
export interface UnwrapPublicInputs {
    merkleRoot: Uint8Array;
    assetId: string;
    recipient: string;
    amount: bigint;
}
/** ZK proof bytes. */
export interface Proof {
    /** Raw proof bytes */
    data: Uint8Array;
    /** Action type tag */
    actionType: ActionType;
}
/** Action types for domain separation. */
export declare enum ActionType {
    Wrap = 1,
    Transfer = 2,
    Unwrap = 3
}
/** Confidential token metadata. */
export interface ConfidentialTokenMetadata {
    name: string;
    symbol: string;
    decimals: number;
    underlyingAsset: string;
    version: number;
    circuitVersion: number;
    verifier: string;
    privacyModel: string;
}
/** Network configuration. */
export interface NetworkConfig {
    rpcUrl: string;
    horizonUrl: string;
    networkPassphrase: string;
    wrapperContractId: string;
    verifierContractId: string;
}
/** Note storage export format (for backup/restore). */
export interface NoteStoreExport {
    version: number;
    exportedAt: number;
    notes: SerializedNote[];
}
/** Serialized note for storage. */
export interface SerializedNote {
    id: string;
    assetId: string;
    amount: string;
    owner: string;
    randomness: string;
    nullifierKey: string;
    nullifierSecret: string;
    memo?: string;
    spent: boolean;
    creationTxHash?: string;
    createdAt: number;
}
//# sourceMappingURL=types.d.ts.map