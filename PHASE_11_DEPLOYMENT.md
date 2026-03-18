# Deployment, DevOps & Documentation

## Context

I am building a web application for writing and managing daily work reports. This document covers deployment, DevOps, and documentation.

**Already in place:** The complete application is built and tested — project setup, authentication, task CRUD, dashboard, search/filter, profile/settings/dark mode, advanced features, admin dashboard, export/import/reminders, testing, and security hardening.

Refer to `prompt.txt` for full project requirements.

## Goal

Prepare the application for production deployment. Set up Docker, CI/CD pipeline, API documentation, database backup strategy, and write comprehensive project documentation.

## What to Build

### 1. Docker Configuration

**Dockerfile:**

- Multi-stage build for optimal image size:
  - Stage 1: `deps` — install dependencies
  - Stage 2: `builder` — build the Next.js app
  - Stage 3: `runner` — production image with only necessary files
- Based on `node:20-alpine`
- Set proper environment variables
- Expose port 3000
- Health check endpoint
- Non-root user for security

**docker-compose.yml:**

- Services:
  - `app` — the Next.js application
  - `db` — PostgreSQL database
  - `adminer` (optional) — database admin UI for development
- Volumes:
  - PostgreSQL data persistence
  - Uploads directory persistence
- Environment variables from `.env` file
- Network configuration
- Restart policies

**docker-compose.dev.yml (override for development):**

- Hot reload with volume mounts
- Debug ports exposed
- Development environment variables

**Include:**

- `.dockerignore` file (exclude node_modules, .git, .env, etc.)
- Instructions for building and running with Docker

### 2. CI/CD Pipeline (GitHub Actions)

**`.github/workflows/ci.yml` — Runs on every PR:**

```yaml
Jobs:
1. lint:
  - Checkout code
  - Install dependencies
  - Run ESLint
  - Run TypeScript check (tsc --noEmit)

2. test:
  - Checkout code
  - Install dependencies
  - Set up test database (PostgreSQL service container)
  - Run Prisma migrations
  - Run unit + integration tests (Vitest)
  - Upload coverage report

3. e2e:
  - Checkout code
  - Install dependencies
  - Set up test database
  - Build the app
  - Run E2E tests (Playwright)
  - Upload Playwright report as artifact

4. build:
  - Checkout code
  - Install dependencies
  - Build the Next.js app
  - Verify build succeeds
```

**`.github/workflows/deploy.yml` — Runs on merge to main:**

```yaml
Jobs:
1. All CI checks (lint, test, e2e, build)
2. Deploy to production:
   - Option A (Vercel): trigger Vercel deployment
   - Option B (Docker): build Docker image, push to registry, deploy to server
3. Run database migrations on production
4. Post-deployment health check
```

**`.github/workflows/db-backup.yml` — Scheduled (daily):**

```yaml
Jobs:
1. Run daily database backup
   - pg_dump to a file
   - Upload to S3 or store in a backup location
   - Retain last 30 backups
   - Notify on failure
```

### 3. API Documentation

**Swagger / OpenAPI Spec:**

- Create an OpenAPI 3.0 specification file (`docs/api/openapi.yaml` or generate from code)
- Document all API routes:
  - Path, method, description
  - Request parameters (query, path, body)
  - Request body schema with examples
  - Response schemas with examples (success and error)
  - Authentication requirements
  - Rate limiting information
- Group endpoints by category:
  - Auth (`/api/auth/*`)
  - Tasks (`/api/tasks/*`)
  - Tags (`/api/tags/*`)
  - User Profile (`/api/user/*`)
  - Dashboard (`/api/dashboard/*`)
  - Admin (`/api/admin/*`)
  - Announcements (`/api/announcements/*`)
  - Export/Import (`/api/tasks/export`, `/api/tasks/import`)

**Swagger UI Page (optional):**

- Add a `/api/docs` page that renders the Swagger UI
- Use `swagger-ui-react` or `next-swagger-doc`
- Only accessible in development or to admin users

### 4. Database Backup & Recovery

**Backup Strategy:**

- Create a backup script (`scripts/backup.sh`):
  - Uses `pg_dump` to create a compressed backup
  - Filename includes timestamp: `backup_2026-03-16_120000.sql.gz`
  - Configurable backup directory
- Create a restore script (`scripts/restore.sh`):
  - Takes a backup file as argument
  - Restores the database from the backup
  - Confirmation prompt before restoring

