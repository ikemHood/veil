import {
	ArrowUpRight,
	Copy,
	LockKeyhole,
	ShieldCheck,
	Trophy,
} from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "~/app/_components/auth-buttons";
import { ClaimHandleForm } from "~/app/_components/claim-handle-form";
import { CopyReferralButton } from "~/app/_components/copy-referral-button";
import { env } from "~/env";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { getSession } from "~/server/better-auth/server";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
	const session = await getSession();
	if (!session) redirect("/");

	const requestHeaders = new Headers(await headers());
	const api = createCaller(
		await createTRPCContext({ headers: requestHeaders }),
	);
	const member = await api.waitlist.me();

	if (!member) return <ClaimHandleForm />;

	const nearbyMembers = await api.waitlist.neighborhood();
	const referralLink = new URL(
		`/r/${member.referralCode}`,
		env.BETTER_AUTH_URL,
	).toString();

	return (
		<main className="dashboard-shell">
			<aside className="dashboard-sidebar">
				<a className="wordmark" href="/">
					VEIL
				</a>
				<nav>
					<a className="active" href="/dashboard">
						Waitlist
					</a>
					<a href="/#how-it-works">How it works</a>
				</nav>
				<div className="sidebar-bottom">
					<span className="avatar-mark">V</span>
					<p>Your Google profile and email stay private.</p>
					<SignOutButton />
				</div>
			</aside>
			<section className="dashboard-content">
				<header className="dashboard-header">
					<div>
						<p className="section-label">Veil waitlist</p>
						<h1>Your place in line.</h1>
					</div>
					<span className="dashboard-handle">@{member.handle}</span>
				</header>
				<div className="rank-grid">
					<article className="rank-card">
						<p>Your position</p>
						<strong>#{member.position}</strong>
						<span>
							<ShieldCheck aria-hidden className="size-4" /> Visible only to you
						</span>
					</article>
					<article className="invite-card">
						<div>
							<p>Your invite link</p>
							<span className="invite-url">{referralLink}</span>
						</div>
						<CopyReferralButton link={referralLink} />
						<div className="invite-footer">
							<Trophy aria-hidden className="size-5" />
							<span>
								<b>
									{member.points} {member.points === 1 ? "point" : "points"}
								</b>
								<small>One completed signup = one point</small>
							</span>
						</div>
					</article>
				</div>
				<section className="dashboard-leaderboard">
					<div className="dashboard-section-header">
						<div>
							<p className="section-label">Privacy-safe leaderboard</p>
							<h2>Position, without exposure.</h2>
						</div>
						<LockKeyhole aria-hidden className="size-5" />
					</div>
					<div className="dashboard-table">
						<div className="dashboard-table-heading">
							<span>Rank</span>
							<span>Member</span>
							<span>Points</span>
						</div>
						{nearbyMembers.map((entry) => (
							<div
								className={
									entry.isYou ? "dashboard-row is-you" : "dashboard-row"
								}
								key={`${entry.rank}-${entry.handle}`}
							>
								<span>{entry.rank}</span>
								<span>
									{entry.handle}
									{entry.isYou ? <em>You</em> : null}
								</span>
								<span>{entry.points}</span>
							</div>
						))}
					</div>
					<p className="dashboard-note">
						<Copy aria-hidden className="size-4" /> Your real name, email, and
						Google profile are never shown on the leaderboard.
					</p>
				</section>
				<a className="dashboard-help" href="/#how-it-works">
					How referral points work{" "}
					<ArrowUpRight aria-hidden className="size-4" />
				</a>
			</section>
		</main>
	);
}
