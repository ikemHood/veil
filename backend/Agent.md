# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-ready Hono.js backend API using TypeScript, PostgreSQL (via Drizzle ORM), and Better Auth for authentication. The application follows a layered architecture with middleware-based request processing.

## Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload (tsx watch)

# Building & Running
npm run build            # Compile TypeScript and resolve path aliases
npm start                # Run production build

# Code Quality
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without changes
npm run lint             # Lint and auto-fix with ESLint
npm run lint:check       # Lint without auto-fixing
npm run check            # Run both format and lint
npm run check:ci         # Check format and lint for CI (no fixes)

# Database (Drizzle)
npm run db:generate      # Generate migration files from schema
npm run db:migrate       # Apply migrations to database
npm run db:studio        # Open Drizzle Studio (database GUI)

# Docker
docker-compose up        # Start app + PostgreSQL in containers
docker-compose down      # Stop containers
```

## Architecture Overview

### Application Initialization Flow

The application bootstraps in this order (see `src/index.ts`):

1. Database connection (`db.$client.connect()`)
2. Auth configuration (`createAuthConfig()`)
3. Application creation (`createApp(auth)`)
4. Server start (`createServer().start(app)`)

### Middleware Order

Middleware order is critical and defined in `src/app.ts:29-50`:

1. **Metrics** - Prometheus metrics (must be first)
2. **Logger** - Request logging (pino)
3. **Security** - ETag and secure headers
4. **CORS** - Applied to `/api/*` routes
5. **Rate Limiting** - Request throttling
6. **Pretty JSON** - JSON formatting
7. **Auth** - Better Auth middleware (populates `c.get("user")` and `c.get("session")`)
8. **Routes** - Application routes
9. **404 Handler** - Not found responses
10. **Error Handler** - Global error handling (must be last)

### Route Structure

Routes follow a versioned API pattern:

- `/` - Root endpoint (API info)
- `/health` - Health check
- `/metrics` - Prometheus metrics
- `/api/auth/*` - Auth endpoints (Better Auth managed, unversioned)
- `/api/v1/*` - Versioned API routes (e.g., `/api/v1/todos`)

All routes are created through factory functions that accept dependencies (e.g., `createRoutes(auth)`).

### Authentication System

Uses Better Auth with Drizzle adapter:

- **Auth Middleware**: `authMiddleware(auth)` - Adds user/session to context
- **Protected Routes**: Use `requireAuth()` middleware to enforce authentication
- **Providers**: Email/password + optional OAuth (Google, Facebook)
- **User Roles**: `user` or `admin` (default: `user`, set via `additionalFields`)

Access authenticated user in routes:

```typescript
const user = c.get("user"); // User object or null
const session = c.get("session"); // Session object or null
```

### Database Architecture

- **ORM**: Drizzle with PostgreSQL
- **Connection**: Node-postgres (pg) pool
- **Schema Location**: `src/config/database/schema/`
- **Migrations**: Generated in `src/config/database/migrations/`
- **Naming**: Snake case (configured via `casing: "snake_case"`)

Database instance is exported from `src/config/database/db.config.ts` and includes:

- Schema auto-imported from `schema/index.ts`
- Client accessible via `db.$client` for raw queries/connection management

### Path Aliases

TypeScript uses `@/*` alias for `./src/*`:

- Import as: `import { logger } from "@/config/logger.config"`
- Configured in `tsconfig.json` and resolved with `tsc-alias` during build

### Environment Configuration

Environment variables are validated using `@t3-oss/env-core` (see `src/config/environment.config.ts`):

- **Required**: `DATABASE_URL`, `BETTER_AUTH_SECRET`
- **Optional**: OAuth credentials, `PORT`, `LOG_LEVEL`, `NODE_ENV`
- Validation happens at startup; missing required vars cause immediate failure

### Type System

- `src/core/types/app.types.ts` - Contains `AppEnv` type for Hono context
- Auth types exported from `src/config/auth.config.ts`: `Auth`, `User`, `Session`
- Context variables available: `user`, `session`, `logger`

## Adding New Features

### Adding a New Route

1. Create route file in `src/routes/v1/[feature].route.ts`
2. Export Hono instance: `const featureRoutes = new Hono<AppEnv>()`
3. Apply authentication if needed: `featureRoutes.use("*", requireAuth())`
4. Register in `src/routes/v1/index.ts` using `route()`

### Adding Database Schema

1. Create schema file in `src/config/database/schema/[table].schema.ts`
2. Export from `src/config/database/schema/index.ts`
3. Run `npm run db:generate` to create migration
4. Run `npm run db:migrate` to apply migration
5. Use Drizzle Studio (`npm run db:studio`) to verify

### Adding Middleware

1. Create middleware in `src/core/middlewares/[name].middleware.ts`
2. Export from `src/core/middlewares/index.ts`
3. Register in `src/app.ts` at appropriate position (order matters!)

## Docker Deployment

The Dockerfile uses multi-stage build:

- **Builder**: Installs all deps, builds TypeScript
- **Production**: Copies built files, installs prod deps only, runs as non-root user

Database runs in separate container with health checks. App waits for DB to be ready before starting.
