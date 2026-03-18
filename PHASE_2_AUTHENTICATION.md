# Authentication System

## Context

I am building a web application for writing and managing daily work reports. This document covers the authentication system.

**Already in place:** Project is initialized with Next.js, Tailwind CSS, Prisma, shadcn/ui, TanStack Query. Database schema is created and migrated with seed data. Base layouts (dashboard shell, auth shell, admin shell) are in place. Folder structure is set up.

Refer to `prompt.txt` for full project requirements.

## Goal

Implement a complete authentication system with login, registration, logout, password recovery/reset, session handling, and role-based access control. By the end of this phase, users can register, log in, log out, and access protected routes based on their role (admin vs user).

## What to Build

### 1. NextAuth.js Setup

- Install and configure NextAuth.js (v5 / Auth.js) with:
  - Credentials provider (email + password)
  - JWT session strategy
  - Session callback to include user `id`, `role`, `name`, `email`, `avatar_url`, and `theme` in the session
  - Proper secret and environment variables
- Create the NextAuth API route handler
- Create a Prisma adapter or custom authorize function that:
  - Looks up user by email
  - Verifies password with bcrypt
  - Checks if user `is_active` is true
  - Returns user object on success, null on failure

### 2. Password Hashing

- Use bcrypt for password hashing
- Hash passwords on registration and password reset
- Never store or return plain-text passwords

### 3. Auth Pages (under `(auth)` route group)

**Login Page (`/login`):**

- Clean, centered card layout using the auth layout shell
- Email and password fields
- Form validation with Zod + React Hook Form:
  - Email: required, valid email format
  - Password: required, minimum 6 characters
- "Remember me" checkbox (optional)
- Link to "Forgot password?" page
- Link to "Create an account" (register) page
- Show error messages for invalid credentials
- Loading state on submit button
- Redirect to dashboard on successful login

**Registration Page (`/register`):**

- Name, email, password, confirm password fields
- Form validation with Zod + React Hook Form:
  - Name: required, 2-50 characters
  - Email: required, valid format, must be unique (check on submit)
  - Password: required, minimum 8 characters, at least one uppercase, one lowercase, one number
  - Confirm password: must match password
- On success: create user in database, auto-login, redirect to dashboard
- Show validation errors inline
- Loading state on submit

**Forgot Password Page (`/forgot-password`):**

- Email input field
- On submit: generate a password reset token, store it in the database (add a `password_reset_token` and `password_reset_expires` field to the Users table if not already there)
- For now, log the reset link to the console (email sending is a nice-to-have)
- Show success message: "If an account with that email exists, we've sent a reset link"
- Link back to login

**Reset Password Page (`/reset-password?token=xxx`):**

- New password and confirm password fields
- Validate the token (exists, not expired — tokens expire after 1 hour)
- On success: hash new password, update user, clear the reset token
- Redirect to login with success message
- Show error if token is invalid or expired

### 4. Session & Auth State Management

- Create an auth context or hook (`useSession` from NextAuth)
- Create a `getCurrentUser()` server-side helper that gets the session user
- Make session data available throughout the app

### 5. Protected Routes & Middleware

- Create Next.js middleware (`middleware.ts`) that:
  - Redirects unauthenticated users to `/login` for all dashboard and admin routes
  - Redirects authenticated users away from auth pages (login, register) to `/dashboard`
  - Checks `role === ADMIN` for admin routes — redirect non-admins to `/dashboard` with an error
  - Allows public access to auth pages only

### 6. Role-Based Access Control (RBAC)

- Create a reusable `RequireRole` component or higher-order wrapper
- Admin routes (`/admin/*`) only accessible to users with role ADMIN
- User routes (`/dashboard/*`) accessible to all authenticated users
- API routes should also check role before processing admin-only requests

### 7. Auth API Routes

- `POST /api/auth/register` — Create a new user account
- NextAuth handles login/logout via its built-in routes
- `POST /api/auth/forgot-password` — Generate and store reset token
- `POST /api/auth/reset-password` — Validate token and update password
- All auth API routes should:
  - Validate input with Zod
  - Return proper HTTP status codes
  - Return consistent error response format: `{ error: string }`
  - Never expose internal errors to the client

### 8. Rate Limiting

- Add basic rate limiting on auth endpoints:
  - Login: max 5 attempts per minute per IP
  - Register: max 3 attempts per minute per IP
  - Forgot password: max 3 attempts per minute per IP
- Use an in-memory store (or simple approach) for rate limiting
- Return 429 Too Many Requests when limit is exceeded

### 9. Activity Logging

- Log authentication events to the ActivityLog table:
  - LOGIN (success)
  - LOGIN_FAILED
  - LOGOUT
  - REGISTER
  - PASSWORD_RESET_REQUEST
  - PASSWORD_RESET_SUCCESS
- Include user_id (if known) and ip_address

### 10. Logout

- Add a logout button/menu item in the dashboard header
- Clear session on logout
- Redirect to login page
- Log the LOGOUT event

### 11. User Menu in Header

- In the dashboard layout header, add a user dropdown menu showing:
  - User name and email
  - Avatar (or initials placeholder)
  - Link to Settings (page will be built later)
  - Logout button
- Use shadcn/ui DropdownMenu component

## Technical Requirements

- Use bcrypt with a salt rounds of 12
- JWT tokens should expire in 7 days (configurable)
- Password reset tokens should expire in 1 hour
- All form validation on both client and server side
- Consistent error handling and user feedback
- Loading states on all form submissions
- Proper TypeScript types for session, user, etc.

## Expected Deliverables

- Working login, register, forgot password, and reset password pages
- Protected routes with middleware
- Role-based access (admin vs user)
- User menu with logout in the dashboard header
- Rate limiting on auth endpoints
- Activity logging for auth events
- Seed data users can log in (admin@example.com / admin123, user@example.com / user123)

## Out of Scope

- User profile/settings page
- Task CRUD
- Dashboard content
- Email sending for password reset (just log to console)
