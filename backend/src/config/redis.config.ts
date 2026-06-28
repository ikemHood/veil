import { createClient } from "redis";

import { env } from "@/config/environment.config";
import { logger } from "@/config/logger.config";

/**
 * Redis client configuration
 * Provides Redis connection with automatic reconnection and error handling
 */
const redisClient = createClient({
	url: env.REDIS_URL,
});

// Error handling
redisClient.on("error", (err) => {
	logger.error({ err }, "Redis client error");
});

redisClient.on("connect", () => {
	logger.info("Redis client connected");
});

redisClient.on("reconnecting", () => {
	logger.info("Redis client reconnecting");
});

redisClient.on("ready", () => {
	logger.info("Redis client ready");
});

/**
 * Connect to Redis
 * Should be called during application startup
 */
export const connectRedis = async (): Promise<void> => {
	if (!redisClient.isOpen) {
		await redisClient.connect();
	}
};

/**
 * Disconnect from Redis
 * Should be called during application shutdown
 */
export const disconnectRedis = async (): Promise<void> => {
	if (redisClient.isOpen) {
		await redisClient.quit();
	}
};

/**
 * Redis client instance
 * Use this to interact with Redis throughout the application
 */
export const redis = redisClient;
