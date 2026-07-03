import { sha256 } from "@noble/hashes/sha256";
import { randomBytes as nobleRandom } from "@noble/hashes/utils";
/** Length of the symmetric encryption key (XChaCha20-Poly1305). */
export declare const ENCRYPTION_KEY_BYTES = 32;
/** Length of the random salt used by KDFs. */
export declare const SALT_BYTES = 16;
/**
 * scrypt parameters for passcode-based key derivation.
 *
 * N=16384, r=8, p=1 is a pragmatic demo setting (~50-150ms on a modern laptop).
 * Production wallets that handle real funds should bump N to 2^17+ or switch
 * to Argon2id with memory-hard settings.
 */
export declare const SCRYPT_PARAMS: {
    readonly N: 16384;
    readonly r: 8;
    readonly p: 1;
    readonly maxmem: number;
};
/**
 * Derive a 32-byte key from a user passcode using scrypt.
 *
 * @param passcode User-chosen unlock passcode
 * @param salt 16-byte salt (random on first run; stored with the blob)
 * @returns 32-byte key
 */
export declare function deriveKeyFromPasscode(passcode: string, salt: Uint8Array): Uint8Array;
/**
 * Derive a 32-byte key from an app-held secret (e.g. a Stellar seed, a wallet
 * signature, or a value pulled from a secure enclave / OS keychain).
 *
 * Uses HKDF-style double-hashing with domain separation so callers do not have
 * to worry about pre-image or length-extension concerns.
 *
 * @param secret App-held secret material (will be SHA-256'd first)
 * @param salt 16-byte salt
 */
export declare function deriveKeyFromSecret(secret: Uint8Array, salt: Uint8Array): Uint8Array;
/**
 * Generate a fresh random salt.
 */
export declare function generateSalt(): Uint8Array;
export { nobleRandom, sha256 };
//# sourceMappingURL=keys.d.ts.map