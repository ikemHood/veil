// SCT-01 SDK - Note Storage Interfaces
//
// Pluggable persistence for confidential notes. The SDK stays runtime-agnostic:
// wallets and dApps inject a `NoteStorage` implementation that matches their
// platform (IndexedDB on web, SQLite/Keystore on mobile, a cloud sync adapter
// for cross-device backup).
//
// Notes contain spend secrets (`nullifierKey`, `nullifierSecret`,
// `randomness`). Losing them means losing funds, and leaking them means theft.
// Storage therefore MUST be encrypted at rest. Use `EncryptedNoteStorage`
// over a `BlobStorage` backend; never persist plaintext to disk.
/**
 * Constants for the encrypted backup blob format.
 */
export const BACKUP_MAGIC = new Uint8Array([
    0x53, 0x43, 0x54, 0x30, 0x31, 0x42, 0x4b, 0x31, // "SCT01BK1"
]);
/** Current backup blob version. */
export const BACKUP_VERSION = 1;
//# sourceMappingURL=types.js.map