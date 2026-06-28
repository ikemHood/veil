import { useEffect } from "react";
import { walletService } from "./wallet.service";
import { useWalletStore } from "./wallet.store";

export function useVeilWallet(userId: string | undefined, username?: string) {
  const { error, loading, setError, setLoading, setWallet, wallet } = useWalletStore();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setError("");
    walletService
      .getOrCreateWallet(userId, username)
      .then((nextWallet) => {
        if (active) setWallet(nextWallet);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to prepare private dollar account");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setError, setLoading, setWallet, userId, username]);

  return { wallet, loading, error };
}
