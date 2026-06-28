import { redirect } from "@tanstack/react-router";
import type { AuthContextType } from "../../providers/auth-provider";
import { getOnboardingState, setUsername } from "../../features/onboarding/onboarding.store";
import { getVeilProfile } from "../../features/profile/profile.service";

export function requireAuthenticated(auth: AuthContextType, nextPath = "/") {
  if (!auth.session) {
    throw redirect({
      to: "/",
      search: { redirect: nextPath },
    });
  }
  return auth.session;
}

export function requirePin(auth: AuthContextType) {
  const session = requireAuthenticated(auth, "/onboarding/pin");
  const state = getOnboardingState(session.user.id);
  if (!state.pinSet) {
    throw redirect({ to: "/onboarding/pin" });
  }
  return { session, state };
}

export async function requireOnboardingComplete(auth: AuthContextType, nextPath = "/") {
  const session = requireAuthenticated(auth, nextPath);
  const state = getOnboardingState(session.user.id);
  if (!state.pinSet) throw redirect({ to: "/onboarding/pin" });
  const profile = await getVeilProfile();
  if (!profile?.handle) throw redirect({ to: "/onboarding/username" });
  if (state.username !== profile.handle) setUsername(session.user.id, profile.handle);
  return { session, state };
}

export async function redirectCompletedOnboarding(auth: AuthContextType) {
  const session = auth.session;
  if (!session) return;
  const state = getOnboardingState(session.user.id);
  if (!state.pinSet) return;
  const profile = await getVeilProfile();
  if (!profile?.handle) return;
  if (state.username !== profile.handle) setUsername(session.user.id, profile.handle);
  throw redirect({ to: "/home" });
}
