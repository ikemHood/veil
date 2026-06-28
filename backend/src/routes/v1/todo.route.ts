import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { logger } from "@/config/logger.config";
import { requireAuth } from "@/core/middlewares";
import type { AppEnv } from "@/core/types/app.types";

/**
 * Todo routes
 * All routes require authentication
 */
const todoRoutes = new Hono<AppEnv>();

// Apply authentication middleware to all todo routes
todoRoutes.use("*", requireAuth());

/**
 * GET /todos - Get all todos for the authenticated user
 */
todoRoutes.get("/", async (c) => {
	try {
		const user = c.get("user");
		const session = c.get("session");
		if (!user?.id || !session?.id) {
			return c.json(
				{
					success: false,
					error: "Unauthorized",
					message: "User ID not found",
				},
				401,
			);
		}
		return c.json({ userId: user.id, sessionId: session.id, success: true, data: [] });
	} catch (error) {
		logger.error({ err: error }, "Failed to fetch todos");
		return c.json(
			{
				success: false,
				error: "Internal Server Error",
				message: "Failed to fetch todos",
			},
			500,
		);
	}
});

/**
 * GET /todos/:id - Get a specific todo by ID
 */
todoRoutes.get("/:id", zValidator("param", z.object({ id: z.string() })), async (c) => {
	try {
		const user = c.get("user");
		if (!user?.id) {
			return c.json(
				{
					success: false,
					error: "Unauthorized",
					message: "User ID not found",
				},
				401,
			);
		}

		const { id } = c.req.valid("param");

		return c.json({ id, success: true, data: [], message: "Todo fetched successfully" });
	} catch (error) {
		logger.error({ err: error }, "Failed to fetch todo");
		return c.json(
			{
				success: false,
				error: "Internal Server Error",
				message: "Failed to fetch todo",
			},
			500,
		);
	}
});

/**
 * POST /todos - Create a new todo
 */
todoRoutes.post(
	"/",
	zValidator("json", z.object({ title: z.string(), description: z.string() })),
	async (c) => {
		try {
			const user = c.get("user");
			if (!user?.id) {
				return c.json(
					{
						success: false,
						error: "Unauthorized",
						message: "User ID not found",
					},
					401,
				);
			}

			const body = c.req.valid("json");
			return c.json({ ...body, success: true, data: [], message: "Todo created successfully" });
		} catch (error) {
			logger.error({ err: error }, "Failed to create todo");
			return c.json(
				{
					success: false,
					error: "Internal Server Error",
					message: "Failed to create todo",
				},
				500,
			);
		}
	},
);

/**
 * PATCH /todos/:id - Update a todo
 */
todoRoutes.patch(
	"/:id",
	zValidator("param", z.object({ id: z.string() })),
	zValidator("json", z.object({ title: z.string(), description: z.string() })),
	async (c) => {
		try {
			const user = c.get("user");
			if (!user?.id) {
				return c.json(
					{
						success: false,
						error: "Unauthorized",
						message: "User ID not found",
					},
					401,
				);
			}

			const { id } = c.req.valid("param");
			const body = c.req.valid("json");
			return c.json({ ...body, id, success: true, data: [], message: "Todo updated successfully" });
		} catch (error) {
			logger.error({ err: error }, "Failed to update todo");
			return c.json(
				{
					success: false,
					error: "Internal Server Error",
					message: "Failed to update todo",
				},
				500,
			);
		}
	},
);

/**
 * DELETE /todos/:id - Delete a todo
 */
todoRoutes.delete("/:id", zValidator("param", z.object({ id: z.string() })), async (c) => {
	try {
		const user = c.get("user");
		if (!user?.id) {
			return c.json(
				{
					success: false,
					error: "Unauthorized",
					message: "User ID not found",
				},
				401,
			);
		}

		const { id } = c.req.valid("param");
		return c.json({ id, success: true, data: [], message: "Todo deleted successfully" });
	} catch (error) {
		logger.error({ err: error }, "Failed to delete todo");
		return c.json(
			{
				success: false,
				error: "Internal Server Error",
				message: "Failed to delete todo",
			},
			500,
		);
	}
});

todoRoutes.post("/:id/toggle", zValidator("param", z.object({ id: z.string() })), async (c) => {
	try {
		const user = c.get("user");
		if (!user?.id) {
			return c.json(
				{
					success: false,
					error: "Unauthorized",
					message: "User ID not found",
				},
				401,
			);
		}

		const { id } = c.req.valid("param");
		return c.json({ id, success: true, data: [], message: "Todo completion toggled successfully" });
	} catch (error) {
		logger.error({ err: error }, "Failed to toggle todo");
		return c.json(
			{
				success: false,
				error: "Internal Server Error",
				message: "Failed to toggle todo",
			},
			500,
		);
	}
});

/**
 * DELETE /todos/completed - Delete all completed todos
 */
todoRoutes.delete("/completed/all", async (c) => {
	try {
		const user = c.get("user");
		if (!user?.id) {
			return c.json(
				{
					success: false,
					error: "Unauthorized",
					message: "User ID not found",
				},
				401,
			);
		}

		return c.json({ success: true, data: [], message: "Completed todos deleted successfully" });
	} catch (error) {
		logger.error({ err: error }, "Failed to delete completed todos");
		return c.json(
			{
				success: false,
				error: "Internal Server Error",
				message: "Failed to delete completed todos",
			},
			500,
		);
	}
});

export default todoRoutes;
