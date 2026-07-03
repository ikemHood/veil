import type { SerializedNote } from "../types.js";
/**
 * Opaque bytes storage (one blob per key). Backends implement this; the SDK
 * provides an encrypted wrapper on top.
 *
 * Keys are arbitrary strings (e.g. an owner Stellar address). Implementations
 * must isolate entries by key.
 */
export interface BlobStorage {
    load(key: string): Promise<Uint8Array | null>;
    save(key: string, data: Uint8Array): Promise<void>;
    clear(key: string): Promise<void>;
}
/**
 * High-level note storage. Operates on plaintext `SerializedNote[]` at the
 * SDK layer; implementations are responsible for encrypting before hitting the
 * underlying blob store.
 */
export interface NoteStorage {
    load(owner: string): Promise<SerializedNote[] | null>;
    save(owner: string, notes: SerializedNote[]): Promise<void>;
    clear(owner: string): Promise<void>;
}
/**
 * Constants for the encrypted backup blob format.
 */
export declare const BACKUP_MAGIC: Uint8Array<ArrayBuffer>;
/** Current backup blob version. */
export declare const BACKUP_VERSION = 1;
//# sourceMappingURL=types.d.ts.map