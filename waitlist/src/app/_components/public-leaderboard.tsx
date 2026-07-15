"use client";

import { ArrowUpRight, Trophy } from "lucide-react";

import { api } from "~/trpc/react";

export function PublicLeaderboard() {
	const leaderboard = api.waitlist.leaderboard.useQuery({ limit: 5 });
	const rows = leaderboard.data ?? [];

	return (
		<section className="leaderboard-section" id="leaderboard">
			<div>
				<p className="section-label">Waitlist leaderboard</p>
				<h2>Move with your network.</h2>
				<p className="section-copy">
					Each completed referral earns one point and improves your place in
					line. People stay private; momentum does not.
				</p>
			</div>
			<div className="leaderboard-card">
				<div className="leaderboard-heading">
					<span>Rank</span>
					<span>Member</span>
					<span>Points</span>
				</div>
				{leaderboard.isLoading ? (
					<p className="leaderboard-empty">Loading early members…</p>
				) : rows.length ? (
					rows.map((row) => (
						<div className="leaderboard-row" key={`${row.rank}-${row.handle}`}>
							<span className="rank">{String(row.rank).padStart(2, "0")}</span>
							<span className="masked-handle">{row.handle}</span>
							<span className="points">{row.points}</span>
						</div>
					))
				) : (
					<p className="leaderboard-empty">
						First places are open. Join Veil, claim your handle, and lead the
						line.
					</p>
				)}
				<div className="leaderboard-footnote">
					<Trophy aria-hidden className="size-4" />
					<span>Handles masked. Personal data never displayed.</span>
					<ArrowUpRight aria-hidden className="ml-auto size-4" />
				</div>
			</div>
		</section>
	);
}
