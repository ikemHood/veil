"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyReferralButton({ link }: { link: string }) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		await navigator.clipboard.writeText(link);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	}

	return (
		<button className="copy-button" onClick={copy} type="button">
			{copied ? (
				<Check aria-hidden className="size-4" />
			) : (
				<Copy aria-hidden className="size-4" />
			)}
			{copied ? "Copied" : "Copy link"}
		</button>
	);
}
