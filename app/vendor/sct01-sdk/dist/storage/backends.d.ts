/**
 * In-memory blob storage. Not persistent across reloads. Useful for tests,
// ephemeral sessions, and as a no-op fallback when no platform backend is
 * wired up.
 */
export declare class MemoryBlobStorage {
    private store;
    load(key: string): Promise<Uint8Array | null>;
    save(key: string, data: Uint8Array): Promise<void>;
    clear(key: string): Promise<void>;
    /** Test helper: number of entries currently held. */
    get size(): number;
}
/**
 * IndexedDB-backed blob storage.
 *
 * Stores one opaque record per key in a single object store. This is a
 * deliberately small surface: we only need get/set/delete. The encrypted
 * wrapper (`EncryptedNoteStorage`) handles the cryptographic envelope.
 *
 * Falls back gracefully when IndexedDB is unavailable (private mode, SSR,
 * non-browser runtimes): the constructor throws synchronously so callers can
 * detect the condition and pick a different backend (e.g. memory).
 */
export declare class IndexedDbBlobStorage {
    private readonly dbName;
    private readonly storeName;
    private dbPromise;
    constructor(opts?: {
        dbName?: string;
        storeName?: string;
    });
    load(key: string): Promise<Uint8Array | null>;
    save(key: string, data: Uint8Array): Promise<void>;
    clear(key: string): Promise<void>;
    private open;
}
//# sourceMappingURL=backends.d.ts.map