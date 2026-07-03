export interface Groth16Proof {
    a: Uint8Array;
    b: Uint8Array;
    c: Uint8Array;
}
export interface SnarkJsProof {
    pi_a: [string, string, string];
    pi_b: [[string, string], [string, string], [string, string]];
    pi_c: [string, string, string];
}
export interface ProofPack {
    proof: SnarkJsProof;
    publicSignals: string[];
}
export declare function bindingSignal(bindingHash: Uint8Array): string;
export declare function proofPackToGroth16Proof(pack: ProofPack, actionType: number, bindingHash: Uint8Array): Groth16Proof;
export declare class ProofGenerator {
    generateTransferProof(): Promise<never>;
    generateUnwrapProof(): Promise<never>;
}
//# sourceMappingURL=generator.d.ts.map