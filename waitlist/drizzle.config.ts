import type { Config } from "drizzle-kit";

export default {
	schema: "./src/server/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url:
			process.env.DATABASE_URL ??
			"postgresql://postgres:password@localhost:5432/waitlist",
	},
} satisfies Config;
