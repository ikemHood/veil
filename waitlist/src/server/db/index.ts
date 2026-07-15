import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "~/env";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let database: Database | undefined;

export function getDb() {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

	database ??= drizzle(neon(databaseUrl), { schema });
	return database;
}
