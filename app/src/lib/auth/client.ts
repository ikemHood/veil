import { createAuthClient } from "better-auth/react";
import { apiBaseUrl } from "../api/client";

export const authClient = createAuthClient({
  baseURL: `${apiBaseUrl}/api/auth`,
});

export type VeilUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export type VeilSession = {
  user: VeilUser;
  expiresAt?: Date | string;
};

type SocialSignInClient = {
  signIn: {
    social: (input: { provider: "google"; callbackURL: string }) => Promise<unknown>;
  };
  signOut: () => Promise<unknown>;
};

const socialClient = authClient as unknown as SocialSignInClient;

export async function signInWithGoogle() {
  return socialClient.signIn.social({
    provider: "google",
    callbackURL: `${window.location.origin}/onboarding/pin`,
  });
}

export async function signOut() {
  return socialClient.signOut();
}
