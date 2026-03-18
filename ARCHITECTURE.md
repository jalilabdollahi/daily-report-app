# Architecture

## Overview

Daily Report App is a Next.js App Router application with server-rendered route groups for the authenticated user workspace, admin workspace, auth flows, and print views. It uses Next.js API routes as the backend surface, PostgreSQL for persistence, Prisma for data access, NextAuth credentials sessions for authentication, and React Query for client-side data coordination.

## Runtime Layers

1. UI layer:
   - Route groups in `src/app/(auth)`, `src/app/(dashboard)`, `src/app/(admin)`, and `src/app/(print)`.
   - Shared layout chrome via `AppShell`, `AuthShell`, and root providers.
   - Reusable feature modules for tasks, dashboard, admin, settings, and announcements.

2. API layer:
   - Route handlers in `src/app/api/**`.
   - Validation via Zod schemas in `src/lib/validations/**`.
   - Authorization helpers in `src/lib/authz.ts`.
   - Activity logging for auth, task, admin, and reminder operations.

3. Data layer:
   - Prisma schema in `prisma/schema.prisma`.
   - Core entities: `User`, `Task`, `Tag`, `TaskTag`, `Attachment`, `TaskHistory`, `ActivityLog`, `Announcement`, and `AppConfig`.
   - Indexes on task date, user, status, ticket fields, and activity timestamps.

## Authentication Flow

1. Credentials login is handled through NextAuth.
2. Session data is enriched with user id, role, avatar, and theme.
3. Middleware protects user/admin paths and applies request throttling.
4. Server helpers (`requireCurrentUser`, `requireRole`, `requireApiUser`, `requireApiAdmin`) enforce authorization in pages and APIs.

## Task Lifecycle

1. Tasks are created and updated through `/api/tasks` routes with Zod validation.
2. Tag relationships are synchronized through `TaskTag`.
3. History entries are recorded on create/update/delete.
4. Activity log events capture significant task actions.
5. Export/import and print flows reuse the same task filtering and serialization helpers.

## Background and Reminder Flow

1. Dashboard/UI nudges use reminder preferences from the user profile.
2. Browser notifications are handled by the `ReminderManager`.
3. Email reminder cron execution runs through `/api/cron/send-reminders`.
4. Reminder delivery is logged to `ActivityLog`.

## Folder Structure

- `src/app`: pages, route groups, and API routes
- `src/components`: feature UI and shared primitives
- `src/lib`: business logic, helpers, validation, auth, uploads, transfer logic
- `src/hooks`: client hooks
- `src/types`: shared TypeScript types and vendor declarations
- `prisma`: schema, migrations, seeds
- `docs`: API and operational documentation
- `scripts`: operational backup/restore helpers

## Design Decisions

- App Router route groups keep auth, dashboard, admin, and print layouts isolated.
- React Query is used for cached, invalidation-friendly client data flows.
- Rich text is sanitized on render to reduce XSS exposure.
- Uploads use random server-side filenames and content validation to reduce abuse.
- Export/import logic is centralized so CSV, JSON, PDF, and print views stay consistent.
