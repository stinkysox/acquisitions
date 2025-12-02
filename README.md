# Acquisitions API – Docker & Neon Setup

This project is a Node.js/Express API that uses [Neon](https://neon.tech) as its PostgreSQL database.
The Docker setup supports two environments:

- **Development**: Local Docker Compose stack with the **Neon Local** proxy + app.
- **Production**: App container connects directly to **Neon Cloud** using `DATABASE_URL`.

---

## 1. Environment configuration

All configuration is driven by environment variables. Example values live in `.env.example`.

Two concrete files are used by Docker:

- `.env.development` – for local dev with Neon Local
- `.env.production` – for production (Neon Cloud)

> Both are ignored by Git via `.gitignore`.

### 1.1 Development (.env.development)

Key variables:

- `PORT` – HTTP port for the API (default `3000`).
- `NEON_API_KEY` – Neon API key.
- `NEON_PROJECT_ID` – Neon project ID.
- `PARENT_BRANCH_ID` – Neon branch ID to clone from when creating ephemeral branches.
- `NEON_LOCAL`, `NEON_LOCAL_HOST`, `NEON_LOCAL_PORT` – tell the app to talk to Neon Local.
- `DATABASE_URL` – Postgres-style connection string pointing at the Neon Local proxy, e.g.:

```bash
DATABASE_URL=postgres://neon:npg@neon-local:5432/acquisitions?sslmode=require
```

### 1.2 Production (.env.production)

Key variables:

- `PORT` – HTTP port for the API (default `3000`).
- `DATABASE_URL` – **Neon Cloud** connection URL from the Neon dashboard.

Example placeholder:

```bash
DATABASE_URL=postgres://user:password@your-project-id-region.aws.neon.tech/neondb?sslmode=require
```

No Neon Local–specific variables are required in production.

---

## 2. How the app connects to the database

The app uses `@neondatabase/serverless` + `drizzle-orm`. Connection logic is in `src/config/database.js`:

- It always reads `process.env.DATABASE_URL` as the connection string.
- When `NEON_LOCAL=true`, it additionally configures the Neon serverless driver to talk to the **Neon Local** proxy at `http://neon-local:5432/sql`.
- In production, `NEON_LOCAL` is not set, so the app connects directly to Neon Cloud.

This means you do **not** change code between environments; only env vars differ.

---

## 3. Running locally with Docker + Neon Local (development)

1. Copy `.env.example` to `.env.development` and fill in:
   - `NEON_API_KEY`
   - `NEON_PROJECT_ID`
   - `PARENT_BRANCH_ID`
   - Any local `ARCJET_KEY` or other secrets
2. Ensure `DATABASE_URL` in `.env.development` points at Neon Local, for example:

   ```bash
   DATABASE_URL=postgres://neon:npg@neon-local:5432/acquisitions?sslmode=require
   ```

3. Start the dev stack:

   ```bash
   docker compose -f docker-compose.dev.yml --env-file .env.development up --build
   ```

   This will:
   - Start the **Neon Local** container (`neon-local`) which:
     - Connects to your Neon project using `NEON_API_KEY` / `NEON_PROJECT_ID`.
     - Creates an **ephemeral branch** cloned from `PARENT_BRANCH_ID` when the container starts.
     - Deletes that branch when the container stops.
   - Start the `app` service running `npm run dev`, connecting to `DATABASE_URL`.

4. Access the API at `http://localhost:3000` (or your configured `PORT`).

To stop the stack:

```bash
docker compose -f docker-compose.dev.yml down
```

---

## 4. Running in production with Neon Cloud

In production, the app container connects directly to Neon Cloud.

### 4.1 Using Docker Compose in production

1. Create and fill in `.env.production` with your **production** Neon Cloud `DATABASE_URL` and any other secrets.
2. Build and start the production Compose stack:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
   ```

   - Only the `app` service runs.
   - `DATABASE_URL` points to your Neon Cloud database.

3. Access the API at `http://localhost:3000` or via your reverse proxy/load balancer.

To stop:

```bash
docker compose -f docker-compose.prod.yml down
```

### 4.2 Using other platforms (Kubernetes, ECS, etc.)

1. Build and push the app image:

   ```bash
   docker build -t your-registry/acquisitions:latest .
   docker push your-registry/acquisitions:latest
   ```

2. In your deployment manifests, set the `DATABASE_URL` environment variable to the Neon Cloud URL.
3. Run the container with `NODE_ENV=production` and your preferred `PORT`.

---

## 5. Dev vs Prod `DATABASE_URL` at a glance

- **Development** (`docker-compose.dev.yml` / `.env.development`):
  - `DATABASE_URL=postgres://neon:npg@neon-local:5432/acquisitions?sslmode=require`
  - `NEON_LOCAL=true` so the serverless driver talks to Neon Local.

- **Production** (`docker-compose.prod.yml` / `.env.production` or platform env):
  - `DATABASE_URL=postgres://user:password@your-project-id-region.aws.neon.tech/neondb?sslmode=require`
  - No Neon Local variables; the app connects directly to Neon Cloud.

This fulfills the separation between dev and prod while keeping the application code unchanged and fully driven by environment variables.
running rest cases
