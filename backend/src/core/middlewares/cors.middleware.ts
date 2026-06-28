import { cors } from "hono/cors";

/**
 * CORS middleware configuration
 * Allows cross-origin requests with proper headers
 */
export function corsMiddleware() {
	return cors({
		origin: (origin) => {
			const allowedOrigins = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
			return allowedOrigins.has(origin) ? origin : "http://127.0.0.1:3000";
		},
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "Cookie"],
		exposeHeaders: ["Content-Length", "Content-Type", "Authorization"],
		credentials: true,
		maxAge: 86400, // 24 hours
	});
}
