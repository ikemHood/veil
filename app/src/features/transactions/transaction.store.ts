import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VeilTransaction } from "./transaction.types";

type TransactionState = {
  transactions: VeilTransaction[];
  addTransaction: (transaction: VeilTransaction) => void;
  clearTransactions: () => void;
};

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set) => ({
      transactions: [],
      addTransaction: (transaction) => set((state) => ({ transactions: [transaction, ...state.transactions] })),
      clearTransactions: () => set({ transactions: [] }),
    }),
    { name: "veil.transactions" },
  ),
);
