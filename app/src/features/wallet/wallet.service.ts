import { getSigner, loadWallet, provisionWallet, requestTestnetFaucet, updateWalletUsername } from "./wallet-sdk.adapter";
import type { WalletService } from "./wallet.types";

export const walletService: WalletService = {
  async getOrCreateWallet(userId, username) {
    return provisionWallet(userId, username);
  },
  async getWallet(userId) {
    return loadWallet(userId);
  },
  async updateUsername(userId, username) {
    return updateWalletUsername(userId, username);
  },
  async signTransaction(userId, xdr) {
    const signer = await getSigner(userId);
    return signer.signTransaction(xdr);
  },
};

export async function faucetWallet(userId: string) {
  return requestTestnetFaucet(userId);
}
