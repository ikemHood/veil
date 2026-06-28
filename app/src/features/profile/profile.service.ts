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
  setLocalHandle(handle, walletAddress);
  try {
    return await apiRequest<VeilProfile>("/api/v1/veil/profile", {
      method: "POST",
      body: JSON.stringify({ handle: cleanHandle(handle), walletAddress }),
    });
  } catch {
    return {
      id: `local_${cleanHandle(handle)}`,
      userId: "local",
      handle: cleanHandle(handle),
      walletAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function resolveVeilHandle(handle: string) {
  const clean = cleanHandle(handle);
  try {
    const profile = await apiRequest<{ handle: string; walletAddress: string | null }>(`/api/v1/veil/resolve/${clean}`);
    if (!profile.walletAddress) throw new Error("Recipient has no account reference");
    setLocalHandle(profile.handle, profile.walletAddress);
    return profile.walletAddress;
  } catch {
    const local = getLocalHandle(clean);
    if (!local) throw new Error("Recipient not found");
    return local;
  }
}
