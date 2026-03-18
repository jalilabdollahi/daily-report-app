# Core Task CRUD & Daily Reports

## Context

I am building a web application for writing and managing daily work reports. This document covers core task CRUD and daily reports.

**Already in place:** Project setup, database schema, Prisma, layouts, and folder structure.
**Authentication already in place:** Login, register, logout, password reset, protected routes, role-based access, middleware, and user menu.

Refer to `prompt.txt` for full project requirements.

## Goal

Build the core task/report CRUD functionality. Users should be able to create, view, edit, and delete daily task entries. Tasks should be grouped by date. This is the heart of the application.

## What to Build

### 1. Task API Routes

**`GET /api/tasks`**

- Fetch all tasks for the authenticated user
- Support query parameters:
  - `page` (default: 1)
  - `limit` (default: 20)
  - `date` (optional: filter by specific date)
  - `startDate` / `endDate` (optional: date range)
- Return tasks grouped by date (or sorted by date descending)
- Include related tags and attachments count
- Return pagination metadata: `{ data, total, page, limit, totalPages }`

**`POST /api/tasks`**

- Create a new task for the authenticated user
- Required fields: ticket_number, ticket_title, date
- Optional fields: ticket_description, story_point, daily_report, status, tags
- Validate all input with Zod
- Auto-set user_id from session
- Log CREATE_TASK to ActivityLog
- Log to TaskHistory (action: CREATED)
- Return the created task

**`GET /api/tasks/[id]`**

- Fetch a single task by ID
- Verify the task belongs to the authenticated user
- Include related tags, attachments, and history

**`PUT /api/tasks/[id]`**

- Update a task by ID
- Verify ownership
- Validate input with Zod
- Log to TaskHistory (action: UPDATED, store the changed fields as JSON)
- Log EDIT_TASK to ActivityLog
- Return the updated task

**`DELETE /api/tasks/[id]`**

- Soft delete or hard delete a task by ID
- Verify ownership
- Log DELETE_TASK to ActivityLog
- Log to TaskHistory (action: DELETED)
- Return success response

**`POST /api/tasks/[id]/tags`**

- Add tags to a task (create tag if it doesn't exist)
- Accept an array of tag names

**`DELETE /api/tasks/[id]/tags/[tagId]`**

- Remove a tag from a task

### 2. Zod Validation Schemas

Create validation schemas in `lib/validations/task.ts`:

- `createTaskSchema` — validates creation payload
- `updateTaskSchema` — validates update payload (all fields optional)
- Ticket number: required on create, string
- Ticket title: required on create, 1-200 characters
- Ticket description: optional, max 5000 characters
- Story point: optional, number between 0 and 100
- Daily report: optional, max 50000 characters (rich text HTML)
- Status: optional, must be valid enum value
- Date: required on create, valid date string

### 3. Task List Page (`/dashboard/tasks`)

- Display all user's tasks grouped by date
- Each date group shows:
  - Date header (e.g., "Monday, March 16, 2026" or "Today", "Yesterday")
  - List of task cards under that date
- Each task card shows:
  - Ticket number (prominent, like a badge)
  - Ticket title
  - Status badge (color-coded: TODO=gray, IN_PROGRESS=blue, DONE=green, BLOCKED=red)
  - Story point (small badge)
  - Tags (small colored pills)
  - Truncated daily report preview (first 100 chars)
  - Edit and Delete action buttons (icons)
- Empty state: friendly message with illustration when no tasks exist, with a CTA button to create first task
- Loading state: skeleton cards while fetching
- Pagination at the bottom (or infinite scroll)
- Use TanStack Query for data fetching with caching

### 4. Create Task Page/Modal (`/dashboard/tasks/new` or modal)

- A form to create a new task with fields:
  - Date picker (default: today)
  - Ticket number (text input)
  - Ticket title (text input)
  - Ticket description (textarea)
  - Story point (number input with +/- buttons or dropdown: 0.5, 1, 2, 3, 5, 8, 13)
  - Status (select dropdown)
  - Tags (multi-select or tag input — type to search existing tags or create new ones)
  - Daily report (textarea for now — rich text editor can be added later)
- Form validation with React Hook Form + Zod
- Inline error messages under each field
- Submit button with loading state
- On success: show toast notification, redirect to task list (or close modal and refresh)
- Make this form feel fast — prioritize speed of data entry
- Consider a "Quick Add" mode: just ticket number, title, and date (expand for more fields)

### 5. Edit Task Page/Modal (`/dashboard/tasks/[id]/edit` or modal)

- Same form as create, pre-populated with existing task data
- Fetch task data on mount
- Loading state while fetching
- On success: show toast notification, redirect back

### 6. Delete Task

- Confirmation dialog before deleting (shadcn/ui AlertDialog)
- "Are you sure you want to delete this task? This action cannot be undone."
- On confirm: delete the task, show toast, refresh the list
- Loading state on the delete button

### 7. Toast Notifications

- Set up a toast notification system (shadcn/ui Toaster)
- Show toasts for:
  - Task created successfully
  - Task updated successfully
  - Task deleted successfully
  - Error creating/updating/deleting task

### 8. Tags API

**`GET /api/tags`**

- Fetch all available tags (for the tag selector)
- Return id, name, color

**`POST /api/tags`**

- Create a new tag (name, optional color)
- Only if it doesn't already exist

### 9. Sidebar Navigation Update

- Add navigation items to the dashboard sidebar:
  - Dashboard (icon: LayoutDashboard) → `/dashboard` (placeholder for dashboard work)
  - Tasks (icon: CheckSquare) → `/dashboard/tasks`
  - Settings (icon: Settings) → `/dashboard/settings` (placeholder for settings work)
- Highlight the active route
- Admin sidebar should have separate admin nav items (placeholder for the admin workspace)

## Technical Requirements

- All API routes must verify authentication (return 401 if not authenticated)
- All API routes must verify task ownership (return 403 if accessing another user's task)
- Use TanStack Query mutations for create/update/delete with optimistic updates or cache invalidation
- Proper error handling: try/catch in API routes, error boundaries in UI
- All dates stored in UTC, displayed in user's local timezone
- Pagination: default 20 items per page

## Expected Deliverables

- Working task CRUD (create, read, update, delete)
- Task list page with date grouping
- Create and edit task forms with validation
- Delete confirmation dialog
- Toast notifications
- Tags creation and assignment
- Activity and history logging
- Updated sidebar navigation
- Proper loading, error, and empty states

## Out of Scope

- Search and filtering
- Dashboard stats
- Rich text editor
- File attachments
- Bulk operations
- Duplicate yesterday's tasks
