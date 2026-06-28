/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { zValidator } from "@hono/zod-validator";
import { and, eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db, logger } from "@/config";
import { veilProfile } from "@/config/database/schema";
import { requireAuth } from "@/core/middlewares";
import type { AppEnv } from "@/core/types/app.types";

const veilRoutes = new Hono<AppEnv>();

const handleSchema = z
	.string()
	.min(3)
	.max(18)
	.regex(/^[a-z0-9._-]+$/)
	.transform((value) => value.toLowerCase());

const profileBodySchema = z.object({
	handle: handleSchema,
	walletAddress: z.string().min(10).max(128).optional(),
});

veilRoutes.get(
	"/resolve/:handle",
	zValidator("param", z.object({ handle: handleSchema })),
	async (c) => {
		const { handle } = c.req.valid("param");
		const [profile] = await db
			.select({
				handle: veilProfile.handle,
				walletAddress: veilProfile.walletAddress,
			})
			.from(veilProfile)
			.where(eq(veilProfile.handle, handle))
			.limit(1);

		if (!profile) {
			return c.json({ success: false, error: "Handle not found" }, 404);
		}

		return c.json({ success: true, data: profile });
	},
);

veilRoutes.use("*", requireAuth());

veilRoutes.get("/profile", async (c) => {
	const user = c.get("user");
	if (!user?.id) return c.json({ success: false, error: "Unauthorized" }, 401);

	const [profile] = await db
		.select()
		.from(veilProfile)
		.where(eq(veilProfile.userId, user.id))
		.limit(1);
	return c.json({ success: true, data: profile ?? null });
});

veilRoutes.post("/profile", zValidator("json", profileBodySchema), async (c) => {
	try {
		const user = c.get("user");
		if (!user?.id) return c.json({ success: false, error: "Unauthorized" }, 401);

		const body = c.req.valid("json");
		const [taken] = await db
			.select({ id: veilProfile.id })
			.from(veilProfile)
			.where(and(eq(veilProfile.handle, body.handle), ne(veilProfile.userId, user.id)))
			.limit(1);

		if (taken) return c.json({ success: false, error: "Handle already claimed" }, 409);

		const id = `veil_${user.id}`;
		const [profile] = await db
			.insert(veilProfile)
			.values({
				id,
				userId: user.id,
				handle: body.handle,
				walletAddress: body.walletAddress,
			})
			.onConflictDoUpdate({
				target: veilProfile.userId,
				set: {
					handle: body.handle,
					walletAddress: body.walletAddress,
					updatedAt: new Date(),
				},
			})
			.returning();

		return c.json({ success: true, data: profile });
	} catch (error) {
		logger.error({ err: error }, "Failed to upsert Veil profile");
		return c.json({ success: false, error: "Failed to save profile" }, 500);
	}
});

export default veilRoutes;
