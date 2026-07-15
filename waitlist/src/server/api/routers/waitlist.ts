import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { referral, user, waitlistMember } from "~/server/db/schema";
import { sendReferralRewardEmail, sendWelcomeEmail } from "~/server/email";

const handleSchema = z
	.string()
	.trim()
	.toLowerCase()
	.regex(/^[a-z0-9_]{3,20}$/, {
		message: "Use 3–20 lowercase letters, numbers, or underscores.",
	});

const leaderboardLimitSchema = z.object({
	limit: z.number().int().min(1).max(50).default(10),
});

const handleAvailabilitySchema = z.object({
	handle: z.string().trim().toLowerCase(),
});

function getCookie(headers: Headers, name: string) {
	const cookie = headers.get("cookie");
	if (!cookie) return undefined;

	return cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${name}=`))
		?.slice(name.length + 1);
}

function maskHandle(handle: string) {
	if (handle.length <= 2) return "••";
	return `${handle.slice(0, Math.min(4, handle.length - 2))}••`;
}

function makeReferralCode() {
	return crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
}

async function getPosition(
	db: ReturnType<typeof import("~/server/db").getDb>,
	member: { id: string; points: number; joinedAt: Date },
) {
	const [ahead] = await db
		.select({ total: count() })
		.from(waitlistMember)
		.where(
			or(
				gt(waitlistMember.points, member.points),
				and(
					eq(waitlistMember.points, member.points),
					or(
						lt(waitlistMember.joinedAt, member.joinedAt),
						and(
							eq(waitlistMember.joinedAt, member.joinedAt),
							lt(waitlistMember.id, member.id),
						),
					),
				),
			),
		);

	return Number(ahead?.total ?? 0) + 1;
}

export const waitlistRouter = createTRPCRouter({
	handleAvailability: publicProcedure
		.input(handleAvailabilitySchema)
		.query(async ({ ctx, input }) => {
			const parsedHandle = handleSchema.safeParse(input.handle);
			if (!parsedHandle.success) {
				return {
					status: "invalid" as const,
					message: "Use 3–20 lowercase letters, numbers, or underscores.",
				};
			}

			const existing = await ctx.db.query.waitlistMember.findFirst({
				columns: { id: true },
				where: eq(waitlistMember.normalizedHandle, parsedHandle.data),
			});

			return existing
				? { status: "taken" as const, message: "That handle is already taken." }
				: { status: "available" as const, message: "Handle available." };
		}),

	leaderboard: publicProcedure
		.input(leaderboardLimitSchema)
		.query(async ({ ctx, input }) => {
			const members = await ctx.db
				.select({
					id: waitlistMember.id,
					handle: waitlistMember.handle,
					points: waitlistMember.points,
				})
				.from(waitlistMember)
				.orderBy(
					desc(waitlistMember.points),
					asc(waitlistMember.joinedAt),
					asc(waitlistMember.id),
				)
				.limit(input.limit);

			return members.map((member, index) => ({
				rank: index + 1,
				handle: maskHandle(member.handle),
				points: member.points,
			}));
		}),

	me: protectedProcedure.query(async ({ ctx }) => {
		const member = await ctx.db.query.waitlistMember.findFirst({
			where: eq(waitlistMember.userId, ctx.session.user.id),
		});

		if (!member) return null;

		return {
			...member,
			position: await getPosition(ctx.db, member),
		};
	}),

	neighborhood: protectedProcedure.query(async ({ ctx }) => {
		const members = await ctx.db
			.select({
				id: waitlistMember.id,
				userId: waitlistMember.userId,
				handle: waitlistMember.handle,
				points: waitlistMember.points,
			})
			.from(waitlistMember)
			.orderBy(
				desc(waitlistMember.points),
				asc(waitlistMember.joinedAt),
				asc(waitlistMember.id),
			);

		const currentIndex = members.findIndex(
			(member) => member.userId === ctx.session.user.id,
		);
		if (currentIndex === -1) return [];

		return members
			.slice(Math.max(0, currentIndex - 2), currentIndex + 3)
			.map((member, index) => ({
				rank: Math.max(0, currentIndex - 2) + index + 1,
				handle:
					member.userId === ctx.session.user.id
						? member.handle
						: maskHandle(member.handle),
				points: member.points,
				isYou: member.userId === ctx.session.user.id,
			}));
	}),

	claimHandle: protectedProcedure
		.input(z.object({ handle: handleSchema }))
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db.query.waitlistMember.findFirst({
				where: eq(waitlistMember.userId, ctx.session.user.id),
			});
			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "You already have a waitlist place.",
				});
			}

			const referrerCode = getCookie(ctx.headers, "veil_ref");
			const memberId = crypto.randomUUID();
			const referralCode = makeReferralCode();
			const now = new Date();
			const baseUrl = env.BETTER_AUTH_URL;
			if (!baseUrl) throw new Error("BETTER_AUTH_URL is not configured.");

			try {
				const result = await ctx.db.transaction(async (tx) => {
					const [handleTaken] = await tx
						.select({ id: waitlistMember.id })
						.from(waitlistMember)
						.where(eq(waitlistMember.normalizedHandle, input.handle))
						.limit(1);

					if (handleTaken) {
						throw new TRPCError({
							code: "CONFLICT",
							message: "That handle is already taken.",
						});
					}

					const [member] = await tx
						.insert(waitlistMember)
						.values({
							id: memberId,
							userId: ctx.session.user.id,
							handle: input.handle,
							normalizedHandle: input.handle,
							referralCode,
							joinedAt: now,
						})
						.returning();

					if (!member) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

					let reward:
						| {
								id: string;
								email: string;
								handle: string;
						  }
						| undefined;

					if (referrerCode) {
						const [referrer] = await tx
							.select({
								id: waitlistMember.id,
								userId: waitlistMember.userId,
								email: user.email,
							})
							.from(waitlistMember)
							.innerJoin(user, eq(user.id, waitlistMember.userId))
							.where(eq(waitlistMember.referralCode, referrerCode))
							.limit(1);

						if (referrer && referrer.userId !== ctx.session.user.id) {
							const referralId = crypto.randomUUID();
							await tx.insert(referral).values({
								id: referralId,
								referrerMemberId: referrer.id,
								referredMemberId: member.id,
							});
							await tx
								.update(waitlistMember)
								.set({ points: sql`${waitlistMember.points} + 1` })
								.where(eq(waitlistMember.id, referrer.id));

							reward = {
								id: referralId,
								email: referrer.email,
								handle: input.handle,
							};
						}
					}

					return { member, reward };
				});

				const position = await getPosition(ctx.db, result.member);
				const dashboardUrl = new URL("/dashboard", baseUrl).toString();

				const jobs = [
					sendWelcomeEmail({
						email: ctx.session.user.email,
						handle: result.member.handle,
						position,
						dashboardUrl,
						memberId: result.member.id,
					}),
				];

				if (result.reward) {
					jobs.push(
						sendReferralRewardEmail({
							email: result.reward.email,
							handle: result.reward.handle,
							dashboardUrl,
							referralId: result.reward.id,
						}),
					);
				}

				await Promise.allSettled(jobs);

				return { handle: result.member.handle, position };
			} catch (error) {
				if (error instanceof TRPCError) throw error;

				const databaseError = error as { code?: string };
				if (databaseError.code === "23505") {
					throw new TRPCError({
						code: "CONFLICT",
						message:
							"That handle or referral code is already in use. Try again.",
					});
				}
				throw error;
			}
		}),
});
