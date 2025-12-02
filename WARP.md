# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This is a Node.js/Express HTTP API backed by PostgreSQL on Neon, using the `@neondatabase/serverless` HTTP driver and `drizzle-orm` for database access. The app is designed to run primarily in Docker, with:
- A development stack that uses the Neon Local proxy and ephemeral branches
- A production stack that connects directly to Neon Cloud via `DATABASE_URL`

Environment-driven configuration is central:
- Example variables live in `.env.example`
- `.env.development` is used for Docker-based local development with Neon Local
- `.env.production` is used for Docker-based production deployments

## Core commands

All commands are run from the repository root.

### Dependency installation

- Install dependencies for local development:
  - `npm install`
- Clean, reproducible install (used in Dockerfile):
  - `npm ci`

### Application lifecycle

- Run the app in development mode (watch mode, non-Docker):
  - `npm run dev`
- Run the app in production mode (non-Docker):
  - `npm start`

The Node entrypoint is `src/index.js`, which loads environment variables and starts the HTTP server in `src/server.js`. `src/app.js` defines the Express app (middlewares and routes) and is imported by `src/server.js`.

### Docker + Neon workflows

These are the primary ways to work with the app as described in `README.md`.

**Local development (Neon Local + Docker Compose):**
- Prepare environment:
  - Copy `.env.example` to `.env.development` and fill in Neon variables (`NEON_API_KEY`, `NEON_PROJECT_ID`, `PARENT_BRANCH_ID`, `DATABASE_URL` pointing at `neon-local`, etc.)
- Start the full dev stack (helper script via npm):
  - `npm run dev:docker`
  - This runs `scripts/dev.sh`, which:
    - Verifies `.env.development` and Docker are present
    - Ensures `.neon_local/` exists and is ignored by git
    - Runs database migrations (`npm run db:migrate`)
    - Starts `docker-compose.dev.yml` (Neon Local + app in development mode)
- Direct Docker Compose invocation (as documented):
  - `docker compose -f docker-compose.dev.yml --env-file .env.development up --build`
  - Stop:
    - `docker compose -f docker-compose.dev.yml down`

**Production (Neon Cloud + Docker Compose):**
- Prepare environment:
  - Create `.env.production` with your production `DATABASE_URL` from Neon and any other required env vars
- Start the production stack (helper script via npm):
  - `npm run prod:docker`
  - This runs `scripts/prod.sh`, which:
    - Verifies `.env.production` and Docker
    - Starts `docker-compose.prod.yml` in detached mode
    - Applies migrations with `npm run db:migrate`
- Direct Docker Compose invocation:
  - Start: `docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d`
  - Stop: `docker compose -f docker-compose.prod.yml down`

The Dockerfile defines a multi-stage build:
- `development` stage runs `npm run dev`
- `production` stage runs `npm start`

### Linting and formatting

Configured via `eslint.config.js` and Prettier (invoked via npm scripts).

- Lint the entire project:
  - `npm run lint`
- Lint and auto-fix:
  - `npm run lint:fix`
- Format code with Prettier:
  - `npm run format`
- Check formatting without writing changes:
  - `npm run format:check`

ESLint notes:
- Uses `@eslint/js` recommended rules and custom rules (2-space indent, single quotes, semicolons, no unused vars, etc.)
- Test-specific globals are preconfigured for files under `tests/**/*.js`, but no tests or test runner are currently wired up.

### Database and migrations (Drizzle ORM)

Drizzle is configured in `drizzle.config.js`:
- Schema: `./src/models/*.js`
- Output directory: `./drizzle/`
- Dialect: PostgreSQL
- Credentials: `process.env.DATABASE_URL`

Common Drizzle CLI commands (via npm scripts):
- Generate migrations based on the schema:
  - `npm run db:generate`  (runs `drizzle-kit generate`)
- Apply migrations to the database defined by `DATABASE_URL`:
  - `npm run db:migrate`   (runs `drizzle-kit migrate`)
- Open Drizzle Studio:
  - `npm run db:studio`    (runs `drizzle-kit studio`)

The main user schema lives in `src/models/user.model.js`.

### Testing

There is currently **no** test runner or `npm test` script defined. ESLint is preconfigured to recognize Jest-style globals in `tests/**/*.js`, but any test framework (e.g., Jest, Vitest) and corresponding npm scripts will need to be added before tests can be run.

## High-level architecture

### Express application layout

The app follows a layered Express architecture, using Node.js ESM and `package.json` import aliases:

- Entry and server
  - `src/index.js` loads environment variables and `src/server.js`.
  - `src/server.js` initializes the HTTP server by importing the Express app from `src/app.js` and calling `app.listen(PORT)`.

