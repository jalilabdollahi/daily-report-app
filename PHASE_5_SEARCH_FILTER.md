# Search, Filtering & Sorting

## Context

I am building a web application for writing and managing daily work reports. This document covers search, filtering, and sorting.

**Already in place:** Project setup, database, and layouts.
**Authentication already in place:** Authentication system.
**Task management already in place:** Core task CRUD with date grouping, tags, and toast notifications.
**Dashboard already in place:** User dashboard with stats, charts, recent tasks, date navigation, and announcements.

Refer to `prompt.txt` for full project requirements.

## Goal

Add powerful search, filtering, and sorting capabilities so users can quickly find any task in their history. Search should feel instant and intuitive.

## What to Build

### 1. Search API Enhancement

**Update `GET /api/tasks`** to support:

- `search` (string) — full-text search across ticket_number, ticket_title, ticket_description, and daily_report
- `status` (string or array) — filter by one or more statuses
- `tags` (string or array) — filter by tag names
- `startDate` / `endDate` — date range filter
- `sortBy` (string) — field to sort by: `date`, `created_at`, `story_point`, `ticket_number`, `ticket_title`
- `sortOrder` (string) — `asc` or `desc` (default: `desc`)
- `page` and `limit` for pagination

**Search implementation:**

- Use PostgreSQL `ILIKE` for case-insensitive search across multiple fields
- Use `OR` conditions: search term matches ticket_number OR ticket_title OR ticket_description OR daily_report
- Consider using PostgreSQL full-text search (`tsvector`/`tsquery`) for better performance if dataset is large
- Return matching tasks with highlighted/relevant snippets if feasible

### 2. Global Search Bar

- Add a search bar in the dashboard header (visible on all dashboard pages)
- Behavior:
  - Debounced input (300ms delay before triggering search)
  - As user types, show a dropdown with search results (max 5-8 results)
  - Each result shows: ticket number, title, date, status badge
  - Clicking a result navigates to that task's detail/edit page
  - Press Enter to go to full search results page
  - Press Escape to close the dropdown
- Keyboard shortcut: `Ctrl+K` / `Cmd+K` opens and focuses the search bar
- Use shadcn/ui Command component (cmdk) for the search palette, or a custom dropdown
- Show "No results found" message when search returns empty
- Show recent searches or suggestions when the input is empty

### 3. Full Search Results Page (`/dashboard/tasks/search` or enhance `/dashboard/tasks`)

- Display search results with the search term highlighted in titles/descriptions
- Show result count: "Found 23 tasks matching 'payment bug'"
- Keep all filters and sort options visible
- Results still grouped by date (or flat list with date column, depending on UX preference)
- Pagination for results
- Clear search button to reset

### 4. Filter Panel/Bar on Task List

Add a filter bar above the task list on `/dashboard/tasks`:

**Date Filter:**

- Quick presets: "Today", "Yesterday", "This Week", "This Month", "Last 30 Days", "Custom Range"
- Custom date range picker (start date + end date) using shadcn/ui DatePicker
- Show selected date range as a pill/chip

**Status Filter:**

- Multi-select checkboxes or toggle buttons for: TODO, IN_PROGRESS, DONE, BLOCKED
- Allow selecting multiple statuses
- Show as pill/chip when active

**Tag Filter:**

- Multi-select dropdown of existing tags
- Type to search tags
- Show selected tags as colored pills

**Active Filters Display:**

- Show all active filters as removable chips/pills above the task list
- "Clear all filters" button
- Filter count badge on the filter toggle button

### 5. Sort Controls

- Add sort controls next to the filter bar:
  - Sort by: Date, Created At, Story Points, Ticket Number, Title (dropdown select)
  - Order: Ascending ↑ / Descending ↓ (toggle button)
- Default: sort by date descending (newest first)
- Persist sort preference in URL query params

### 6. URL-Based State

- Sync all search, filter, and sort state with URL query parameters:
  - `/dashboard/tasks?search=bug&status=DONE&sortBy=date&sortOrder=desc&page=2`
- This allows:
  - Bookmarking filtered views
  - Sharing links to specific filtered results
  - Browser back/forward navigation
- Use `useSearchParams` from Next.js

### 7. Search Indexing (Database)

- Ensure proper database indexes exist for search performance:
  - Index on `ticket_number`
  - Index on `ticket_title`
  - Composite index on `(user_id, date)`
  - Index on `status`
- If using full-text search, create a GIN index on the tsvector column

### 8. Empty & Edge States

- No results: "No tasks match your filters. Try adjusting your search or filters."
- No tasks at all: "You haven't created any tasks yet. Start by adding your first task!"
- Loading: skeleton placeholders while search results load
- Error: "Something went wrong. Please try again."

## Technical Requirements

- Search debounce: 300ms (no API call on every keystroke)
- Use TanStack Query with search params as query keys (auto-refetch on filter change)
- Cancel previous search request when new one is made (AbortController)
- URL query params should be the source of truth for filters
- Keyboard navigation in search dropdown (arrow keys + enter)
- All filtering happens server-side (not client-side)

## Expected Deliverables

- Global search bar in header with dropdown results and Ctrl+K shortcut
- Full search results on the task list page
- Filter panel with date range, status, and tag filters
- Sort controls with multiple sort fields and order toggle
- URL-based filter/sort state
- Proper empty, loading, and error states
- Fast, debounced, server-side search

## Out of Scope

- User profile/settings
- Rich text editor, attachments, bulk ops
- Admin dashboard
- Export/import
