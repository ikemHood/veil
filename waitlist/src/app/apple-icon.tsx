import { ImageResponse } from "next/og";

export const size = {
	width: 180,
	height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
	return new ImageResponse(
		<div
			style={{
				alignItems: "center",
				background: "#07120e",
				display: "flex",
				height: "100%",
				justifyContent: "center",
				width: "100%",
			}}
		>
			<div
				style={{
					color: "#d9ffcf",
					fontFamily: "Arial, sans-serif",
					fontSize: 112,
					fontWeight: 800,
					letterSpacing: "-0.16em",
					marginLeft: "-12px",
				}}
			>
				V
			</div>
		</div>,
		size,
	);
}
