import { serve } from "@hono/node-server";
import type { Hono } from "hono";

import { closeDatabasePool, disconnectRedis, env, logger } from "@/config";
import type { AppEnv } from "@/core/types/app.types";

type ServerInstance = ReturnType<typeof serve>;

/**
 * Server lifecycle manager
 * Handles server startup, shutdown, and graceful termination
 */
export class Server {
	private server: ServerInstance | null = null;
	private isShuttingDown = false;

	/**
	 * Starts the HTTP server
	 * @param app - Hono application instance
	 */
	start(app: Hono<AppEnv>): void {
		this.server = serve({
			fetch: app.fetch,
			port: env.PORT,
		});

		logger.info(`🚀 Server started on http://localhost:${env.PORT}`);
		logger.info(`📊 Metrics available at http://localhost:${env.PORT}/metrics`);
		logger.info(`🏥 Health check at http://localhost:${env.PORT}/health`);
		logger.info(`📚 API v1 at http://localhost:${env.PORT}/api/v1`);

		this.setupGracefulShutdown();
	}

	/**
	 * Sets up graceful shutdown handlers
	 * Ensures clean shutdown on SIGINT and SIGTERM
	 */
	private setupGracefulShutdown(): void {
		const shutdown = async (signal: string) => {
			// Prevent multiple shutdown attempts
			if (this.isShuttingDown) {
				logger.info(`⏭️  Shutdown already in progress, ignoring ${signal}`);
				return;
			}

			this.isShuttingDown = true;
			logger.info(`\n⚠️  ${signal} received, starting graceful shutdown...`);

			// Force exit if shutdown takes too long
			const shutdownTimeout = setTimeout(() => {
				logger.error("❌ Graceful shutdown timeout exceeded, forcing exit");
				process.exit(1);
			}, env.SHUTDOWN_TIMEOUT_MS);

			try {
				// Close server
				if (this.server) {
					this.server.close();
					logger.info("✅ Server closed");
				}

				// Disconnect Redis
				await disconnectRedis();
				logger.info("✅ Redis disconnected");

				// Disconnect database
				await closeDatabasePool();
				logger.info("✅ Database pool closed");

				// Clear timeout since shutdown completed successfully
				clearTimeout(shutdownTimeout);

				logger.info("✅ Graceful shutdown completed");
				process.exit(0);
			} catch (error) {
				clearTimeout(shutdownTimeout);
				logger.error({ err: error }, "❌ Error during shutdown");
				process.exit(1);
			}
		};

		// Handle shutdown signals
		process.on("SIGINT", () => {
			shutdown("SIGINT").catch((error) => {
				logger.error({ err: error }, "Error during SIGINT shutdown");
				process.exit(1);
			});
		});

		process.on("SIGTERM", () => {
			shutdown("SIGTERM").catch((error) => {
				logger.error({ err: error }, "Error during SIGTERM shutdown");
				process.exit(1);
			});
		});

		// Handle uncaught errors
		process.on("uncaughtException", (error) => {
			logger.error({ err: error }, "❌ Uncaught Exception");
			shutdown("uncaughtException").catch((err) => {
				logger.error({ err }, "Error during uncaughtException shutdown");
				process.exit(1);
			});
		});

		process.on("unhandledRejection", (reason, promise) => {
			logger.error({ reason, promise }, "❌ Unhandled Rejection");
			shutdown("unhandledRejection").catch((error) => {
				logger.error({ err: error }, "Error during unhandledRejection shutdown");
				process.exit(1);
			});
		});
	}
}

/**
 * Creates and returns a new server instance
 */
export function createServer(): Server {
	return new Server();
}
