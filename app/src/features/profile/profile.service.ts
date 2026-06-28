import * as StellarSdk from "@stellar/stellar-sdk";
import { apiRequest } from "../../lib/api/client";

export type VeilProfile = {
  id: string;
  userId: string;
  handle: string;
  walletAddress: string | null;
  createdAt: string;
  updatedAt: string;
};

const localHandlePrefix = "veil.handle.";

function cleanHandle(handle: string) {
  return handle.trim().replace(/^@/, "").replace(/@veil$/i, "").toLowerCase();
}

export function isStellarPublicKey(value: string) {
  return StellarSdk.StrKey.isValidEd25519PublicKey(value.trim());
}

export function assertStellarPublicKey(value: string, label = "Stellar address") {
  const address = value.trim();
  if (!isStellarPublicKey(address)) throw new Error(`${label} is invalid`);
  return address;
}

function setLocalHandle(handle: string, walletAddress: string) {
  window.localStorage.setItem(`${localHandlePrefix}${cleanHandle(handle)}`, walletAddress);
}

function getLocalHandle(handle: string) {
  return window.localStorage.getItem(`${localHandlePrefix}${cleanHandle(handle)}`);
}

export async function claimVeilProfile(handle: string, walletAddress: string) {
  const profile = await apiRequest<VeilProfile>("/api/v1/veil/profile", {
    method: "POST",
    body: JSON.stringify({ handle: cleanHandle(handle), walletAddress }),
  });
  if (profile.walletAddress) setLocalHandle(profile.handle, profile.walletAddress);
  return profile;
}

export async function getVeilProfile() {
  const profile = await apiRequest<VeilProfile | null>("/api/v1/veil/profile");
  if (profile?.walletAddress) setLocalHandle(profile.handle, profile.walletAddress);
  return profile;
}

export async function resolveVeilHandle(handle: string) {
  const clean = cleanHandle(handle);
  if (!clean) throw new Error("Recipient is required");
  const profile = await apiRequest<{ handle: string; walletAddress: string | null }>(`/api/v1/veil/resolve/${clean}`);
  if (!profile.walletAddress) throw new Error("Recipient has no account reference");
  assertStellarPublicKey(profile.walletAddress, "Recipient account reference");
  setLocalHandle(profile.handle, profile.walletAddress);
  return profile.walletAddress;
}

export async function resolveRecipientAddress(input: string) {
  const recipient = input.trim();
  if (!recipient) throw new Error("Recipient is required");
  if (isStellarPublicKey(recipient)) return recipient;
  return resolveVeilHandle(recipient);
}

export function resolveCachedVeilHandle(handle: string) {
  return getLocalHandle(handle);
}
