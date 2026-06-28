import { create } from "zustand";
import type { VeilTransaction } from "./transaction.types";

const storagePrefix = "veil.transactions.";

type TransactionState = {
  ownerKey: string | null;
  transactions: VeilTransaction[];
  setOwner: (ownerKey: string | null) => void;
  addTransaction: (transaction: VeilTransaction) => void;
  clearTransactions: () => void;
};

function storageKey(ownerKey: string) {
  return `${storagePrefix}${ownerKey}`;
}

function readTransactions(ownerKey: string) {
  const raw = window.localStorage.getItem(storageKey(ownerKey));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as VeilTransaction[];
  } catch {
    window.localStorage.removeItem(storageKey(ownerKey));
    return [];
  }
}

function writeTransactions(ownerKey: string, transactions: VeilTransaction[]) {
  window.localStorage.setItem(storageKey(ownerKey), JSON.stringify(transactions));
}

export const useTransactionStore = create<TransactionState>()((set, get) => ({
  ownerKey: null,
  transactions: [],
  setOwner: (ownerKey) => {
    if (!ownerKey) {
      set({ ownerKey: null, transactions: [] });
      return;
    }
    set({ ownerKey, transactions: readTransactions(ownerKey) });
  },
  addTransaction: (transaction) => {
    const { ownerKey, transactions } = get();
    if (!ownerKey) return;
    const next = [transaction, ...transactions];
    writeTransactions(ownerKey, next);
    set({ transactions: next });
  },
  clearTransactions: () => {
    const { ownerKey } = get();
    if (ownerKey) window.localStorage.removeItem(storageKey(ownerKey));
    set({ transactions: [] });
  },
}));
