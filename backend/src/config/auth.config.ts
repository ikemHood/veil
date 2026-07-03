import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";

import { db } from "@/config/database/db.config";
import { env } from "@/config/environment.config";

import { redis } from "./redis.config";

/**
 * Authentication configuration using Better Auth
 * Supports Google OAuth for the Veil demo.
 */
export default async function createAuthConfig() {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
		}),
		advanced: {
			cookiePrefix: "veil",
		},
		rateLimit: {
			enabled: true,
			storage: "secondary-storage",
			window: 60, // time window in seconds
			max: 100, // max requests in the window
			customRules: {
				"/get-session": false,
				"/sign-in/email": { max: 3, window: 60 },
			},
		},
		secondaryStorage: {
			get: async (key) => {
				return await redis.get(key);
			},
			set: async (key, value, ttl) => {
				if (ttl) await redis.set(key, value, { EX: ttl });
				else await redis.set(key, value);
			},
			delete: async (key) => {
				await redis.del(key);
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
				enabled: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
			},
			// facebook: {
			// 	clientId: env.FACEBOOK_CLIENT_ID,
			// 	clientSecret: env.FACEBOOK_CLIENT_SECRET,
			// 	enabled: !!(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET),
			// },
		},
		user: {
			additionalFields: {
				role: {
					type: ["user", "admin"],
					fieldName: "role", // the field name in the database
					required: false,
					defaultValue: "user", // the default role is `user`
					input: false, // don't allow user to set role
				},
			},
		},
		plugins: [expo(), openAPI()],
		trustedOrigins: [
			"veil://",
			"http://localhost:3000",
			"http://127.0.0.1:3000",

			// Development mode - Expo's exp:// scheme with local IP ranges
			...(env.NODE_ENV === "development"
				? [
						"exp://*/*", // Trust all Expo development URLs
						"exp://10.0.0.*:*/*", // Trust 10.0.0.x IP range
						"exp://192.168.*.*:*/*", // Trust 192.168.x.x IP range
						"exp://172.*.*.*:*/*", // Trust 172.x.x.x IP range
						"exp://localhost:*/*", // Trust localhost
					]
				: []),
		],
	});
}

// Type exports for Better Auth
export type Auth = Awaited<ReturnType<typeof createAuthConfig>>;
export type User = Auth["$Infer"]["Session"]["user"];
export type Session = Auth["$Infer"]["Session"]["session"];
