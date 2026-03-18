# User Profile, Settings & Theme

## Context

I am building a web application for writing and managing daily work reports. This document covers user profile, settings, and theme work.

**Already in place:** Project setup, database, and layouts.
**Authentication already in place:** Authentication system.
**Task management already in place:** Core task CRUD.
**Dashboard already in place:** User dashboard with stats and date organization.
**Search already in place:** Search, filtering, and sorting.

Refer to `prompt.txt` for full project requirements.

## Goal

Build the user profile and settings page where users can manage their account details, upload an avatar, change their password, configure theme preference (dark/light/system), and set reminder preferences.

## What to Build

### 1. Settings API Routes

**`GET /api/user/profile`**

- Return the authenticated user's profile data:
  - id, name, email, avatar_url, theme, reminder_enabled, reminder_time, role, created_at

**`PUT /api/user/profile`**

- Update user profile fields: name, email
- Validate with Zod:
  - Name: required, 2-50 characters
  - Email: required, valid format, unique (check against other users)
- Return updated user data
- Update the session with new data

**`PUT /api/user/password`**

- Change password
- Required fields: current_password, new_password, confirm_password
- Validate:
  - Current password must match (bcrypt compare)
  - New password: minimum 8 characters, at least one uppercase, one lowercase, one number
  - Confirm password must match new password
- Hash and update the password
- Log PASSWORD_CHANGE to ActivityLog
- Return success message

**`POST /api/user/avatar`**

- Upload avatar image
- Accept multipart form data (image file)
- Validate:
  - File type: jpg, jpeg, png, gif, webp only
  - Max file size: 2MB
- Save to local uploads directory (or S3 in production)
- Generate a unique filename
- Update user's avatar_url
- Return the new avatar URL

**`DELETE /api/user/avatar`**

- Remove the avatar
- Delete the file from storage
- Set avatar_url to null

**`PUT /api/user/preferences`**

- Update theme and reminder preferences:
  - theme: LIGHT, DARK, or SYSTEM
  - reminder_enabled: boolean
  - reminder_time: string (HH:MM format)
- Validate with Zod
- Return updated preferences

### 2. Settings Page (`/dashboard/settings`)

A clean settings page with tabbed or sectioned layout:

**Profile Section:**

- Avatar display with upload/change/remove buttons
  - Show current avatar or initials placeholder
  - Click to open file picker
  - Preview before upload
  - Remove button if avatar exists
- Name field (text input, pre-filled)
- Email field (text input, pre-filled)
- "Save Changes" button with loading state
- Success toast on save

**Password Section:**

- Current password field
- New password field (with show/hide toggle)
- Confirm new password field
- Password strength indicator (visual bar: weak/medium/strong)
- "Update Password" button with loading state
- Success toast on update
- Error display for wrong current password

**Appearance Section:**

- Theme toggle: Light / Dark / System (three-option radio group or segmented control)
- Preview of the selected theme (instant switch)
- Auto-save on change (no save button needed)

**Reminders Section:**

- Toggle switch: Enable daily reminders (on/off)
- Time picker: Reminder time (e.g., 17:00)
- Brief explanation text: "We'll remind you to log your daily tasks"
- Auto-save on change

**Account Section:**

- Show account creation date
- Show role (Admin/User)
- "Delete Account" button (danger zone)
  - Opens confirmation dialog
  - Type email to confirm
  - Deletes user and all their data
  - Logs out and redirects to login

### 3. Dark Mode Implementation

- Implement theme switching using `next-themes` or a custom solution:
  - LIGHT: light color scheme
  - DARK: dark color scheme
  - SYSTEM: follow OS preference
- Tailwind CSS dark mode using `class` strategy
- All existing components should support dark mode:
  - Update layout backgrounds, text colors, borders
  - Cards, buttons, inputs, dropdowns, modals
  - Charts and stats cards
  - Auth pages
- Persist the theme choice:
  - In user preferences (database) for logged-in users
  - In localStorage for immediate application (no flash)
- Theme should apply instantly without page reload
- No flash of wrong theme on page load (use a script in `<head>`)

### 4. Avatar Component

- Create a reusable `UserAvatar` component:
  - Shows the avatar image if `avatar_url` exists
  - Falls back to initials (first letter of first + last name) with a colored background
  - Multiple sizes: sm, md, lg
  - Rounded/circular shape
- Use this component in:
  - Header user menu (already exists from auth work, update it)
  - Settings page
  - Anywhere else user avatar is displayed

### 5. File Upload Setup

- Create an uploads directory (`/public/uploads/avatars/`)
- Add the directory to `.gitignore`
- Create a reusable file upload utility function
- Handle file validation (type, size)
- Generate unique filenames to avoid conflicts
- This upload infrastructure will also be reused for task attachments later

### 6. Update Session on Profile Change

- When user updates their name, email, or avatar, update the NextAuth session
- The header user menu should reflect changes immediately without page reload
- Use NextAuth's `update()` function or trigger a session refresh

## Technical Requirements

- Image uploads: max 2MB, allowed types: jpg, jpeg, png, gif, webp
- Use `next-themes` for theme management with Tailwind dark mode
- No theme flash on initial page load
- Form validation on client and server
- Proper error handling for file uploads (file too large, wrong type, etc.)
- Password strength validation should match registration requirements
- All changes should reflect immediately in the UI

## Expected Deliverables

- Settings page with profile, password, appearance, reminders, and account sections
- Working avatar upload, change, and remove
- Dark/light/system theme toggle that works across all pages
- Password change with proper validation
- Reminder preference settings
- Reusable UserAvatar component
- Delete account functionality
- Updated user menu in header reflecting profile changes

## Out of Scope

- Rich text editor, attachments for tasks, bulk ops
- Admin dashboard
- Export/import
- Actual email reminder sending
