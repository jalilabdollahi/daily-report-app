# Advanced Task Features

## Context

I am building a web application for writing and managing daily work reports. This document covers advanced task features.

**Already in place:** Project setup, database, and layouts.
**Authentication already in place:** Authentication system.
**Task management already in place:** Core task CRUD.
**Dashboard already in place:** User dashboard with stats and date organization.
**Search already in place:** Search, filtering, and sorting.
**Settings already in place:** User profile, settings, dark mode, and avatar upload.

Refer to `prompt.txt` for full project requirements.

## Goal

Add advanced task features: rich text editor for daily reports, file/image attachments, bulk operations, duplicate yesterday's tasks, and audit trail/version history viewer.

## What to Build

### 1. Rich Text Editor for Daily Report

- Replace the plain textarea for the `daily_report` field with a rich text editor
- Use **Tiptap** (recommended) or a similar editor
- Supported formatting:
  - Bold, italic, underline, strikethrough
  - Headings (H1, H2, H3)
  - Bullet list, numbered list
  - Code blocks (inline and block)
  - Links
  - Blockquotes
  - Horizontal rule
- Toolbar with formatting buttons (clean, minimal design)
- Store content as HTML in the database
- Render stored HTML safely when displaying tasks (sanitize on output to prevent XSS)
- Editor should be responsive and work on mobile
- Dark mode compatible
- Placeholder text: "Write your daily report..."

### 2. File/Image Attachments

**API Routes:**

**`POST /api/tasks/[id]/attachments`**

- Upload one or more files attached to a task
- Accept multipart form data
- Validate:
  - Allowed file types: jpg, jpeg, png, gif, webp, pdf, doc, docx, txt, csv, zip
  - Max file size: 10MB per file
  - Max 5 files per upload request
- Save files to `/uploads/attachments/{taskId}/`
- Create Attachment records in the database
- Return the created attachment records

**`GET /api/tasks/[id]/attachments`**

- List all attachments for a task
- Return: id, file_name, file_url, file_type, file_size, created_at

**`DELETE /api/tasks/[id]/attachments/[attachmentId]`**

- Delete an attachment
- Remove the file from storage
- Delete the database record
- Verify task ownership

**UI for Attachments:**

- On the create/edit task form, add a file upload zone:
  - Drag-and-drop area + click to browse
  - Show upload progress
  - Preview thumbnails for images
  - File name + size + type icon for non-image files
  - Remove button on each file
- On the task list/detail view:
  - Show attachment count badge on task cards
  - Expandable attachment list showing file names as clickable links
  - Image attachments show as small thumbnails (click to view full size in a lightbox/modal)
  - Non-image files show as download links

### 3. Bulk Operations

**API Routes:**

**`POST /api/tasks/bulk/delete`**

- Accept an array of task IDs
- Verify all tasks belong to the authenticated user
- Delete all specified tasks
- Log to ActivityLog
- Return count of deleted tasks

**`POST /api/tasks/bulk/status`**

- Accept an array of task IDs and a target status
- Verify ownership
- Update status for all specified tasks
- Log to ActivityLog
- Return count of updated tasks

**UI for Bulk Operations:**

- Add a "Select" mode toggle on the task list page
- When in select mode:
  - Each task card shows a checkbox
  - "Select All" / "Deselect All" button at the top
  - Bulk action bar appears at the bottom (fixed) showing:
    - Count of selected tasks: "3 tasks selected"
    - "Delete Selected" button (with confirmation dialog)
    - "Change Status" dropdown (apply a status to all selected)
    - "Cancel" button to exit select mode
- Keyboard: Shift+click to select a range

### 4. Duplicate Yesterday's Tasks

**API Route:**

**`POST /api/tasks/duplicate-previous`**

- Find the most recent day with tasks (yesterday or earlier)
- Duplicate all tasks from that day to today
- Copy: ticket_number, ticket_title, ticket_description, story_point, tags, status (reset to TODO)
- Set date to today
- Clear daily_report (user writes fresh reports)
- Don't copy attachments
- Return the newly created tasks

**UI:**

- Add a "Duplicate Previous Day" button on the task list page (near the "Add Task" button)
- Also show it on the dashboard nudge banner when no tasks are logged today:
  - "No tasks today. Add a new task or duplicate from your last working day."
- Confirmation dialog: "This will copy X tasks from {date} to today. Continue?"
- On success: toast notification + refresh task list

### 5. Audit Trail / Version History

**API Route:**

**`GET /api/tasks/[id]/history`**

- Return the version history for a task
- Includes: action (CREATED, UPDATED, DELETED), changes (JSON diff), user, timestamp
- Sorted by created_at descending

**UI:**

- Add a "History" tab or button on the task edit/detail view
- Show a timeline of changes:
  - "Created on March 10, 2026 at 2:30 PM"
  - "Updated on March 11, 2026 at 9:15 AM — Changed status from TODO to IN_PROGRESS, updated daily report"
  - Show which fields changed and old → new values where practical
- Clean timeline design with timestamps and action descriptions
- Expandable detail for each history entry

### 6. Task Detail View

- Create a proper task detail view/page (`/dashboard/tasks/[id]`) as an alternative to just editing:
  - Full display of all task fields (read-only)
  - Rendered rich text daily report
  - Attachment gallery
  - Tags displayed as pills
  - Version history timeline
  - "Edit" and "Delete" action buttons
  - Back button to return to task list

## Technical Requirements

- Rich text: use Tiptap with minimal extensions for bundle size
- Sanitize HTML output with DOMPurify or similar before rendering
- File uploads: use FormData and multipart handling
- Bulk operations: use database transactions for atomicity
- Version history changes should store a JSON diff (before/after for changed fields only)
- All new features should support dark mode
- All new API routes need auth verification and input validation

## Expected Deliverables

- Rich text editor on create/edit task forms
- File attachment upload, display, and delete
- Bulk delete and bulk status change with select mode
- Duplicate previous day's tasks
- Version history viewer for each task
- Task detail page
- All features with proper loading, error, and empty states
- Dark mode compatible

## Out of Scope

- Admin dashboard
- Export/import
- Reminders/email
- Testing
