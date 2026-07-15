import {
	ArrowDownRight,
	ArrowUpRight,
	Globe2,
	LockKeyhole,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import Link from "next/link";

import { JoinWaitlistButton } from "~/app/_components/auth-buttons";
import { PublicLeaderboard } from "~/app/_components/public-leaderboard";

export default function Home() {
	return (
		<main>
			<nav className="site-nav">
				<Link className="wordmark" href="/">
					VEIL
				</Link>
				<div className="nav-links">
					<a href="#how-it-works">How it works</a>
					<a href="#security">Security</a>
				</div>
				<JoinWaitlistButton compact />
			</nav>

			<section className="hero">
				<div className="hero-copy">
					<p className="section-label">
						Private cross-border payments on Stellar
					</p>
					<h1>
						Private money.
						<br />
						Open world.
					</h1>
					<p className="hero-description">
						Veil is building a more private way to move dollars across borders —
						without giving up the speed and openness of Stellar.
					</p>
					<div className="hero-actions">
						<JoinWaitlistButton />
						<a className="quiet-link" href="#how-it-works">
							See how it works <ArrowDownRight aria-hidden className="size-4" />
						</a>
					</div>
				</div>
				<section
					aria-label="Private payment flow preview"
					className="payment-panel"
				>
					<div className="panel-topline">
						<span>Veil balance</span>
						<span className="private-status">
							<i /> Private
						</span>
					</div>
					<p className="balance">
						$12,450<span>.00</span>
					</p>
					<div className="panel-rule" />
					<div className="payment-flow">
						<div>
							<span className="flow-icon">
								<ArrowUpRight aria-hidden />
							</span>
							<b>You send</b>
							<small>USDC</small>
						</div>
						<i className="flow-line" />
						<div>
							<span className="flow-icon">
								<LockKeyhole aria-hidden />
							</span>
							<b>Veil routes</b>
							<small>Privately</small>
						</div>
						<i className="flow-line" />
						<div>
							<span className="flow-icon">
								<ArrowDownRight aria-hidden />
							</span>
							<b>They receive</b>
							<small>USDC</small>
						</div>
					</div>
					<div className="panel-private-note">
						<ShieldCheck aria-hidden className="size-5" />
						<span>Your payment stays yours. Details remain private.</span>
					</div>
				</section>
			</section>

			<div className="trust-line">
				<span>
					<ShieldCheck aria-hidden /> Privacy by default
				</span>
				<span>
					<Globe2 aria-hidden /> Cross-border by nature
				</span>
				<span>
					<Sparkles aria-hidden /> Built on Stellar
				</span>
			</div>
			<section className="how-section" id="how-it-works">
				<div>
					<p className="section-label">How Veil works</p>
					<h2>Private when it matters.</h2>
				</div>
				<div className="steps">
					<p>
						<b>01</b> Fund your wallet
					</p>
					<p>
						<b>02</b> Shield into Veil
					</p>
					<p>
						<b>03</b> Send privately
					</p>
				</div>
			</section>
			<section className="security-section" id="security">
				<div>
					<p className="section-label">Private by design</p>
					<h2>
						Keep what matters
						<br />
						between you.
					</h2>
				</div>
				<div className="capabilities">
					<article>
						<LockKeyhole aria-hidden />
						<h3>Private transfers</h3>
						<p>Private payment details stay off the public path.</p>
					</article>
					<article>
						<ShieldCheck aria-hidden />
						<h3>Built for control</h3>
						<p>Clear choices around your money and identity.</p>
					</article>
					<article>
						<Globe2 aria-hidden />
						<h3>Global by nature</h3>
						<p>Move across borders on Stellar’s open network.</p>
					</article>
				</div>
			</section>
			<PublicLeaderboard />
			<footer>
				<span>VEIL</span>
				<p>Private money. Open world.</p>
				<a
					href="https://github.com/ikemHood/veil"
					rel="noopener"
					target="_blank"
				>
					GitHub <ArrowUpRight aria-hidden className="size-3" />
				</a>
			</footer>
		</main>
	);
}
