# Export, Import & Reminders

## Context

I am building a web application for writing and managing daily work reports. This document covers export, import, and reminders.

**Already in place:** Project setup, database, and layouts.
**Authentication already in place:** Authentication system.
**Task management already in place:** Core task CRUD.
**Dashboard already in place:** User dashboard with stats.
**Search already in place:** Search, filtering, and sorting.
**Settings already in place:** User profile, settings, and dark mode.
**Advanced task features already in place:** Rich text editor, attachments, bulk ops, and version history.
**Admin workspace already in place:** Admin dashboard.

Refer to `prompt.txt` for full project requirements.

## Goal

Add data export (CSV, JSON, PDF), data import (CSV, JSON), print-friendly views, and the reminder/nudge system.

## What to Build

### 1. Export Reports

**API: `GET /api/tasks/export`**

- Export the authenticated user's tasks
- Query params:
  - `format` — `csv`, `json`, or `pdf`
  - `startDate` / `endDate` — date range (required)
  - `status` — optional filter
  - `tags` — optional filter
- Return:
  - For CSV: file download with proper headers (`Content-Type: text/csv`, `Content-Disposition: attachment`)
  - For JSON: file download as `.json`
  - For PDF: generated PDF file download

**CSV Export:**

- Columns: Date, Ticket Number, Ticket Title, Ticket Description, Story Point, Status, Tags, Daily Report (plain text, stripped of HTML), Created At, Updated At
- UTF-8 encoding with BOM for Excel compatibility
- Proper escaping of commas, quotes, and newlines

**JSON Export:**

- Array of task objects with all fields
- Pretty-printed JSON
- Include related tags as an array of names

**PDF Export:**

- Use a library like `jsPDF`, `pdfkit`, or `@react-pdf/renderer` (server-side generation)
- Clean, professional layout:
  - Header with app name, user name, date range
  - Tasks grouped by date
  - Each task shows: ticket number, title, description, story points, status, tags, daily report
  - Footer with page numbers
  - Good typography and spacing

**Export UI:**

- Add an "Export" button on the task list page (next to filters)
- Clicking opens a modal/dialog with:
  - Format selector: CSV, JSON, PDF (radio buttons or tabs)
  - Date range picker (required)
  - Optional: status and tag filters
  - "Export" button with loading state
  - Show estimated number of tasks to export
- Also add export option in the admin activity logs page (CSV only)

### 2. Print-Friendly View

**Print Page: `/dashboard/tasks/print`**

- A special print-optimized page that shows tasks in a clean layout
- Query params: startDate, endDate (same as export)
- Layout:
  - No sidebar, no header, no navigation
  - Clean white background
  - Tasks grouped by date with clear date headers
  - Each task: ticket number, title, story points, status, daily report (rendered HTML)
  - Summary at the top: date range, total tasks, total story points
  - Print CSS: proper page breaks, hide non-essential elements
- "Print" button that triggers `window.print()`
- Also accessible from the Export modal as "Print Preview"

### 3. Import Data

**API: `POST /api/tasks/import`**

- Accept CSV or JSON file upload
- Parse and validate the data
- Create tasks in bulk for the authenticated user

**CSV Import:**

- Expected columns (first row is header): Date, Ticket Number, Ticket Title, Ticket Description, Story Point, Status, Tags, Daily Report
- Flexible column matching (case-insensitive, allow common variations)
- Validate each row:
  - Date: required, valid date format
  - Ticket number: required
  - Ticket title: required
  - Story point: optional, number
  - Status: optional, must be valid enum (default: TODO)
  - Tags: optional, comma-separated
- Skip invalid rows and report them

**JSON Import:**

- Expected format: array of task objects
- Same validation as CSV

**Import Response:**

```json
{
  "imported": 42,
  "skipped": 3,
  "errors": [
    { "row": 5, "field": "date", "message": "Invalid date format" },
    { "row": 12, "field": "ticket_number", "message": "Required field missing" }
  ]
}
```

**Import UI:**

- Add an "Import" button next to the Export button on the task list page
- Import modal:
  - Drag-and-drop file zone + click to browse
  - Accept .csv and .json files only
  - Preview: show first 5 rows of parsed data before importing
  - Column mapping step (for CSV): show detected columns and let user confirm mapping
  - "Import" button with loading state and progress
  - Results summary: "42 tasks imported, 3 skipped. View errors."
  - Error detail table showing skipped rows and reasons
- Download a sample CSV template link: "Download template"

**Sample Template API: `GET /api/tasks/import/template`**

- Return a sample CSV file with headers and 2 example rows

### 4. Reminder & Nudge System

**Dashboard Nudge (enhance the dashboard experience):**

- The "No tasks logged today" banner should be more prominent if it's past the user's reminder time
- Show a different message based on time:
  - Morning: "Good morning! Ready to log today's tasks?"
  - Afternoon: "Don't forget to log your afternoon tasks!"
  - Evening: "End of day — have you logged all your tasks?"

**Browser Notifications:**

- Request notification permission on first login (with a non-intrusive prompt)
- If permission granted and reminders are enabled:
  - Use the Notification API to show a browser notification at the user's configured reminder time
  - Notification title: "Daily Report Reminder"
  - Notification body: "Don't forget to log your tasks for today!"
  - Clicking the notification opens the app
- Implementation:
  - Use a Service Worker or `setInterval` check while the app is open
  - Compare current time to the user's `reminder_time`
  - Only trigger once per day (store last notification date in localStorage)
- Settings integration: respect the `reminder_enabled` and `reminder_time` preferences from settings

**Email Reminders (Basic):**

- Create an API route `POST /api/cron/send-reminders` that:
  - Finds all users where `reminder_enabled = true` and haven't logged any tasks today
  - Checks if current time matches their `reminder_time` (within a 15-minute window)
  - Sends a reminder email (or logs to console if email isn't configured)
- Email content:
  - Subject: "Daily Report Reminder — Log Your Tasks"
  - Body: "Hi {name}, you haven't logged any tasks today. Click here to add your daily report."
  - Link to the dashboard
- Use Nodemailer or Resend for email sending
- Add email configuration to `.env.example`:
  ```
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_USER=your-email
  SMTP_PASS=your-password
  SMTP_FROM=noreply@dailyreports.app
  ```
- This route can be triggered by an external cron job (e.g., Vercel Cron, GitHub Actions, or system crontab)

### 5. Admin Export Enhancement

- On the admin activity logs page (`/admin/activity`), add CSV export of activity logs
- On the admin user management page (`/admin/users`), add CSV export of user list

## Technical Requirements

- CSV generation: use a library like `papaparse` or manual string building
- PDF generation: server-side using `pdfkit` or similar (don't generate PDFs in the browser)
- File imports: parse in memory, validate, then batch-insert with a transaction
- Batch imports should use `createMany` for performance
- Browser notifications: only request permission when user explicitly enables reminders
- Email sending: gracefully handle missing SMTP config (log to console instead)
- All export/import features should support dark mode in the UI

## Expected Deliverables

- Export tasks as CSV, JSON, or PDF with date range and filters
- Print-friendly view with clean layout and print CSS
- Import tasks from CSV or JSON with validation and error reporting
- Sample CSV template download
- Browser notification reminders
- Email reminder system (with console fallback)
- Enhanced dashboard nudge messages
- Admin export features (activity logs, user list)

## Out of Scope

- Testing
- Deployment & CI/CD
