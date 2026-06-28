import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import { env, logger } from "@/config";

interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: unknown;
	};
	timestamp: string;
}

interface PostgresError extends Error {
	code: string;
	detail?: string;
	constraint?: string;
	table?: string;
	column?: string;
	severity?: string;
}

/**
 * Check if error is a PostgreSQL error
 */
function isPostgresError(error: Error): error is PostgresError {
	return "code" in error && typeof (error as PostgresError).code === "string";
}

/**
 * Map PostgreSQL error codes to user-friendly messages
 */
function getPostgresErrorMessage(error: PostgresError): {
	code: string;
	message: string;
	statusCode: 400 | 404 | 409 | 500 | 503;
} {
	const { code, constraint, column } = error;

	switch (code) {
		case "23505": // unique_violation
			return {
				code: "DUPLICATE_ENTRY",
				message: constraint
					? `A record with this ${constraint.replace(/_/g, " ")} already exists`
					: "A record with these values already exists",
				statusCode: 409,
			};

		case "23503": // foreign_key_violation
			return {
				code: "FOREIGN_KEY_VIOLATION",
				message: "Cannot perform this operation due to related records",
				statusCode: 409,
			};

		case "23502": // not_null_violation
			return {
				code: "MISSING_REQUIRED_FIELD",
				message: column ? `The field '${column}' is required` : "A required field is missing",
				statusCode: 400,
			};

		case "23514": // check_violation
			return {
				code: "INVALID_VALUE",
				message: "The provided value does not meet requirements",
				statusCode: 400,
			};

		case "42P01": // undefined_table
			return {
				code: "RESOURCE_NOT_FOUND",
				message: "The requested resource does not exist",
				statusCode: 404,
			};

		case "42703": // undefined_column
			return {
				code: "INVALID_FIELD",
				message: "An invalid field was referenced",
				statusCode: 400,
			};

		case "08P01": // protocol_violation
		case "08003": // connection_does_not_exist
		case "08006": // connection_failure
			return {
				code: "DATABASE_CONNECTION_ERROR",
				message: "Database connection error. Please try again later",
				statusCode: 503,
			};

		default:
			return {
				code: "DATABASE_ERROR",
				message: "A database error occurred",
				statusCode: 500,
			};
	}
}

/**
 * Global error handler middleware
 * Handles different error types: HTTPException, ZodError, PostgreSQL errors, and generic errors
 */
export function errorHandlerMiddleware(error: Error, c: Context): Response {
	const timestamp = new Date().toISOString();

	// Log the error
	logger.error(
		{
			err: error,
			path: c.req.path,
			method: c.req.method,
		},
		"Error occurred",
	);

	// Handle Hono HTTPException
	if (error instanceof HTTPException) {
		const statusCode = error.status;
		const errorResponse: ErrorResponse = {
			success: false,
			error: {
				code: `HTTP_${statusCode}`,
				message: error.message || "An HTTP error occurred",
				details: error.cause,
			},
			timestamp,
		};

		return c.json(errorResponse, statusCode);
	}

	// Handle Zod Validation Errors
	if (error instanceof ZodError) {
		const errorResponse: ErrorResponse = {
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "Request validation failed",
				details: error.issues.map((err) => ({
					path: err.path.join("."),
					message: err.message,
					code: err.code,
				})),
			},
			timestamp,
		};

		return c.json(errorResponse, 400);
	}

	// Handle PostgreSQL Errors
	if (isPostgresError(error)) {
		const { code, message, statusCode } = getPostgresErrorMessage(error);

		const errorResponse: ErrorResponse = {
			success: false,
			error: {
				code,
				message,
				details:
					env.NODE_ENV === "development"
						? {
								pgCode: error.code,
								pgDetail: error.detail,
								constraint: error.constraint,
								table: error.table,
								column: error.column,
							}
						: undefined,
			},
			timestamp,
		};

		return c.json(errorResponse, statusCode);
	}

	// Handle generic errors
	const errorResponse: ErrorResponse = {
		success: false,
		error: {
			code: "INTERNAL_SERVER_ERROR",
			message: error.message || "An unexpected error occurred",
			details:
				env.NODE_ENV === "development"
					? {
							stack: error.stack,
							name: error.name,
						}
					: undefined,
		},
		timestamp,
	};

	return c.json(errorResponse, 500);
}
