# Daily Report App

Daily Report App is a production-minded Next.js workspace for logging daily technical work, organizing it by date, exporting reports, and administering the platform through a dedicated admin console.

## Features

- User authentication with registration, login, logout, forgot password, and reset password
- Task CRUD with rich text notes, tags, statuses, attachments, bulk actions, history, and duplicate-previous-day flow
- Dashboard stats, search, filtering, sorting, exports, imports, print view, reminders, and announcements
- Admin dashboard for users, stats, content moderation, activity logs, config, health, and announcements
- Testing setup with Vitest and Playwright scaffolding
- Security hardening with middleware throttling, CSP/security headers, upload validation, and friendly error pages

## Tech Stack

- Next.js 14
- React 18
- TypeScript 5
- Prisma 6
- PostgreSQL
- NextAuth 5 beta
- Tailwind CSS
- Radix UI primitives
- TanStack Query
- Tiptap
- Vitest and Playwright

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

3. Generate Prisma client and prepare the database:

```bash
npm run db:generate
npx prisma db push
npm run db:seed
```

4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Docker Quick Start

Production-like stack:

```bash
docker compose up -d
```

Development override:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Available Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:coverage`
- `npm run test:e2e`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:push`
- `npm run db:seed`
- `npm run db:seed:production`
- `npm run backup:db`
- `npm run restore:db`

## Default Seed Credentials

Development seed users from `prisma/seed.ts`:

- Admin: `admin@example.com` / `admin123`
- User: `user@example.com` / `user123`

Change these immediately outside local development.

## Project Structure

- `src/app`: pages and API routes
- `src/components`: UI and feature components
- `src/lib`: business logic, validation, helpers, auth, uploads, exports/imports
- `prisma`: database schema, migrations, and seed scripts
- `docs`: API and operations documentation
- `scripts`: backup and restore helpers
- `.github/workflows`: CI, deploy, and backup automation

## API Documentation

OpenAPI reference: [docs/api/openapi.yaml](./docs/api/openapi.yaml)

## Operations

- Pre-deployment checklist: [docs/pre-deployment-checklist.md](./docs/pre-deployment-checklist.md)
- Architecture notes: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)

## Production Notes

- Use `.env.production` as a template for deployment platforms.
- Use `terraform/` to provision AWS RDS, S3 uploads, SSM parameters, and the runtime IAM policy for Amplify-compatible deployments.
- Set `UPLOAD_PROVIDER=s3` in production so avatars and attachments are stored outside the Amplify runtime filesystem.
- Export env vars from SSM with `AWS_REGION=us-east-1 npm run env:ssm:export -- /daily-report-app/production`.
- Run `npm run db:seed:production` only after setting `PRODUCTION_ADMIN_EMAIL` and `PRODUCTION_ADMIN_PASSWORD`.
- Schedule `scripts/backup.sh` daily or use the provided GitHub Actions backup workflow.
