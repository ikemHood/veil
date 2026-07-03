import type { NoteStorage } from "../storage/types.js";
import type { Note, NoteCommitment, Nullifier, SerializedNote, NoteStoreExport } from "../types.js";
export interface NoteManagerOptions {
    /**
     * Optional persistent backend. If provided, the manager autoloads notes on
     * `init()` and writes through on every mutating call. Pass a
     * `EncryptedNoteStorage` over a `BlobStorage` so spend secrets never hit
     * disk in plaintext.
     */
    storage?: NoteStorage;
    /** Skip the initial load on `init()`. Defaults to `false`. */
    skipAutoload?: boolean;
}
/**
 * Note Manager - handles creation, storage, and lifecycle of confidential notes.
 *
 * Notes are held in-memory and (optionally) mirrored to a `NoteStorage` so
 * spend secrets survive reloads. Storage MUST be encrypted at rest: notes
 * contain `nullifierKey`, `nullifierSecret`, and `randomness`; losing any of
 * them means losing funds, and leaking them means theft.
 *
 * Call `init()` after construction to hydrate from storage, then use the
 * mutating API as usual; every mutation is persisted through the configured
 * backend.
 */
export declare class NoteManager {
    private notes;
    private readonly owner;
    private readonly storage?;
    private loaded;
    constructor(owner: string, options?: NoteManagerOptions);
    /**
     * Load notes from the configured storage. Safe to call multiple times;
     * subsequent calls re-read from storage (useful after an import).
     */
    init(): Promise<void>;
    /**
     * Force-persist the current in-memory state. Useful after bulk mutations
     * bypass the per-call write-through, or to flush pending writes.
     */
    persist(): Promise<void>;
    private writeThrough;
    private serializeAll;
    /** Whether `init()` has populated state from storage at least once. */
    get isLoaded(): boolean;
    /**
     * Create a new note for wrapping (deposit).
     */
    createNote(assetId: string, amount: bigint, memo?: string): {
        note: Note;
        commitment: NoteCommitment;
    };
    /**
     * Create a change note (for transfer/unwrap change output).
     */
    createChangeNote(assetId: string, amount: bigint): {
        note: Note;
        commitment: NoteCommitment;
    };
    /**
     * Create an output note for a recipient.
     */
    createOutputNote(assetId: string, amount: bigint, recipientAddress: string): {
        note: Note;
        commitment: NoteCommitment;
    };
    /**
     * Add a received note (decrypted from an encrypted payload).
     */
    addReceivedNote(note: Note): void;
    /**
     * Mark a note as spent.
     */
    markSpent(noteId: string, txHash?: string): void;
    /**
     * Remove all notes from memory and (if persistence is configured) clear the
     * stored blob. Use `noremove`-style backup before calling this if you need
     * to retain spend secrets.
     */
    clear(): Promise<void>;
    /**
     * Get all unspent notes for a specific asset.
     */
    getUnspentNotes(assetId: string): Note[];
    /**
     * Get total unspent balance for a specific asset.
     */
    getBalance(assetId: string): bigint;
    /**
     * Select notes to cover a target amount (simple greedy algorithm).
     * Returns selected notes and the total amount they cover.
     */
    selectNotes(assetId: string, targetAmount: bigint): {
        notes: Note[];
        total: bigint;
    };
    /**
     * Get all notes (for display/debugging).
     */
    getAllNotes(): Note[];
    /**
     * Get a specific note by ID.
     */
    getNote(noteId: string): Note | undefined;
    /**
     * Derive nullifiers for a set of notes.
     */
    deriveNullifiers(notes: Note[]): Nullifier[];
    /**
     * Export all notes for backup.
     */
    exportNotes(): NoteStoreExport;
    /**
     * Import notes from a backup. Imported notes overwrite any existing entry
     * with the same id. Returns the number of notes added.
     */
    importNotes(data: NoteStoreExport): number;
    /**
     * Get the number of stored notes.
     */
    get count(): number;
}
/** Convert an in-memory `Note` to its serializable representation. */
export declare function serializeNote(note: Note): SerializedNote;
/** Convert a `SerializedNote` (from storage or import) to a `Note`. */
export declare function deserializeStored(s: SerializedNote): Note;
//# sourceMappingURL=manager.d.ts.map