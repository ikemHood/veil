export type OnboardingState = {
  pinSet: boolean;
  pinHash?: string;
  username?: string;
};

const prefix = "veil.onboarding.";

function key(userId: string) {
  return `${prefix}${userId}`;
}

export function getOnboardingState(userId: string): OnboardingState {
  const raw = window.localStorage.getItem(key(userId));
  if (!raw) return { pinSet: false };
  try {
    return JSON.parse(raw) as OnboardingState;
  } catch {
    window.localStorage.removeItem(key(userId));
    return { pinSet: false };
  }
}

export async function hashPin(pin: string) {
  const bytes = new TextEncoder().encode(`veil-pin:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function setTransactionPin(userId: string, pin: string) {
  const current = getOnboardingState(userId);
  const next: OnboardingState = {
    ...current,
    pinSet: true,
    pinHash: await hashPin(pin),
  };
  window.localStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}

export async function verifyTransactionPin(userId: string, pin: string) {
  const state = getOnboardingState(userId);
  return Boolean(state.pinHash && state.pinHash === (await hashPin(pin)));
}

export function setUsername(userId: string, username: string) {
  const clean = username.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 18);
  const next: OnboardingState = {
    ...getOnboardingState(userId),
    username: clean,
  };
  window.localStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}

export function clearOnboarding(userId: string) {
  window.localStorage.removeItem(key(userId));
}
