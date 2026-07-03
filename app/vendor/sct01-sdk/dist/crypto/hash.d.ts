/**
 * Compute SHA-256 hash (compatible with Soroban's env.crypto().sha256()).
 */
export declare function sha256(data: Uint8Array): Uint8Array;
/**
 * Generate cryptographically secure random bytes.
 */
export declare function randomBytes(length: number): Uint8Array;
/**
 * Poseidon hash over field elements (BN254 scalar field).
 * Used for commitments and nullifiers in the ZK circuits.
 *
 * Supports 2, 3, or 5 inputs. For other counts, pad with zeros.
 */
export declare function poseidonHash(inputs: bigint[]): bigint;
/**
 * Convert a bigint to a 32-byte big-endian Uint8Array.
 */
export declare function bigintToBytes(n: bigint): Uint8Array;
/**
 * Convert a Uint8Array (big-endian) to bigint.
 */
export declare function bytesToBigint(bytes: Uint8Array): bigint;
/**
 * Convert bytes to a BN254 field element.
 */
export declare function fieldFromBytes(bytes: Uint8Array): bigint;
/**
 * Convert a hex string to Uint8Array.
 */
export declare function hexToBytes(hex: string): Uint8Array;
/**
 * Convert a Uint8Array to hex string.
 */
export declare function bytesToHex(bytes: Uint8Array): string;
/**
 * BN254 scalar field modulus.
 */
export declare const BN254_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
/**
 * Reduce a bigint modulo the BN254 field.
 */
export declare function toField(n: bigint): bigint;
//# sourceMappingURL=hash.d.ts.map