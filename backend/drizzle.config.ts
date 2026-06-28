import type { Config } from "drizzle-kit";

import { env } from "@/config";

export default {
	out: "./src/config/database/migrations",
	schema: "./src/config/database/schema/index.ts",
	breakpoints: true,
	verbose: true,
	strict: true,
	dialect: "postgresql",
	casing: "snake_case",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
} satisfies Config;
