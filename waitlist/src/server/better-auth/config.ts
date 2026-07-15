import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "~/env";
import { getDb } from "~/server/db";

let authInstance: ReturnType<typeof createAuth> | undefined;

function required(name: string, value: string | undefined) {
	if (!value) throw new Error(`${name} is not configured.`);
	return value;
}

function createAuth() {
	const baseURL = required("BETTER_AUTH_URL", env.BETTER_AUTH_URL);

	return betterAuth({
		database: drizzleAdapter(getDb(), { provider: "pg" }),
		secret: required("BETTER_AUTH_SECRET", env.BETTER_AUTH_SECRET),
		baseURL,
		trustedOrigins: [baseURL],
		socialProviders: {
			google: {
				clientId: required("GOOGLE_CLIENT_ID", env.GOOGLE_CLIENT_ID),
				clientSecret: required(
					"GOOGLE_CLIENT_SECRET",
					env.GOOGLE_CLIENT_SECRET,
				),
			},
		},
		advanced: {
			cookiePrefix: "veil_waitlist",
		},
	});
}

export function getAuth() {
	authInstance ??= createAuth();
	return authInstance;
}

export type Session = ReturnType<typeof getAuth>["$Infer"]["Session"];
