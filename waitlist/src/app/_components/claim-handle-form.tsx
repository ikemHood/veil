"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "~/trpc/react";

export function ClaimHandleForm() {
	const router = useRouter();
	const [handle, setHandle] = useState("");
	const [handleToCheck, setHandleToCheck] = useState("");
	const claimHandle = api.waitlist.claimHandle.useMutation({
		onSuccess: () => router.refresh(),
	});
	const availability = api.waitlist.handleAvailability.useQuery(
		{ handle: handleToCheck },
		{
			enabled: Boolean(handleToCheck),
			refetchOnWindowFocus: false,
			retry: false,
		},
	);

	useEffect(() => {
		if (!handle.trim()) {
			setHandleToCheck("");
			return;
		}

		const timeout = window.setTimeout(() => setHandleToCheck(handle), 350);
		return () => window.clearTimeout(timeout);
	}, [handle]);

	const isChecking = Boolean(handle) && handleToCheck !== handle;
	const handleAvailable = availability.data?.status === "available";

	function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!handleAvailable) return;
		claimHandle.mutate({ handle });
	}

	return (
		<main className="claim-page">
			<a className="wordmark" href="/">
				VEIL
			</a>
			<section className="claim-card">
				<p className="section-label">One last step</p>
				<h1>Claim your Veil handle.</h1>
				<p>
					This handle identifies you in the waitlist leaderboard. Your Google
					name and email stay private.
				</p>
				<form onSubmit={submit}>
					<label htmlFor="handle">Your handle</label>
					<div className="handle-input">
						<span>@</span>
						<input
							autoCapitalize="none"
							autoComplete="username"
							id="handle"
							maxLength={20}
							onChange={(event) => setHandle(event.target.value.toLowerCase())}
							placeholder="yourname"
							required
							value={handle}
						/>
					</div>
					<p className="input-help">
						3–20 lowercase letters, numbers, or underscores.
					</p>
					{isChecking || availability.isFetching ? (
						<p className="handle-status checking">Checking handle…</p>
					) : availability.data ? (
						<p className={`handle-status ${availability.data.status}`}>
							{availability.data.message}
						</p>
					) : null}
					{claimHandle.error ? (
						<p className="form-error">{claimHandle.error.message}</p>
					) : null}
					<button
						className="button claim-button"
						disabled={claimHandle.isPending || !handleAvailable}
						type="submit"
					>
						{claimHandle.isPending ? (
							<LoaderCircle aria-hidden className="size-4 animate-spin" />
						) : (
							<ArrowRight aria-hidden className="size-4" />
						)}
						Claim my place
					</button>
				</form>
			</section>
		</main>
	);
}
