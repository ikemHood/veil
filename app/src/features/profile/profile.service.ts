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
  return handle.replace(/@veil$/, "").toLowerCase();
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
  const profile = await apiRequest<{ handle: string; walletAddress: string | null }>(`/api/v1/veil/resolve/${clean}`);
  if (!profile.walletAddress) throw new Error("Recipient has no account reference");
  setLocalHandle(profile.handle, profile.walletAddress);
  return profile.walletAddress;
}

export function resolveCachedVeilHandle(handle: string) {
  return getLocalHandle(handle);
}
