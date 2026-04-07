# Daily Report App

![platform](https://img.shields.io/badge/platform-Web-blue)
![framework](https://img.shields.io/badge/framework-Next.js%2014-black)
![database](https://img.shields.io/badge/database-PostgreSQL-336791)
![auth](https://img.shields.io/badge/auth-NextAuth%20v5%20beta-7C3AED)

> **A production-minded daily work reporting platform for teams that need structured task logs, exports, reporting, and admin oversight.**

Daily Report App is a full-stack Next.js application for recording daily technical work, organizing it by date, tracking progress over time, and turning those entries into useful operational reports. It combines a user-facing reporting workflow with an admin console, security hardening, import/export tools, and deployment support.

This is more than a basic notes app. It is designed as an internal productivity system with authentication, task history, attachments, analytics, announcements, reminders, and production-oriented deployment workflows.

---

## Highlights

- **Authentication flows** with registration, login, logout, forgot password, and reset password
- **Daily task logging** with date-based organization, ticket metadata, rich content, and statuses
- **Attachments and tags** for richer report context
- **Task history tracking** for auditability and change visibility
- **Dashboard analytics** with stats and activity charts
- **Search, filtering, sorting, and bulk workflows**
- **Export, import, and print support** for reports and task records
- **Duplicate previous day workflow** to speed up recurring reporting
- **Admin console** for users, configuration, activity logs, announcements, health, and moderation-like controls
- **Security-focused middleware** with throttling, CSP, upload validation, and safer defaults
- **Production tooling** for Docker, backups, Terraform, GHCR image publishing, and environment export

---

## Core Product Areas

### User-facing experience

- Dashboard overview
- Daily task management
- History view
- Reports page
- Settings
- Print-friendly report flow

### Authentication

- Register
- Login
- Forgot password
- Reset password

### Admin experience

- Admin overview
- User management
- Activity logs
- Content and announcements
- App configuration
- Health/status monitoring

---

## Tech Stack

| Area | Technology |
|------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth v5 beta |
| Database | PostgreSQL |
| ORM | Prisma |
| Forms and validation | React Hook Form, Zod |
| UI primitives | Radix UI |
| Client state | TanStack Query |
| Rich text | Tiptap |
| Charts | Recharts |
| Email | Nodemailer |
| Testing | Vitest, Playwright |
| Deployment | Docker, GitHub Actions, Terraform |

---

## Quick Start

```bash
git clone <your-repo-url>
cd daily-report-app
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Start from [`.env.example`](/home/fatemeh/Desktop/AI-Projects/daily-report-app/.env.example).

Important variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Primary auth secret for NextAuth v5 |
| `NEXTAUTH_SECRET` | Compatibility secret |
| `AUTH_URL` | Base URL for auth callbacks |
| `NEXTAUTH_URL` | Compatibility URL |
| `AUTH_SESSION_MAX_AGE` | Session lifetime |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Reset token expiration |
| `UPLOAD_PROVIDER` | `local` or `s3` |
| `UPLOAD_DIR` | Local upload path |
| `AWS_REGION` | AWS region for production integrations |
| `S3_UPLOAD_BUCKET` | Production attachment bucket |
| `SMTP_HOST` | SMTP host |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender address |
| `CRON_SECRET` | Protects cron-like endpoints/workflows |
| `APP_SSM_PARAMETER_PATH` | SSM parameter namespace |

---

## Development Seed Accounts

Local development seed users from [`prisma/seed.ts`](/home/fatemeh/Desktop/AI-Projects/daily-report-app/prisma/seed.ts):

- Admin: `admin@example.com` / `admin123`
- User: `user@example.com` / `user123`

These are development-only credentials and should never be reused outside local setup.

---

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:e2e
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
npm run db:seed:production
npm run backup:db
npm run restore:db
npm run env:ssm:export
```

Common usage:

- `npm run dev` starts local development
- `npm run build` builds the production app
- `npm run test` runs unit/integration tests
- `npm run test:e2e` runs Playwright scenarios
- `npm run db:*` manages Prisma and database setup
- `npm run backup:db` and `npm run restore:db` handle database snapshots

---

## App Structure

The app is organized around feature areas instead of a single flat UI tree.

```text
daily-report-app/
├── src/app/
│   ├── (auth)/                    # login, register, forgot/reset password
│   ├── (dashboard)/               # dashboard, history, reports, settings
│   ├── (admin)/                   # admin area
│   ├── (print)/                   # print-friendly layout
│   └── api/                       # health, tags, tasks
├── src/components/
│   ├── admin/
│   ├── dashboard/
│   ├── forms/
│   ├── layout/
│   ├── settings/
│   ├── shared/
│   ├── tasks/
│   └── ui/
├── src/lib/                       # business logic, auth, storage, validation
├── prisma/                        # schema and seed scripts
├── docs/                          # operations and API docs
├── scripts/                       # backup, restore, deploy helpers
├── deploy/                        # deployment-related assets
├── terraform/                     # infrastructure provisioning
└── .github/workflows/             # CI/CD and automation
```

---

## Main Functional Areas

### Task reporting

- create, update, delete, and review task entries
- attach ticket number, title, description, status, story points, and daily report text
- add tags and attachments
- track task history over time

### Dashboard and reporting

- per-user overview
- charts and stats
- filtered history browsing
- export and import support
- print-friendly report generation

### Admin operations

- manage users and roles
- inspect activity logs
- publish announcements
- maintain app configuration
- monitor operational health

### Productivity helpers

- reminders
- duplicate previous day entries
- keyboard shortcuts
- themed UI and session sync

---

## Data Model

The Prisma schema is built around operational task reporting.

Main entities:

- `User`
- `Task`
- `Tag`
- `TaskTag`
- `Attachment`
- `TaskHistory`
- `ActivityLog`
- `Announcement`
- `AppConfig`

Important enums:

- `Role`: `ADMIN`, `USER`
- `Theme`: `LIGHT`, `DARK`, `SYSTEM`
- `TaskStatus`: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- `TaskHistoryAction`: `CREATED`, `UPDATED`, `DELETED`

---

## Testing and Quality

This project includes:

- Vitest for unit and integration testing
- Playwright scaffolding for end-to-end coverage
- ESLint and TypeScript type checks
- Prettier formatting

Useful commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:e2e
```

---

## Docker and Deployment

### Docker quick start

Production-like stack:

```bash
APP_IMAGE=ghcr.io/<your-github-username>/daily-report-app:latest docker compose up -d
```

Development override:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production notes

- Use [`.env.production`](/home/fatemeh/Desktop/AI-Projects/daily-report-app/.env.production) as a deployment template
- Publish container images through the GitHub Actions workflow
- Set `UPLOAD_PROVIDER=s3` in production for durable attachment storage
- Export environment variables from SSM when deploying in AWS-backed environments
- Use the [`terraform/`](/home/fatemeh/Desktop/AI-Projects/daily-report-app/terraform) directory for infrastructure provisioning
- Schedule regular backups with [`scripts/backup.sh`](/home/fatemeh/Desktop/AI-Projects/daily-report-app/scripts/backup.sh)

---

## Documentation

Additional project docs:

- [ARCHITECTURE.md](/home/fatemeh/Desktop/AI-Projects/daily-report-app/ARCHITECTURE.md)
- [CONTRIBUTING.md](/home/fatemeh/Desktop/AI-Projects/daily-report-app/CONTRIBUTING.md)
- [docs/pre-deployment-checklist.md](/home/fatemeh/Desktop/AI-Projects/daily-report-app/docs/pre-deployment-checklist.md)
- [docs/api/openapi.yaml](/home/fatemeh/Desktop/AI-Projects/daily-report-app/docs/api/openapi.yaml)
- [terraform/README.md](/home/fatemeh/Desktop/AI-Projects/daily-report-app/terraform/README.md)

---

## License

Private project unless you choose to publish it under a license.
