# Testing & Security Hardening

## Context

I am building a web application for writing and managing daily work reports. This document covers testing and security hardening.

**Already in place:** Full application is built — project setup, authentication, task CRUD, dashboard, search/filter, profile/settings/dark mode, advanced features (rich text, attachments, bulk ops, version history), admin dashboard, and export/import/reminders.

Refer to `prompt.txt` for full project requirements.

## Goal

Add comprehensive testing (unit, integration, E2E), harden security, improve accessibility (WCAG 2.1 AA), add keyboard shortcuts, and polish the overall UX with proper error handling and edge case coverage.

## What to Build

### 1. Testing Setup

- Install and configure testing tools:
  - **Vitest** for unit and integration tests
  - **Playwright** for end-to-end tests
  - **Testing Library** (@testing-library/react) for component tests
- Add test scripts to `package.json`:
  - `npm run test` — run unit + integration tests
  - `npm run test:e2e` — run E2E tests
  - `npm run test:coverage` — run tests with coverage report

### 2. Unit Tests

**API Route Tests (Vitest):**

- Auth routes:
  - Register: valid input, duplicate email, invalid input, rate limiting
  - Login: valid credentials, wrong password, inactive account, rate limiting
  - Forgot password: valid email, non-existent email
  - Reset password: valid token, expired token, invalid token
- Task routes:
  - Create task: valid input, missing required fields, invalid data types
  - Update task: valid update, unauthorized (wrong user), non-existent task
  - Delete task: valid delete, unauthorized, non-existent
  - List tasks: pagination, filtering, sorting, empty results
- Admin routes:
  - Stats: returns correct aggregations
  - User management: list, edit, deactivate, delete (as admin)
  - Admin routes reject non-admin users (403)
- Export/Import:
  - CSV generation correctness
  - JSON export format
  - CSV import parsing and validation
  - Import with invalid rows

**Utility/Helper Tests:**

- Zod validation schemas: valid/invalid inputs for all schemas
- Date formatting utilities
- Password hashing and verification
- Rate limiter logic
- File type/size validation

### 3. Integration Tests

**Auth Flow (Vitest + Testing Library):**

- Full registration → login → access protected route → logout flow
- Password reset flow: request → token → reset → login with new password
- Role-based access: admin can access admin routes, user cannot

**Task CRUD Flow:**

- Create a task → verify it appears in the list → edit it → verify changes → delete it → verify removal
- Tag creation and assignment
- Bulk operations: select multiple → delete → verify

**Dashboard:**

- Stats update after creating/deleting tasks
- Nudge banner appears when no tasks today

### 4. End-to-End Tests (Playwright)

**Critical User Journeys:**

**Test: Authentication**

- Visit login page → fill in credentials → submit → verify redirect to dashboard
- Register new user → verify redirect → verify user menu shows name
- Logout → verify redirect to login → verify cannot access dashboard

**Test: Task Management**

- Login → create a new task (fill all fields) → verify it appears on the list
- Edit the task → change title and status → verify changes displayed
- Delete the task → confirm deletion → verify it's gone from the list

**Test: Search & Filter**

- Create 3 tasks with different titles → search by title → verify correct results
- Filter by status → verify filtered results
- Clear filters → verify all tasks shown

**Test: Quick Add**

- Login → click Quick Add on dashboard → fill minimal fields → submit → verify task created

**Test: Settings**

- Navigate to settings → change name → save → verify header shows new name
- Toggle dark mode → verify theme changes
- Change password → logout → login with new password

**Test: Admin**

- Login as admin → navigate to admin dashboard → verify stats visible
- Go to user management → search for a user → view details
- Create announcement → verify it appears on user dashboard

**Test: Export**

- Create tasks → export as CSV → verify file downloads
- Export as JSON → verify file downloads

**Test: Responsive**

- Run critical tests at mobile viewport (375px width)
- Verify sidebar collapses, forms are usable, tables scroll

### 5. Security Hardening

**HTTP Security Headers (Next.js middleware or next.config.js):**

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Input Sanitization:**

