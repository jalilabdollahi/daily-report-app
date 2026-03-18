# User Dashboard & Date Organization

## Context

I am building a web application for writing and managing daily work reports. This document covers the user dashboard and date organization.

**Already in place:** Project setup, database, and layouts.
**Authentication already in place:** Authentication system.
**Task management already in place:** Core task CRUD — create, view, edit, delete tasks with date grouping, tags, and toast notifications.

Refer to `prompt.txt` for full project requirements.

## Goal

Build the main user dashboard (home page after login) with stats, recent activity, quick actions, and improve the date-based organization of tasks. This page should make the user feel productive and informed at a glance.

## What to Build

### 1. Dashboard Stats API

**`GET /api/dashboard/stats`**

- Return aggregated stats for the authenticated user:
  - `totalTasks` — total number of tasks ever created
  - `todayTasks` — number of tasks logged today
  - `thisWeekTasks` — tasks logged in the current week (Mon–Sun)
  - `thisMonthTasks` — tasks logged in the current month
  - `totalStoryPoints` — sum of all story points
  - `thisWeekStoryPoints` — story points logged this week
  - `thisMonthStoryPoints` — story points logged this month
  - `tasksByStatus` — count grouped by status (TODO, IN_PROGRESS, DONE, BLOCKED)
  - `recentTasks` — last 5 tasks created (with basic info)
  - `tasksPerDay` — array of { date, count } for the last 7 days (for a mini chart)

### 2. Dashboard Page (`/dashboard`)

Build a rich, informative dashboard with the following sections:

**Welcome Section:**

- "Good morning/afternoon/evening, {name}" greeting
- Today's date formatted nicely
- Short motivational or descriptive text (e.g., "Here's your report overview")

**"No tasks logged today" Nudge:**

- If `todayTasks === 0`, show a prominent banner/alert:
  - "You haven't logged any tasks today. Start now!"
  - With a "Add Task" button that opens the create task form
- Use a warm, encouraging tone — not alarming

**Quick Add Task Button:**

- A prominent floating or sticky "+" button or "Quick Add" button
- Clicking it opens the create task form (modal or navigates to `/dashboard/tasks/new`)
- This should be the most visible action on the page

**Stats Cards Row:**

- Display stat cards in a responsive grid (2 columns on mobile, 4 on desktop):
  - Total Tasks (with icon)
  - Today's Tasks (with icon)
  - This Week's Story Points (with icon)
  - Tasks by Status (mini breakdown or donut indicator)
- Each card should have a clean design with a number, label, and subtle icon
- Use shadcn/ui Card component

**Activity Chart:**

- A simple bar chart or area chart showing tasks per day for the last 7 days
- Use Recharts or a lightweight chart library
- X-axis: dates (Mon, Tue, Wed...)
- Y-axis: task count
- Clean, minimal design that fits the app aesthetic

**Recent Tasks Section:**

- Show the last 5 tasks as a compact list or card group
- Each item shows: date, ticket number, ticket title, status badge
- "View All" link to `/dashboard/tasks`
- Clickable — clicking a task navigates to its edit page or opens details

**Active Announcements:**

- If there are any active announcements (from admin), show them as a dismissible banner at the top
- Query: `GET /api/announcements/active` — return announcements where `is_active = true` and `expires_at` is null or in the future

### 3. Announcements API

**`GET /api/announcements/active`**

- Return all active, non-expired announcements
- Sorted by created_at descending
- Public for authenticated users

### 4. Date Organization Improvements on Task List

Enhance the existing task list page:

**Date Headers:**

- Show "Today", "Yesterday", or the full date (e.g., "Friday, March 13, 2026")
- Add a small task count badge next to each date header (e.g., "Today (3 tasks)")
- Total story points for that day next to the count

**Date Navigation:**

- Add date quick-filter buttons at the top: "Today", "This Week", "This Month", "All"
- Date picker to jump to a specific date
- Left/right arrows to navigate day-by-day

**Weekly View (Optional Tab):**

- A tab or toggle to switch between "Daily" and "Weekly" view
- Weekly view groups tasks by week (e.g., "Week of March 9–15, 2026")
- Shows a summary row for each week: total tasks, total story points

**Monthly View (Optional Tab):**

- Monthly grouping with summary stats per month
- Calendar-style overview showing which days have tasks (dots or count)

### 5. Dashboard Layout Polish

- Make the dashboard feel like a real productivity tool
- Use consistent spacing, card borders/shadows, and color accents
- Loading skeletons for all sections while data is fetching
- Responsive: stack cards vertically on mobile
- The overall feel should be clean, minimal, and professional

## Technical Requirements

- Dashboard stats should be a single API call (aggregated on the server)
- Use TanStack Query with appropriate stale time (e.g., 30 seconds for dashboard stats)
- Charts should be lightweight and not add significant bundle size
- All date calculations should be timezone-aware
- Use server components where possible, client components for interactive parts

## Expected Deliverables

- Working dashboard page with welcome, stats, chart, recent tasks, nudge banner
- Dashboard stats API route
- Active announcements display
- Enhanced date organization on task list (date headers, navigation, counts)
- Optional weekly/monthly views
- Loading and empty states for all sections

## Out of Scope

- Search and filtering
- User profile/settings
- Rich text editor, attachments, bulk ops
- Admin dashboard
