# Project Setup & Database Foundation

## Context

I am building a web application for writing and managing daily work reports. This document covers the initial project setup and database foundation. Nothing has been built yet — this is the starting point.

Refer to `prompt.txt` in this folder for the full project requirements.

## Goal

Set up the complete project foundation: Next.js app, database schema, Prisma ORM, Tailwind CSS, UI component library, and base layout. By the end of this phase, the project should compile, connect to the database, and display a basic shell layout.

## What to Build

### 1. Project Initialization

- Initialize a Next.js 14+ project with App Router and TypeScript
- Install and configure:
  - Tailwind CSS
  - Prisma ORM
  - shadcn/ui (with Radix UI primitives)
  - React Hook Form + Zod for form validation
  - TanStack Query (React Query) for data fetching
  - Lucide React for icons
- Set up path aliases (`@/` for `src/`)
- Configure `tsconfig.json` properly

### 2. Project Folder Structure

Create a clean, scalable folder structure:

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth route group (login, register, reset)
│   ├── (dashboard)/        # Protected user routes
│   ├── (admin)/            # Admin routes
│   ├── api/                # API routes
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Header, Sidebar, Footer, Navigation
│   ├── forms/              # Reusable form components
│   └── shared/             # Shared/common components
├── lib/
│   ├── db.ts               # Prisma client instance
│   ├── utils.ts            # Utility functions
│   └── validations/        # Zod schemas
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── styles/                 # Global styles
└── config/                 # App configuration constants
```

### 3. Database Schema (Prisma)

Design and create the complete Prisma schema with all tables needed for the full project:

**Users table:**

- id (UUID, primary key, default auto-generated)
- name (String)
- email (String, unique)
- password_hash (String)
- role (Enum: ADMIN, USER — default USER)
- avatar_url (String, nullable)
- theme (Enum: LIGHT, DARK, SYSTEM — default SYSTEM)
- reminder_enabled (Boolean, default true)
- reminder_time (String, default "17:00")
- is_active (Boolean, default true)
- created_at (DateTime, default now)
- updated_at (DateTime, auto-updated)

**Tasks table (daily report items):**

- id (UUID, primary key)
- user_id (Foreign key → Users)
- date (DateTime, date of the task)
- ticket_number (String)
- ticket_title (String)
- ticket_description (String, text/long)
- story_point (Float)
- daily_report (String, text/long — rich text stored as HTML)
- status (Enum: TODO, IN_PROGRESS, DONE, BLOCKED — default TODO)
- created_at (DateTime, default now)
- updated_at (DateTime, auto-updated)

**Tags table:**

- id (UUID, primary key)
- name (String, unique)
- color (String, nullable — hex color code)
- created_at (DateTime, default now)

**TaskTags (join table):**

- task_id (Foreign key → Tasks)
- tag_id (Foreign key → Tags)

**Attachments table:**

- id (UUID, primary key)
- task_id (Foreign key → Tasks)
- file_name (String)
- file_url (String)
- file_type (String)
- file_size (Int)
- created_at (DateTime, default now)

**TaskHistory table (audit trail):**

- id (UUID, primary key)
- task_id (Foreign key → Tasks)
- user_id (Foreign key → Users)
- action (Enum: CREATED, UPDATED, DELETED)
- changes (JSON — snapshot of changed fields)
- created_at (DateTime, default now)

**ActivityLog table:**

- id (UUID, primary key)
- user_id (Foreign key → Users)
- action (String — e.g., LOGIN, LOGOUT, CREATE_TASK, EDIT_TASK, DELETE_TASK)
- target_id (String, nullable)
- target_type (String, nullable)
- metadata (JSON, nullable)
- ip_address (String, nullable)
- created_at (DateTime, default now)

**Announcements table:**

- id (UUID, primary key)
- admin_id (Foreign key → Users)
- title (String)
- message (String, text)
- is_active (Boolean, default true)
- created_at (DateTime, default now)
- expires_at (DateTime, nullable)

**Add proper indexes on:**

- Tasks: user_id, date, ticket_number, status
- ActivityLog: user_id, action, created_at
- Tags: name

**Add proper relations and cascading deletes where appropriate.**

### 4. Database Setup

- Create Prisma client singleton (`lib/db.ts`)
- Run initial migration
- Create a seed file (`prisma/seed.ts`) with:
  - One admin user (email: admin@example.com, password: admin123)
  - One regular user (email: user@example.com, password: user123)
  - A few sample tags (e.g., "Bug", "Feature", "Improvement", "Urgent")
  - A few sample tasks for the regular user

### 5. Environment Configuration

- Create `.env.example` with all required variables:
  ```
  DATABASE_URL=postgresql://user:password@localhost:5432/daily_reports
  NEXTAUTH_SECRET=your-secret-here
  NEXTAUTH_URL=http://localhost:3000
  UPLOAD_DIR=./uploads
  ```
- Create `.env` for local development
- Add `.env` to `.gitignore`

### 6. Base Layout Components

- Create a root layout (`app/layout.tsx`) with:
  - HTML lang attribute
  - Proper meta tags
  - Font setup (Inter or similar clean font)
  - TanStack Query provider
  - Theme provider (for dark/light mode — just the provider shell, no toggle yet)
- Create a basic **app shell layout** for the dashboard:
  - Responsive sidebar navigation (collapsible on mobile)
  - Top header bar with placeholder for user menu and search
  - Main content area
  - Use shadcn/ui components for the shell
- Create a separate **auth layout** (centered card, no sidebar)
- Create a separate **admin layout** (admin sidebar with different navigation)
- All layouts should be responsive and mobile-friendly

### 7. Utility Setup

- Create `lib/utils.ts` with common helpers (cn function for classnames, date formatters, etc.)
- Set up proper TypeScript types in `types/` folder
- Configure ESLint and Prettier

## Technical Requirements

- Use TypeScript strict mode
- All components should be properly typed
- Use server components by default, client components only when needed
- Prisma schema should use UUID for all primary keys
- Database should be PostgreSQL

## Expected Deliverables

- A running Next.js app (`npm run dev` works)
- Database connected and migrated with seed data
- Base layout visible with sidebar, header, and main content area
- Auth layout shell ready
- Admin layout shell ready
- Clean, well-organized folder structure
- All dependencies installed and configured

## Out of Scope

- Authentication logic
- Task CRUD
- Dashboard content
- Search/filter
- Any functional pages beyond layout shells
