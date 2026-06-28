import { useEffect } from "react";
import { authClient, signInWithGoogle as startGoogleSignIn, signOut as authSignOut, type VeilSession } from "./client";

const LOCAL_SESSION_KEY = "veil.session.local";

type SessionHookResult = {
  data?: unknown;
  isPending?: boolean;
  error?: unknown;
};

type SessionClient = {
  useSession: () => SessionHookResult;
};

const sessionClient = authClient as unknown as SessionClient;

type BetterAuthSessionData = {
  user?: VeilSession["user"];
  session?: {
    expiresAt?: Date | string;
  };
  expiresAt?: Date | string;
};

function normalizeSession(data: unknown): VeilSession | null {
  if (!data || typeof data !== "object") return null;
  const candidate = data as BetterAuthSessionData;
  if (!candidate.user?.id) return null;
  return {
    user: candidate.user,
    expiresAt: candidate.expiresAt ?? candidate.session?.expiresAt,
  };
}

export function useSession() {
  const remote = sessionClient.useSession();

  useEffect(() => {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
  }, []);

  return {
    session: normalizeSession(remote.data),
    loading: Boolean(remote.isPending),
    error: remote.error,
  };
}

export async function signInWithGoogle() {
  await startGoogleSignIn();
}

export async function signOut() {
  window.localStorage.removeItem(LOCAL_SESSION_KEY);
  await authSignOut().catch(() => undefined);
}