- Sanitize all rich text HTML input/output with DOMPurify (if not already done in advanced task work)
- Strip dangerous HTML tags and attributes
- Validate and sanitize all user inputs on the server side

**CSRF Protection:**

- Verify NextAuth CSRF token is properly configured
- Ensure all state-changing API routes use POST/PUT/DELETE (not GET)

**Rate Limiting Review:**

- Ensure rate limiting is applied to:
  - Auth endpoints (login, register, forgot password)
  - Task creation (prevent spam)
  - File uploads (prevent abuse)
  - Admin endpoints
- Review and adjust limits based on reasonable usage patterns

**SQL Injection Prevention:**

- Verify all database queries use Prisma's parameterized queries (not raw SQL)
- If any raw queries exist, ensure they use parameter binding

**Session Security:**

- Verify JWT tokens expire properly
- Ensure session is invalidated on password change
- Ensure deactivated users are forced to log out

**File Upload Security:**

- Verify file type validation (check magic bytes, not just extension)
- Ensure uploaded files are served from a safe directory
- Prevent path traversal in file names
- Scan for oversized files before processing

### 6. Accessibility (WCAG 2.1 AA)

**Audit and fix:**

- All interactive elements are keyboard-focusable
- Proper tab order throughout the app
- Focus trap in modals and dialogs (focus doesn't escape to background)
- Focus returns to trigger element when modal closes
- Skip-to-content link on all pages
- All images have alt text
- All form inputs have associated labels
- All buttons have accessible names (not just icons — add aria-label)
- Color contrast meets WCAG AA standards (4.5:1 for text, 3:1 for large text)
- Error messages are announced to screen readers (use `aria-live` regions)
- Status messages (toasts) are announced (use `role="status"` or `aria-live="polite"`)
- Data tables have proper header associations
- Page titles are unique and descriptive (`<title>` tag per page)

### 7. Keyboard Shortcuts

- Implement global keyboard shortcuts:
  - `Ctrl+N` / `Cmd+N` — Open new task form
  - `Ctrl+K` / `Cmd+K` — Focus the search bar / open search palette
  - `Escape` — Close any open modal, dialog, or dropdown
- Add a "Keyboard Shortcuts" help dialog (triggered by `?` key):
  - Show all available shortcuts in a clean modal
  - Add a link to this dialog in the user menu or footer
- Ensure shortcuts don't conflict with browser defaults
- Shortcuts should be disabled when user is typing in an input field

### 8. Error Handling Polish

- Create a global error boundary component for React errors
- Create custom error pages:
  - `404` — Page not found (friendly design with link back to dashboard)
  - `500` — Server error (friendly design with retry option)
  - `403` — Access denied (for admin routes accessed by non-admins)
- API error responses should be consistent:
  ```json
  { "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
  ```
- Network error handling: show retry option when API calls fail
- Form submission errors: show inline errors under fields + toast for general errors
- Handle token expiration gracefully: redirect to login with message

### 9. Performance Audit

- Check and optimize:
  - Bundle size (analyze with `next-bundle-analyzer`)
  - Lazy-load heavy components (rich text editor, charts, date picker)
  - Image optimization (use Next.js `<Image>` for avatars and attachments)
  - API response times (add database indexes if any queries are slow)
  - Lighthouse score: target 90+ on Performance, Accessibility, Best Practices, SEO

## Technical Requirements

- Tests should use a test database (separate from development)
- E2E tests should seed their own data and clean up after
- Test coverage target: 80%+ on critical paths (API routes, auth, task CRUD)
- Security headers should not break app functionality (test after adding)
- Accessibility fixes should not change visual design

## Expected Deliverables

- Vitest configured with unit and integration tests
- Playwright configured with E2E tests for all critical journeys
- HTTP security headers configured
- Input sanitization verified
- Rate limiting comprehensive
- WCAG 2.1 AA compliance across the app
- Keyboard shortcuts working
- Global error boundary and custom error pages
- Performance optimizations applied
- All tests passing

## Out of Scope

- Deployment & CI/CD
- Nice-to-have features (PWA, team support, AI writing, etc.)
