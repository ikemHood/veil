import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	metadataBase: new URL("https://joinveil.vercel.app"),
	title: {
		default: "Veil — Private money. Open world.",
		template: "%s | Veil",
	},
	description:
		"Join Veil’s waitlist for private cross-border payments built on Stellar.",
	keywords: [
		"Veil",
		"private payments",
		"cross-border payments",
		"Stellar",
		"payments waitlist",
	],
	alternates: {
		canonical: "/",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
		},
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "/",
		siteName: "Veil",
		title: "Veil — Private money. Open world.",
		description:
			"Private cross-border payments built on Stellar. Join the waitlist.",
		images: [
			{
				url: "/opengraph-image",
				width: 1200,
				height: 630,
				alt: "Veil — Private money. Open world.",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Veil — Private money. Open world.",
		description:
			"Private cross-border payments built on Stellar. Join the waitlist.",
		images: ["/twitter-image"],
	},
	icons: {
		icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
		shortcut: ["/icon.svg"],
		apple: [{ url: "/apple-icon" }],
	},
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable}`} lang="en">
			<body className="antialiased">
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
