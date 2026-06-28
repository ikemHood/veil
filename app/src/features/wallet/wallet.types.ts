export type WalletStatus = "creating" | "ready" | "failed";

export interface VeilWallet {
  userId: string;
  publicKey: string;
  accountId: string;
  username?: string;
  status: WalletStatus;
}

export interface WalletService {
  getOrCreateWallet(userId: string, username?: string): Promise<VeilWallet>;
  getWallet(userId: string): Promise<VeilWallet | null>;
  updateUsername(userId: string, username: string): Promise<VeilWallet>;
  signTransaction(userId: string, xdr: string): Promise<string>;
}

export type WalletSigner = {
  publicKey: string;
  signTransaction: (xdr: string) => Promise<string>;
};
