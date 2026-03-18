# Admin Dashboard

## Context

I am building a web application for writing and managing daily work reports. This document covers the admin dashboard.

**Already in place:** Project setup, database, and layouts.
**Authentication already in place:** Authentication with role-based access (`ADMIN`/`USER` roles).
**Task management already in place:** Core task CRUD.
**Dashboard already in place:** User dashboard with stats and date organization.
**Search already in place:** Search, filtering, and sorting.
**Settings already in place:** User profile, settings, and dark mode.
**Advanced task features already in place:** Rich text editor, attachments, bulk ops, duplicate tasks, and version history.

Refer to `prompt.txt` for full project requirements.

## Goal

Build a complete admin dashboard accessible only to users with the ADMIN role. The admin panel should be a separate section of the app (`/admin/*`) with its own layout, sidebar navigation, and pages for managing users, viewing system stats, activity logs, content moderation, app configuration, system health, and announcements.

## What to Build

### 1. Admin Layout & Navigation

- Use the admin layout shell created during initial project setup
- Admin sidebar navigation with sections:
  - **Overview** (icon: LayoutDashboard) → `/admin`
  - **Users** (icon: Users) → `/admin/users`
  - **Activity Logs** (icon: ScrollText) → `/admin/activity`
  - **Content** (icon: FileText) → `/admin/content`
  - **Configuration** (icon: Settings) → `/admin/config`
  - **System Health** (icon: Activity) → `/admin/health`
  - **Announcements** (icon: Megaphone) → `/admin/announcements`
- Active route highlighting
- Collapsible sidebar on mobile
- "Back to App" link to return to the user dashboard
- Admin header with user menu (same as user dashboard)
- Modern, clean design — distinct from the user dashboard but consistent in style

### 2. Admin Overview Page (`/admin`)

**API: `GET /api/admin/stats`**

- Return system-wide statistics:
  - Total registered users (and count of active/inactive)
  - New registrations this week/month
  - Total tasks across all users
  - Tasks created today/this week/this month
  - Total story points system-wide
  - Top 5 most active users (by task count)
  - Storage usage (total size of uploaded files)

**Overview Page:**

- Stats cards grid (similar to user dashboard but system-wide):
  - Total Users (with active/inactive breakdown)
  - Total Tasks
  - Tasks Today
  - Storage Used
- **Registrations chart:** Line or bar chart showing new registrations per day (last 30 days)
- **Tasks chart:** Bar chart showing tasks created per day (last 30 days)
- **Top users table:** Top 5 most active users with name, email, task count, story points
- **Recent activity feed:** Last 10 activity log entries (compact list)
- Use Recharts for all charts

### 3. User Management Page (`/admin/users`)

**API Routes:**

**`GET /api/admin/users`**

- Paginated, searchable, sortable list of all users
- Query params: search, page, limit, sortBy, sortOrder, role, is_active
- Return: id, name, email, role, is_active, avatar_url, task_count, created_at, last_login

**`GET /api/admin/users/[id]`**

- Full user profile with stats: total tasks, total story points, last active date, registration date

**`PUT /api/admin/users/[id]`**

- Edit user details: name, email, role
- Only admins can change roles
- Cannot demote yourself from admin if you're the last admin

**`PUT /api/admin/users/[id]/status`**

- Activate or deactivate a user account (toggle is_active)
- Deactivated users cannot log in

**`DELETE /api/admin/users/[id]`**

- Delete a user and all their data (tasks, attachments, etc.)
- Cannot delete yourself
- Confirmation required

**`POST /api/admin/users/[id]/reset-password`**

- Generate a temporary password or reset link for a user
- Log the action

**User Management Page:**

- Data table with columns: Avatar, Name, Email, Role, Status, Tasks, Joined, Actions
- Search bar to filter users by name or email
- Filter by: Role (Admin/User), Status (Active/Inactive)
- Sort by any column
- Pagination (10/25/50 per page)
- Row actions dropdown: View Details, Edit, Reset Password, Activate/Deactivate, Delete
- Click a row to view user detail panel/page
- **User detail panel/page:**
  - User profile info
  - Account stats (task count, story points, last login)
  - Recent tasks list
  - Activity log for that user
  - Action buttons: Edit, Reset Password, Deactivate, Delete

### 4. Activity Logs Page (`/admin/activity`)

**API: `GET /api/admin/activity`**

- Paginated activity logs from the ActivityLog table
- Query params: search, page, limit, user_id, action, startDate, endDate
- Return: id, user (name, email), action, target_type, target_id, ip_address, metadata, created_at

**Activity Logs Page:**

- Data table with columns: Timestamp, User, Action, Target, IP Address, Details
- Filter by:
  - User (searchable dropdown)
  - Action type (LOGIN, LOGOUT, CREATE_TASK, EDIT_TASK, DELETE_TASK, etc.)
  - Date range
- Sort by timestamp
- Pagination
- Expandable row to show metadata/details JSON
- Export activity log button (CSV)

