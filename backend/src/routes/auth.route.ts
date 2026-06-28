import { Hono } from "hono";

import type { Auth } from "@/config";
import type { AppEnv } from "@/core/types/app.types";

/**
 * Creates a request with Expo origin header substitution if present.
 * This is needed because Expo apps send the origin in a custom "expo-origin" header,
 * but Better Auth expects it in the standard "origin" header.
 * See: https://github.com/better-auth/better-auth/discussions/5750#discussioncomment-15174163
 *
 * @param request - The original request
 * @returns The request with origin header set from expo-origin if present
 */
function withExpoOrigin(request: Request): Request {
	const expoOrigin = request.headers.get("expo-origin");
	if (!expoOrigin) {
		return request;
	}

	const newHeaders = new Headers(request.headers);
	newHeaders.set("origin", expoOrigin);

	return new Request(request, { headers: newHeaders });
}

/**
 * Authentication routes factory
 * Creates auth routes with Better Auth handler
 * Note: Auth routes are not versioned as they serve all API versions
 */
export function createAuthRoutes(auth: Auth) {
	const authRoutes = new Hono<AppEnv>();

	/**
	 * POST/GET /api/auth/*
	 * Handles all Better Auth endpoints (sign-in, sign-up, sign-out, etc.)
	 */
	authRoutes.on(["POST", "GET"], "/auth/*", (c) => auth.handler(withExpoOrigin(c.req.raw)));

	return authRoutes;
}
