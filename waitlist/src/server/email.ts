import type { Resend } from "resend";

import { env } from "~/env";

let resend: Resend | undefined;

async function getResend() {
	const apiKey = env.RESEND_API_KEY;
	if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
	if (!resend) {
		const { Resend } = await import("resend");
		resend = new Resend(apiKey);
	}
	return resend;
}

function getFromAddress() {
	if (!env.RESEND_FROM) throw new Error("RESEND_FROM is not configured.");
	return env.RESEND_FROM;
}

const escapeHtml = (value: string) =>
	value.replace(/[&<>'"]/g, (character) => {
		const entities: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"'": "&#39;",
			'"': "&quot;",
		};
		return entities[character] ?? character;
	});

export async function sendWelcomeEmail(input: {
	email: string;
	handle: string;
	position: number;
	dashboardUrl: string;
	memberId: string;
}) {
	const client = await getResend();
	await client.emails.send(
		{
			from: getFromAddress(),
			to: input.email,
			subject: "You’re on Veil’s waitlist",
			html: `<main style="font-family:Arial,sans-serif;background:#08120f;color:#f7f5ef;padding:40px"><h1>Welcome to Veil.</h1><p>@${escapeHtml(input.handle)}, your current place is <strong>#${input.position}</strong>.</p><p>Share your invite link from your dashboard. Each completed referral earns one point.</p><p><a style="color:#d8ffd0" href="${escapeHtml(input.dashboardUrl)}">Open your dashboard</a></p></main>`,
		},
		{ headers: { "Idempotency-Key": `waitlist-welcome-${input.memberId}` } },
	);
}

export async function sendReferralRewardEmail(input: {
	email: string;
	handle: string;
	dashboardUrl: string;
	referralId: string;
}) {
	const client = await getResend();
	await client.emails.send(
		{
			from: getFromAddress(),
			to: input.email,
			subject: "Your Veil invite earned a point",
			html: `<main style="font-family:Arial,sans-serif;background:#08120f;color:#f7f5ef;padding:40px"><h1>You earned a point.</h1><p>@${escapeHtml(input.handle)} completed their Veil waitlist signup through your invite.</p><p><a style="color:#d8ffd0" href="${escapeHtml(input.dashboardUrl)}">View your position</a></p></main>`,
		},
		{ headers: { "Idempotency-Key": `waitlist-referral-${input.referralId}` } },
	);
}
