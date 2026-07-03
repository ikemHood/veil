import type { Note, EncryptedNote } from "../types.js";
/**
 * Encrypt a note for a recipient.
 *
 * @param note - The note to encrypt
 * @param recipientPubKey - Recipient's X25519 public key (32 bytes)
 * @returns Encrypted note payload
 */
export declare function encryptNote(note: Note, recipientPubKey: Uint8Array): EncryptedNote;
/**
 * Decrypt an encrypted note using the recipient's private key.
 *
 * @param encrypted - The encrypted note payload
 * @param recipientPrivKey - Recipient's X25519 private key (32 bytes)
 * @returns Decrypted note, or null if decryption fails
 */
export declare function decryptNote(encrypted: EncryptedNote, recipientPrivKey: Uint8Array): Note | null;
/**
 * Generate an X25519 keypair for note encryption.
 */
export declare function generateKeypair(): {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
};
/**
 * Derive an X25519 keypair from a Stellar secret key.
 * This allows users to receive encrypted notes using their existing wallet key.
 */
export declare function deriveKeypairFromStellarSecret(stellarSecret: string): {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
};
//# sourceMappingURL=encryption.d.ts.map