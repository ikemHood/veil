import { useEffect, useMemo, useState } from "react";
import { authClient, signInWithGoogle as startGoogleSignIn, signOut as authSignOut, type VeilSession } from "./client";

const LOCAL_SESSION_KEY = "veil.session.local";

type SessionHookResult = {
  data?: VeilSession | null;
  isPending?: boolean;
  error?: unknown;
};

type SessionClient = {
  useSession: () => SessionHookResult;
};

const sessionClient = authClient as unknown as SessionClient;

function readLocalSession(): VeilSession | null {
  const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VeilSession;
  } catch {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    return null;
  }
}

function writeLocalSession(session: VeilSession) {
  window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("veil-session-change"));
}

export function getLocalSession() {
  return readLocalSession();
}

export function createLocalSession() {
  const session: VeilSession = {
    user: {
      id: "local-google-user",
      email: "user@veil.local",
      name: "Veil user",
    },
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  };
  writeLocalSession(session);
  return session;
}

export function useSession() {
  const remote = sessionClient.useSession();
  const [localSession, setLocalSession] = useState<VeilSession | null>(() => readLocalSession());

  useEffect(() => {
    const sync = () => setLocalSession(readLocalSession());
    window.addEventListener("veil-session-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("veil-session-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return useMemo(
    () => ({
      session: remote.data ?? localSession,
      loading: Boolean(remote.isPending),
      error: remote.error,
    }),
    [localSession, remote.data, remote.error, remote.isPending],
  );
}

export async function signInWithGoogle() {
  if (import.meta.env.VITE_ENABLE_REAL_GOOGLE_SIGNIN !== "true") {
    createLocalSession();
    return;
  }
  try {
    await startGoogleSignIn();
  } catch (error) {
    if (import.meta.env.VITE_ALLOW_LOCAL_AUTH_FALLBACK === "false") throw error;
    createLocalSession();
  }
}

export async function signOut() {
  window.localStorage.removeItem(LOCAL_SESSION_KEY);
  window.dispatchEvent(new Event("veil-session-change"));
  await authSignOut().catch(() => undefined);
}
