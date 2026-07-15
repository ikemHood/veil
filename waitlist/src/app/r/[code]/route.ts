import { NextResponse } from "next/server";

const REFERRAL_CODE = /^[A-Z0-9]{10}$/;

export async function GET(
	request: Request,
	context: { params: Promise<{ code: string }> },
) {
	const { code } = await context.params;
	const response = NextResponse.redirect(new URL("/", request.url));

	if (REFERRAL_CODE.test(code)) {
		response.cookies.set("veil_ref", code, {
			httpOnly: true,
			maxAge: 60 * 60 * 24 * 30,
			path: "/",
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		});
	}

	return response;
}
