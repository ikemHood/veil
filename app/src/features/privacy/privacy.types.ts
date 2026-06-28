export type PrivacyAction = "deposit" | "send" | "withdraw" | "disclosure";

export type StoredNote = {
  id: string;
  assetId: string;
  amount: string;
  owner: string;
  randomness: string;
  nullifierKey: string;
  nullifierSecret: string;
  commitment: string;
  leafIndex?: number;
  memo?: string;
  spent: boolean;
  creationTxHash?: string;
  createdAt: number;
};

export type NotesStateBlob = {
  notes: StoredNote[];
  commitmentLeaves: string[];
};

export type PrivacyTxResult = {
  txHash: string;
  proofId: string;
  commitment?: string;
  nullifier?: string;
  balance: bigint;
};

export type DisclosureOptions = {
  amount: boolean;
  date: boolean;
  sender: boolean;
  recipient: boolean;
  destination: boolean;
  provenance: boolean;
};

export type ProofResult = {
  id: string;
  commitment: string;
  nullifier?: string;
  generatedAt: string;
  action: PrivacyAction;
};
