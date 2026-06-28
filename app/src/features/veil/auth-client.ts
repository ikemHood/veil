import { createAuthClient } from "better-auth/react";

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3001";

export const authClient = createAuthClient({
  baseURL: `${apiBaseUrl}/api/auth`,
});

export async function signInWithSocial(provider: "google" | "facebook") {
  const response = await fetch(`${apiBaseUrl}/api/auth/sign-in/social`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      callbackURL: window.location.origin,
    }),
  });
  const payload = (await response.json()) as { url?: string; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Social sign-in failed");
  if (payload.url) window.location.assign(payload.url);
}

export type VeilProfile = {
  id: string;
  userId: string;
  handle: string;
  walletAddress: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

export async function claimVeilProfile(
  handle: string,
  walletAddress?: string,
): Promise<VeilProfile> {
  const response = await fetch(`${apiBaseUrl}/api/v1/veil/profile`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, walletAddress }),
  });
  const payload = (await response.json()) as ApiResult<VeilProfile>;
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}

export async function getVeilProfile(): Promise<VeilProfile | null> {
  const response = await fetch(`${apiBaseUrl}/api/v1/veil/profile`, {
    credentials: "include",
  });
  if (response.status === 401) return null;
  const payload = (await response.json()) as ApiResult<VeilProfile | null>;
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}

export async function resolveVeilHandle(handle: string): Promise<string> {
  const clean = handle.replace(/@veil$/, "").toLowerCase();
  const response = await fetch(`${apiBaseUrl}/api/v1/veil/resolve/${clean}`, {
    credentials: "include",
  });
  const payload = (await response.json()) as ApiResult<{
    handle: string;
    walletAddress: string | null;
  }>;
  if (!payload.success) throw new Error(payload.error);
  if (!payload.data.walletAddress) throw new Error("Recipient has no wallet");
  return payload.data.walletAddress;
}
