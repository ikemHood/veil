import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified")
		.$defaultFn(() => false)
		.notNull(),
	image: text("image"),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").$defaultFn(
		() => /* @__PURE__ */ new Date(),
	),
	updatedAt: timestamp("updated_at").$defaultFn(
		() => /* @__PURE__ */ new Date(),
	),
});

export const userRelations = relations(user, ({ many }) => ({
	account: many(account),
	session: many(session),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const waitlistMember = pgTable(
	"waitlist_member",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		handle: text("handle").notNull(),
		normalizedHandle: text("normalized_handle").notNull(),
		referralCode: text("referral_code").notNull(),
		points: integer("points").notNull().default(0),
		joinedAt: timestamp("joined_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("waitlist_member_user_id_key").on(table.userId),
		uniqueIndex("waitlist_member_normalized_handle_key").on(
			table.normalizedHandle,
		),
		uniqueIndex("waitlist_member_referral_code_key").on(table.referralCode),
		index("waitlist_member_rank_idx").on(table.points, table.joinedAt),
	],
);

export const referral = pgTable(
	"referral",
	{
		id: text("id").primaryKey(),
		referrerMemberId: text("referrer_member_id")
			.notNull()
			.references(() => waitlistMember.id, { onDelete: "cascade" }),
		referredMemberId: text("referred_member_id")
			.notNull()
			.references(() => waitlistMember.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("referral_referred_member_id_key").on(table.referredMemberId),
		index("referral_referrer_member_id_idx").on(table.referrerMemberId),
	],
);

export const waitlistMemberRelations = relations(
	waitlistMember,
	({ one, many }) => ({
		user: one(user, {
			fields: [waitlistMember.userId],
			references: [user.id],
		}),
		referralsSent: many(referral, { relationName: "referrer" }),
		referralReceived: many(referral, { relationName: "referred" }),
	}),
);

export const referralRelations = relations(referral, ({ one }) => ({
	referrer: one(waitlistMember, {
		fields: [referral.referrerMemberId],
		references: [waitlistMember.id],
		relationName: "referrer",
	}),
	referred: one(waitlistMember, {
		fields: [referral.referredMemberId],
		references: [waitlistMember.id],
		relationName: "referred",
	}),
}));
