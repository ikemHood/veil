import type { ProofResult } from "../privacy/privacy.types";

export type TransactionType = "deposit" | "send" | "receive" | "withdraw";

export type VeilTransaction = {
  id: string;
  type: TransactionType;
  title: string;
  counterparty: string;
  amount: number;
  date: string;
  proof: ProofResult;
  destination?: string;
};
