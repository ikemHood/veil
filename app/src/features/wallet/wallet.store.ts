import { create } from "zustand";
import type { VeilWallet } from "./wallet.types";

type WalletState = {
  wallet: VeilWallet | null;
  loading: boolean;
  error: string;
  setWallet: (wallet: VeilWallet | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  loading: false,
  error: "",
  setWallet: (wallet) => set({ wallet }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
