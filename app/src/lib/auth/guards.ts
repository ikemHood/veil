import { redirect } from "@tanstack/react-router";
import type { AuthContextType } from "../../providers/auth-provider";
import { getOnboardingState } from "../../features/onboarding/onboarding.store";

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

export function requireOnboardingComplete(auth: AuthContextType, nextPath = "/") {
  const session = requireAuthenticated(auth, nextPath);
  const state = getOnboardingState(session.user.id);
  if (!state.pinSet) throw redirect({ to: "/onboarding/pin" });
  if (!state.username) throw redirect({ to: "/onboarding/username" });
  return { session, state };
}

export function redirectCompletedOnboarding(auth: AuthContextType) {
  const session = auth.session;
  if (!session) return;
  const state = getOnboardingState(session.user.id);
  if (state.pinSet && state.username) throw redirect({ to: "/home" });
}
