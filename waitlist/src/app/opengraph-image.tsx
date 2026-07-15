import { ImageResponse } from "next/og";

export const alt = "Veil — Private money. Open world.";

export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
	return new ImageResponse(
		<div
			style={{
				background:
					"radial-gradient(circle at 82% 18%, #2f7850 0, transparent 30%), radial-gradient(circle at 10% 90%, #173c2a 0, transparent 32%), #07120e",
				color: "#f5f3ed",
				display: "flex",
				flexDirection: "column",
				height: "100%",
				justifyContent: "space-between",
				padding: "70px",
				width: "100%",
			}}
		>
			<div
				style={{
					alignItems: "center",
					display: "flex",
					fontFamily: "Arial, sans-serif",
					fontSize: 30,
					fontWeight: 700,
					letterSpacing: "0.28em",
				}}
			>
				VEIL
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
				<div
					style={{
						color: "#d9ffcf",
						display: "flex",
						fontFamily: "Arial, sans-serif",
						fontSize: 22,
						fontWeight: 700,
						letterSpacing: "0.12em",
						textTransform: "uppercase",
					}}
				>
					Private cross-border payments on Stellar
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						fontFamily: "Arial, sans-serif",
						fontSize: 92,
						fontWeight: 500,
						letterSpacing: "-0.08em",
						lineHeight: 0.94,
					}}
				>
					<div style={{ display: "flex" }}>Private money.</div>
					<div style={{ display: "flex" }}>Open world.</div>
				</div>
			</div>
			<div
				style={{
					alignItems: "center",
					color: "#b9c9b8",
					display: "flex",
					fontFamily: "Arial, sans-serif",
					fontSize: 25,
					justifyContent: "space-between",
				}}
			>
				<span>Join the waitlist</span>
				<span>joinveil.vercel.app</span>
			</div>
		</div>,
		size,
	);
}
