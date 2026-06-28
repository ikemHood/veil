import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "@/config/database/schema/auth.schema";

export const veilProfile = pgTable(
	"veil_profile",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		handle: text("handle").notNull(),
		walletAddress: text("wallet_address"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("veil_profile_user_id_idx").on(table.userId),
		uniqueIndex("veil_profile_handle_idx").on(table.handle),
		index("veil_profile_wallet_address_idx").on(table.walletAddress),
	],
);

export const veilProfileRelations = relations(veilProfile, ({ one }) => ({
	user: one(user, {
		fields: [veilProfile.userId],
		references: [user.id],
	}),
}));
