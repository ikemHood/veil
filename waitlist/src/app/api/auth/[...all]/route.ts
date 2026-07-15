import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "~/server/better-auth";

export async function GET(request: Request) {
	return toNextJsHandler(getAuth().handler).GET(request);
}

export async function POST(request: Request) {
	return toNextJsHandler(getAuth().handler).POST(request);
}