**Documentation:**

- Document the backup/restore process in README
- Recommend backup frequency (daily for production)
- Point-in-time recovery instructions using PostgreSQL WAL (if applicable)

### 5. Environment Management

**Environment files:**

- `.env.example` — Complete with all variables, descriptions, and example values:

  ```env
  # Database
  DATABASE_URL=postgresql://user:password@localhost:5432/daily_reports

  # Authentication
  NEXTAUTH_SECRET=generate-a-secret-with-openssl-rand-base64-32
  NEXTAUTH_URL=http://localhost:3000

  # File Uploads
  UPLOAD_DIR=./uploads
  MAX_FILE_SIZE_MB=10

  # Email (optional — for reminders)
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_USER=
  SMTP_PASS=
  SMTP_FROM=noreply@dailyreports.app

  # App Config
  NODE_ENV=development
  ```

- `.env.development` — Development defaults
- `.env.production` — Production template (values set in deployment platform)
- `.env.test` — Test environment config

### 6. Project Documentation

**README.md — Complete rewrite:**

- Project name, description, and screenshots
- Features list (with checkmarks)
- Tech stack with version numbers
- Prerequisites (Node.js, PostgreSQL, etc.)
- Quick start guide:
  1. Clone the repository
  2. Install dependencies (`npm install`)
  3. Set up environment variables (copy `.env.example`)
  4. Set up the database (`npx prisma migrate dev`, `npx prisma db seed`)
  5. Run development server (`npm run dev`)
  6. Access at `http://localhost:3000`
- Docker quick start:
  1. `docker-compose up -d`
  2. Access at `http://localhost:3000`
- Available scripts (`npm run dev`, `npm run build`, `npm run test`, etc.)
- Project structure overview
- API documentation link
- Default credentials (admin and user)
- Contributing guidelines
- License

**ARCHITECTURE.md:**

- High-level system architecture description
- Database schema diagram (text-based or link to diagram)
- Authentication flow description
- Folder structure explanation
- Key design decisions and rationale

**CONTRIBUTING.md:**

- How to set up the development environment
- Coding standards and conventions
- Git workflow (branching strategy)
- How to write tests
- PR review process

### 7. Production Readiness Checks

**Create a pre-deployment checklist script or document:**

- [ ] All tests passing
- [ ] Build succeeds without errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings/errors
- [ ] Environment variables are set
- [ ] Database migrations are up to date
- [ ] Seed data is appropriate for production (no test users)
- [ ] Security headers are configured
- [ ] Rate limiting is active
- [ ] File upload directory exists and is writable
- [ ] SMTP is configured (or gracefully disabled)
- [ ] Admin user is created with a strong password
- [ ] `.env` is not committed to version control
- [ ] Error logging is configured
- [ ] Backup schedule is active

### 8. Production Seed Script

- Create `prisma/seed-production.ts`:
  - Creates only the initial admin user (with a secure default password that must be changed on first login)
  - Creates default tags
  - Creates default app config values
  - Does NOT create test data

### 9. Scripts

Create useful scripts in `scripts/`:

- `setup.sh` — Full development setup (install deps, copy env, migrate, seed, start)
- `backup.sh` — Database backup
- `restore.sh` — Database restore
- `reset-db.sh` — Drop and recreate database with seed (development only)
- `create-admin.sh` — Create a new admin user from command line

## Technical Requirements

- Docker images should be as small as possible (use alpine, multi-stage builds)
- CI pipeline should fail fast (lint first, then test, then build)
- All secrets must be in environment variables, never hardcoded
- Documentation should be clear enough for a new developer to set up the project from scratch
- Scripts should work on both macOS and Linux

## Expected Deliverables

- Dockerfile + docker-compose.yml (production and development)
- CI/CD pipeline (GitHub Actions) for lint, test, build, deploy
- OpenAPI/Swagger API documentation
- Database backup and restore scripts
- Complete `.env.example` with all variables documented
- README.md with full setup instructions
- ARCHITECTURE.md with system design overview
- CONTRIBUTING.md with development guidelines
- Production seed script
- Utility scripts (setup, backup, restore, reset)
- Pre-deployment checklist

## Final Notes

This is the last phase. After completing this phase, the application should be fully production-ready:

- Clean, well-documented codebase
- Comprehensive test coverage
- Secure and hardened
- Easy to deploy with Docker or Vercel
- Easy for new developers to onboard
- Professional documentation
