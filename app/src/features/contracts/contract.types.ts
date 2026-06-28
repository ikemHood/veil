import type { Groth16Proof } from "@sct01/sdk";

export type ContractConfig = {
  network: string;
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
  wrapperContractId: string;
  verifierContractId: string;
  aspContractId: string;
  assetAddress: string;
};

export type ContractSigner = (xdr: string) => Promise<string>;

export type ShieldedPoolContract = {
  getNoteCount(owner: string): Promise<number>;
  getRoot(owner: string): Promise<Uint8Array>;
  shield(owner: string, amount: bigint, commitment: Uint8Array, encryptedNote: Uint8Array, signer: ContractSigner): Promise<string>;
  transfer(
    owner: string,
    proof: Groth16Proof,
    root: Uint8Array,
    assetId: string,
    nullifiers: Uint8Array[],
    commitments: Uint8Array[],
    encryptedNotes: Uint8Array[],
    signer: ContractSigner,
  ): Promise<string>;
  withdraw(
    owner: string,
    proof: Groth16Proof,
    nullifier: Uint8Array,
    destination: string,
    amount: bigint,
    root: Uint8Array,
    assetId: string,
    signer: ContractSigner,
  ): Promise<string>;
};

export type VerifierContract = {
  contractId: string;
};

export type AspContract = {
  contractId: string;
};
