import * as StellarSdk from "@stellar/stellar-sdk";
import type { NetworkConfig, ConfidentialTokenMetadata } from "../types.js";
import type { Groth16Proof } from "../proof/generator.js";
export type SignTransaction = (xdr: string) => Promise<string>;
/**
 * Contract client for SCT-01 adapter calls.
 */
export declare class ContractClient {
    private rpc;
    private horizon;
    private config;
    constructor(config: NetworkConfig);
    /**
     * Deposit: lock public tokens and create a confidential note.
     */
    deposit(sourceAddress: string, amount: bigint, commitment: Uint8Array, encryptedNote: Uint8Array, signTransaction: SignTransaction): Promise<string>;
    /**
     * Confidential transfer: spend one note, create recipient and change notes.
     */
    transfer(sourceAddress: string, proof: Groth16Proof, merkleRoot: Uint8Array, assetId: string, nullifiers: Uint8Array[], outputCommitments: Uint8Array[], encryptedNotes: Uint8Array[], signTransaction: SignTransaction): Promise<string>;
    /**
     * Withdraw: spend a confidential note and release public tokens.
     */
    withdraw(sourceAddress: string, proof: Groth16Proof, nullifier: Uint8Array, recipient: string, amount: bigint, merkleRoot: Uint8Array, assetId: string, signTransaction: SignTransaction): Promise<string>;
    /**
     * Keypair convenience wrapper for Node scripts.
     */
    wrap(sourceKeypair: StellarSdk.Keypair, amount: bigint, commitment: Uint8Array, encryptedNote: Uint8Array): Promise<string>;
    /**
     * Keypair convenience wrapper for Node scripts.
     */
    confidentialTransfer(sourceKeypair: StellarSdk.Keypair, proof: Groth16Proof, merkleRoot: Uint8Array, assetId: string, nullifiers: Uint8Array[], outputCommitments: Uint8Array[], encryptedNotes: Uint8Array[]): Promise<string>;
    /**
     * Keypair convenience wrapper for Node scripts.
     */
    unwrap(sourceKeypair: StellarSdk.Keypair, proof: Groth16Proof, nullifier: Uint8Array, recipient: string, amount: bigint, merkleRoot: Uint8Array, assetId: string): Promise<string>;
    isSpent(sourceAddress: string, nullifier: Uint8Array): Promise<boolean>;
    commitmentExists(sourceAddress: string, commitment: Uint8Array): Promise<boolean>;
    getRoot(sourceAddress: string): Promise<Uint8Array>;
    getNoteCount(sourceAddress: string): Promise<number>;
    getCommitmentAt(sourceAddress: string, index: number): Promise<Uint8Array | null>;
    getCommitments(sourceAddress: string, start?: number, limit?: number): Promise<Uint8Array[]>;
    getMetadata(sourceAddress: string): Promise<ConfidentialTokenMetadata>;
    getPublicBalance(address: string): Promise<string>;
    getEvents(startLedger: number, eventTypes?: string[]): Promise<StellarSdk.rpc.Api.GetEventsResponse>;
    private submitOperation;
    private signXdr;
    private pollTransaction;
    private invokeViewFunction;
}
//# sourceMappingURL=client.d.ts.map