- Application setup (`src/app.js`)
  - Creates the Express instance
  - Registers global middlewares:
    - `helmet` for security headers
    - `cors` for cross-origin requests
    - `express.json` / `express.urlencoded` for body parsing
    - `cookie-parser` for HTTP cookies
    - Custom rate-limiting and bot-protection middleware from `#middleware/security.middleware.js`
    - `morgan` HTTP request logging wired into the central logger
  - Defines basic health and info routes:
    - `GET /` – simple text response and log statement
    - `GET /health` – JSON health probe (used by Docker health checks)
    - `GET /api` – API info endpoint
  - Mounts API routers:
    - `app.use('/api/auth', authRoutes)`
    - `app.use('/api/users', userRoutes)`

### Import aliases and directory responsibilities

Import aliases are defined in `package.json` under the `imports` field, all resolving under `src/`:
- `#config/*` → `src/config/*` – infrastructure configuration and integration clients
  - `database.js`: configures Neon and Drizzle based on `DATABASE_URL`; in development it uses the Neon Local HTTP endpoint (`http://neon-local:5432/sql`) and related `neonConfig` flags
  - `logger.js`: central `winston` logger with file transports and optional console transport in non-production environments
  - `arcjet.js`: Arcjet client configuration (`shield`, `detectBot`, `slidingWindow`) using `process.env.ARCJET_KEY`
- `#controllers/*` → `src/controllers/*` – HTTP controllers responsible for validating input, orchestrating services, and shaping responses
  - `auth.controller.js`: handles sign-up, sign-in, and sign-out flows
  - `users.controllers.js`: handles fetching user data via services
- `#services/*` → `src/services/*` – business logic and database access built on Drizzle
  - `auth.service.js`: password hashing and comparison, user creation, and authentication (queries via `db` and `users` schema)
  - `users.services.js`: read-only access to the users table
- `#models/*` → `src/models/*` – database schema definitions
  - `user.model.js`: Drizzle `pgTable` describing the `users` table (id, name, email, hashed password, role, timestamps)
- `#routes/*` → `src/routes/*` – Express routers that map paths to controllers
  - `auth.routes.js`: `/api/auth` endpoints (`/sign-up`, `/sign-in`, `/sign-out`)
  - `users.route.js`: `/api/users` endpoints (CRUD-style placeholders and full user list)
- `#middleware/*` → `src/middleware/*` – cross-cutting Express middlewares
  - `security.middleware.js`: Arcjet-based rate limiting, bot detection, and shield enforcement with behavior depending on `req.user.role` (`guest`/`user`/`admin`)
- `#utils/*` → `src/utils/*` – shared utilities
  - `cookies.js`: opinionated helpers for setting/clearing cookies with secure defaults (HTTP-only, secure in production, strict same-site)
  - `format.js`: helper to format Zod validation errors into human-readable strings
  - `jwt.js`: JWT signing and verification with logging on error
- `#validations/*` → `src/validations/*` – Zod schemas for request validation
  - `auth.validation.js`: schemas for sign-up and sign-in payloads

This alias-based layout is important when adding new modules: prefer placing code in the appropriate directory and importing via the `#...` alias to keep the structure consistent.

### Logging and observability

- Structured logging is centralized in `src/config/logger.js` using `winston`:
  - File transports for `logs/error.log` and `logs/combined.log`
  - Console logging with colors in non-production environments
- `morgan` is configured in `src/app.js` to log HTTP requests through this logger.
- Health endpoints (`/health`) are used by Docker health checks in both dev and prod Compose files.

### Security and rate limiting

Security concerns are separated into dedicated modules:
- `src/config/arcjet.js` defines a base Arcjet client with:
  - `shield` rule (general protections)
  - `detectBot` rule (with allowances for search engines and preview bots)
  - A `slidingWindow` rate limit rule
- `src/middleware/security.middleware.js` wraps Arcjet to apply role-based limits and decisions:
  - Different per-minute limits for `guest`, `user`, and `admin`
  - Blocks bots, rate limit violations, and shield-denied requests with appropriate HTTP status codes (403/429)

### Authentication and authorization flow

High-level auth flow for the REST API:
- Sign-up (`POST /api/auth/sign-up`):
  - Validates request with `signUpSchema` (Zod)
  - Uses `createUser` service to persist the user (with bcrypt password hashing)
  - Issues a JWT (`jwttoken.sign`) containing id/email/role
  - Stores token in an HTTP-only cookie via `cookies.set`
- Sign-in (`POST /api/auth/sign-in`):
  - Validates request with `signInSchema`
  - Uses `authenticateUser` to verify credentials, including bcrypt password comparison
  - Issues JWT and stores it in a cookie
- Sign-out (`POST /api/auth/sign-out`):
  - Clears the auth cookie via `cookies.clear`

There is currently no dedicated authorization middleware enforcing role-based access control on routes; role is used primarily in rate limiting (`security.middleware.js`).
