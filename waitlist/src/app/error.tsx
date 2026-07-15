"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
	return (
		<main className="error-page">
			<a className="wordmark" href="/">
				VEIL
			</a>
			<h1>Something interrupted the flow.</h1>
			<p>Try again. Your waitlist place is safe.</p>
			<button className="button" onClick={reset} type="button">
				Try again
			</button>
		</main>
	);
}