### 5. Content Moderation Page (`/admin/content`)

**API Routes:**

**`GET /api/admin/tasks`**

- Paginated list of all tasks across all users
- Query params: search, page, limit, user_id, status, startDate, endDate, sortBy, sortOrder
- Return tasks with user info (name, email)

**`DELETE /api/admin/tasks/[id]`**

- Admin can delete any user's task
- Log the action with the admin's user_id

**`PUT /api/admin/tasks/[id]/flag`**

- Flag or unflag a task (add a `flagged` boolean or field if needed)

**Content Moderation Page:**

- Data table with columns: Date, User, Ticket #, Title, Status, Story Points, Flagged, Actions
- Search across all users' tasks
- Filter by user, status, date range, flagged status
- Row actions: View, Flag/Unflag, Delete
- Click to view full task detail (read-only) in a slide-over panel or modal

### 6. App Configuration Page (`/admin/config`)

**API Routes:**

**`GET /api/admin/config`**

- Return current app configuration (stored in a config table or JSON)

**`PUT /api/admin/config`**

- Update app configuration

**Create an AppConfig table or use a key-value store:**

```
key             - String, primary key
value           - JSON
updated_at      - Timestamp
updated_by      - Foreign key → Users
```

**Configuration options:**

- `registration_enabled` (boolean) — allow new user registrations
- `file_uploads_enabled` (boolean) — allow file attachments
- `max_file_size_mb` (number) — max upload file size
- `allowed_statuses` (string array) — task status options
- `allowed_tags` (string array) — predefined tag options
- `default_theme` (string) — default theme for new users
- `default_reminder_time` (string) — default reminder time
- `rate_limit_login` (number) — max login attempts per minute
- `maintenance_mode` (boolean) — show maintenance page to non-admins

**Config Page:**

- Form with sections for each config group:
  - **General:** Registration toggle, maintenance mode toggle
  - **File Uploads:** Enable/disable, max file size slider
  - **Tasks:** Manage allowed statuses list, manage predefined tags list
  - **Defaults:** Default theme, default reminder time
  - **Security:** Rate limit settings
- Save button per section or single save for all
- Show last updated timestamp and who updated

### 7. System Health Page (`/admin/health`)

**API: `GET /api/admin/health`**

- Return system health information:
  - Database connection status (connected/disconnected, response time)
  - API response time (average for last hour)
  - Total database size
  - Total file storage used
  - Number of active sessions
  - Uptime (if trackable)
  - Node.js version, Next.js version
  - Last deployment timestamp (from env or build info)

**System Health Page:**

- Status indicators (green/yellow/red) for:
  - Database connection
  - API status
  - File storage
- Stats:
  - DB size
  - Storage used
  - Active sessions
  - Uptime
- Environment info card: Node version, Next.js version, environment (dev/staging/prod)
- **Recent errors:** Display last 20 errors from an error log (if implementing error logging) or show "No recent errors"
- Auto-refresh every 30 seconds

### 8. Announcements Management Page (`/admin/announcements`)

**API Routes:**

**`GET /api/admin/announcements`**

- List all announcements (paginated)
- Include: id, title, message, is_active, created_at, expires_at, admin name

**`POST /api/admin/announcements`**

- Create a new announcement
- Fields: title, message, expires_at (optional)
- Validate with Zod

**`PUT /api/admin/announcements/[id]`**

- Update an announcement

**`DELETE /api/admin/announcements/[id]`**

- Delete an announcement

**`PUT /api/admin/announcements/[id]/toggle`**

- Toggle is_active status

**Announcements Page:**

- List of all announcements (cards or table)
- Each shows: title, message preview, status (Active/Inactive), created date, expiry date
- Create new announcement button → modal or form
- Edit, toggle active/inactive, delete actions
- Preview: show how the announcement will look to users

## Technical Requirements

- All admin API routes must verify `role === ADMIN` (return 403 for non-admins)
- Admin middleware should check both authentication and admin role
- Use database transactions for operations that modify multiple records
- Data tables should use shadcn/ui DataTable (built on TanStack Table) for consistency
- Charts use Recharts (already added in dashboard work)
- Pagination, search, sort, filter should all be URL-based (same pattern as search/filter work)
- All pages support dark mode
- Loading skeletons for all data-heavy pages
- Add the AppConfig table to Prisma schema and migrate

## Expected Deliverables

- Admin overview page with system-wide stats and charts
- User management: list, search, view, edit, deactivate, delete, reset password
- Activity logs: searchable, filterable, exportable
- Content moderation: view, search, flag, delete any task
- App configuration: toggle features, manage statuses/tags, set defaults
- System health: live status indicators, DB info, storage info
- Announcements: create, edit, toggle, delete
- All behind admin role protection
- Modern, clean admin UI with consistent data tables

## Out of Scope

- Export/import for users
- Reminders/email sending
- Testing
- Deployment
