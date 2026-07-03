import { bytesToHex, hexToBytes } from "../crypto/hash.js";
import { type BlobStorage, type NoteStorage } from "./types.js";
import type { SerializedNote } from "../types.js";
/**
 * Pre-derived 32-byte key OR the material to derive one lazily. Pick exactly
 * one option; the lazy derivation path reads the salt from the stored envelope.
 */
export interface EncryptionKeyOptions {
    /** Raw 32-byte symmetric key. Takes precedence. */
    key?: Uint8Array;
    /** User passcode; key derived via scrypt using the stored envelope salt. */
    passcode?: string;
    /** App-held secret; key derived via HKDF-style hash with the stored salt. */
    secret?: Uint8Array;
}
/**
 * Generic encrypted JSON storage over a `BlobStorage` backend. Serializes any
 * JSON-able value with `JSON.stringify`, encrypts the UTF-8 bytes, and stores
 * the envelope under a caller-chosen string key.
 *
 * Use this for app-specific state that isn't the SDK's `NoteManager` shape
 * (e.g. a wallet's combined notes + Merkle leaves). For the canonical
 * `SerializedNote[]` shape, prefer `EncryptedNoteStorage`.
 */
export declare class EncryptedJsonStorage<T> {
    private readonly backend;
    private readonly opts;
    constructor(backend: BlobStorage, opts: EncryptionKeyOptions);
    load(key: string): Promise<T | null>;
    save(key: string, value: T): Promise<void>;
    clear(key: string): Promise<void>;
    /**
     * Return the raw stored envelope wrapped in the backup file format. Safe to
     * hand to a file picker or cloud sync. Recovery requires the same key/passcode.
     */
    exportBlob(key: string): Promise<Uint8Array | null>;
    /**
     * Restore an exported backup blob under `key`. The unlock key must match the
     * one used at export time; this method writes the inner envelope verbatim.
     */
    importBlob(key: string, backup: Uint8Array): Promise<void>;
    private deriveKey;
}
/**
 * Note storage specialized for `SerializedNote[]`. Persists the canonical
 * `NoteStoreExport` envelope on disk (with `exportedAt` metadata) so future
 * schema migrations have a version field to branch on, while still accepting
 * legacy bare-array payloads on load.
 */
export declare class EncryptedNoteStorage implements NoteStorage {
    private readonly backend;
    private readonly opts;
    constructor(backend: BlobStorage, opts: EncryptionKeyOptions);
    load(owner: string): Promise<SerializedNote[] | null>;
    save(owner: string, notes: SerializedNote[]): Promise<void>;
    clear(owner: string): Promise<void>;
    /**
     * Export an owner's encrypted blob without re-encrypting it. The returned
     * bytes are safe to hand to a file picker, cloud backup, or another device.
     * Recovery requires the same passcode/secret used to encrypt it.
     */
    exportBlob(owner: string): Promise<Uint8Array | null>;
    /**
     * Import an encrypted backup blob for an owner. Verifies the magic header
     * and writes the inner encrypted envelope to the backend. The unlock key
     * must match whatever was used when the backup was created.
     */
    importBlob(owner: string, backup: Uint8Array): Promise<void>;
    private deriveKey;
}
export declare function buildEnvelope(salt: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array): Uint8Array;
export interface Envelope {
    salt: Uint8Array;
    nonce: Uint8Array;
    ciphertext: Uint8Array;
}
export declare function parseEnvelope(blob: Uint8Array): Envelope;
export declare function encryptBytes(key: Uint8Array, nonce: Uint8Array, data: Uint8Array): Uint8Array;
export declare function decryptBytes(key: Uint8Array, nonce: Uint8Array, ciphertext: Uint8Array): Uint8Array | null;
export declare function wrapBackup(inner: Uint8Array): Uint8Array;
export declare function unwrapBackup(backup: Uint8Array): Uint8Array;
/**
 * Namespace blob keys so multi-tenant backends (e.g. shared IndexedDB across
 * wallet accounts) don't collide.
 */
export declare function ownerKey(owner: string): string;
export { bytesToHex, hexToBytes };
//# sourceMappingURL=encrypted.d.ts.map