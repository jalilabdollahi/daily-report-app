# Contributing

## Local Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.development` or `.env`.
3. Start PostgreSQL locally or use Docker Compose.
4. Run `npm run db:generate`.
5. Apply schema changes with `npm run db:push` or migrations.
6. Seed development data with `npm run db:seed`.
7. Start the app with `npm run dev`.

## Coding Standards

- TypeScript everywhere.
- Use Zod for request validation.
- Prefer feature-focused components and shared helpers over duplicate logic.
- Keep client/server boundaries explicit.
- Use `apply_patch` for manual file edits when pairing through Codex.

## Testing

- Unit and integration tests: `npm run test`
- Coverage: `npm run test:coverage`
- E2E: `npm run test:e2e`
- Keep new features covered with at least one test at the most appropriate level.

## Pull Requests

- Branch from `main`.
- Keep PRs focused and reviewable.
- Run lint, tests, and build before opening a PR.
- Document any schema, env, or operational changes in the PR summary.

## Review Checklist

- Does the change preserve accessibility and keyboard behavior?
- Are API inputs validated and errors human-readable?
- Are server-only modules kept out of client components?
- Are migrations, docs, and environment variables updated when needed?
