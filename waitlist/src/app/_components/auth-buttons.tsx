"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "~/server/better-auth/client";

export function JoinWaitlistButton({ compact = false }: { compact?: boolean }) {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [isSigningIn, setIsSigningIn] = useState(false);

	async function join() {
		if (session) {
			router.push("/dashboard");
			return;
		}

		setIsSigningIn(true);
		await authClient.signIn.social({
			provider: "google",
			callbackURL: `${window.location.origin}/dashboard`,
		});
	}

	return (
		<button
			className={compact ? "button button-compact" : "button"}
			disabled={isPending || isSigningIn}
			onClick={join}
			type="button"
		>
			{isSigningIn ? (
				<LoaderCircle aria-hidden className="size-4 animate-spin" />
			) : null}
			{session ? "Open dashboard" : "Join waitlist"}
		</button>
	);
}

export function SignOutButton() {
	const router = useRouter();
	const [isSigningOut, setIsSigningOut] = useState(false);

	async function signOut() {
		setIsSigningOut(true);
		await authClient.signOut();
		router.push("/");
		router.refresh();
	}

	return (
		<button
			className="text-button"
			disabled={isSigningOut}
			onClick={signOut}
			type="button"
		>
			{isSigningOut ? "Signing out…" : "Sign out"}
		</button>
	);
}
