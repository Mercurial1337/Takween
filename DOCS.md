# Takween — Full Project Documentation

> **Takween** (تكوين) is a graduation-project teaming platform built for university students. It helps students discover projects, form teams, manage memberships, and collaborate — all through an invite-only, Arabic-first web application.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
  - [Data Flow](#data-flow)
  - [Authentication Flow](#authentication-flow)
  - [Role-Based Access](#role-based-access)
- [Database Schema](#database-schema)
  - [Entity Relationship Diagram](#entity-relationship-diagram)
  - [Tables Reference](#tables-reference)
  - [RPC Functions](#rpc-functions)
  - [Triggers](#triggers)
  - [Row Level Security (RLS)](#row-level-security-rls)
  - [Migrations](#migrations)
- [Frontend Architecture](#frontend-architecture)
  - [Route Groups](#route-groups)
  - [Pages Reference](#pages-reference)
  - [Component Library](#component-library)
  - [Contexts (Global State)](#contexts-global-state)
  - [Custom Hooks](#custom-hooks)
  - [Utility Functions](#utility-functions)
  - [Validation Schemas](#validation-schemas)
  - [Design System](#design-system)
- [API Routes](#api-routes)
- [Email System](#email-system)
- [Testing](#testing)
  - [Test Setup](#test-setup)
  - [Running Tests](#running-tests)
  - [Test Coverage](#test-coverage)
- [CI/CD Pipelines](#cicd-pipelines)
  - [CI — Continuous Integration](#ci--continuous-integration)
  - [CD — Continuous Deployment](#cd--continuous-deployment)
- [Key User Flows](#key-user-flows)
- [Contributing](#contributing)
  - [Branch Naming](#branch-naming)
  - [Commit Conventions](#commit-conventions)
  - [Code Style](#code-style)
  - [Adding a New Feature](#adding-a-new-feature)
- [FAQ](#faq)

---

## Overview

Takween is a **Next.js 16** web application with a **Supabase** backend that enables universities to manage graduation projects and team formation. The platform is **Arabic-first** (RTL layout) and uses an **invite-only** registration system controlled by administrators.

### Core Features

| Feature | Description |
|---------|-------------|
| **Project Browsing** | Students explore available graduation projects, filter by department |
| **Team Formation** | Create teams, send/receive join requests, add manual (unregistered) members |
| **Notifications** | Real-time notifications for join requests, acceptances, rejections |
| **Profile Management** | Skills, social links (GitHub, LinkedIn), academic level |
| **Invite-Only Registration** | Admins generate invite tokens with usage limits |
| **Admin Dashboard** | Full CRUD for projects, departments, skills, levels, teams, audit logs, and feedback |
| **User Feedback** | Students submit bugs, feature requests, and general feedback |
| **Audit Logging** | Tracks admin actions for accountability |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.2.6 |
| **UI Library** | React | 19.2.4 |
| **Styling** | CSS Modules + CSS Custom Properties | — |
| **Backend / DB** | Supabase (PostgreSQL + Auth + Realtime) | — |
| **Auth** | Supabase Auth with SSR (`@supabase/ssr`) | 0.10.3 |
| **Validation** | Zod | 4.4.3 |
| **Icons** | Lucide React | 1.16.0 |
| **Email** | Nodemailer (SMTP) | 8.0.7 |
| **Testing** | Vitest + React Testing Library | 4.1.7 |
| **Linting** | ESLint + eslint-config-next | 9.x |
| **CI/CD** | GitHub Actions → Vercel + Supabase CLI | — |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- A **Supabase** project ([supabase.com](https://supabase.com))
- An SMTP provider for transactional emails (optional for dev)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Mercurial1337/Takween.git
cd Takween

# 2. Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root. Use `.env.local.example` as a template:

```env
# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# ── Email (SMTP) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@takween.com
```

| Variable | Public? | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key (safe for browsers) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Server-only service role key (bypasses RLS) |
| `SMTP_HOST` | ❌ | SMTP server hostname |
| `SMTP_PORT` | ❌ | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | ❌ | SMTP authentication username |
| `SMTP_PASS` | ❌ | SMTP authentication password |
| `SMTP_FROM` | ❌ | Sender email address shown in emails |

### Database Setup

1. Go to your Supabase project dashboard → **SQL Editor**
2. Run the migration files in order from `supabase/migrations/`:
   - `001_initial_schema.sql` through `016_manual_members_social.sql`
3. Run `supabase/seed.sql` to populate reference data (departments, levels, skills)
4. Set up the first admin user:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
   ```

> **Tip:** If you have the Supabase CLI installed, you can run `supabase db push` to apply all migrations automatically.

### Running the App

```bash
# Development server (hot reload)
npm run dev

# Production build
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Project Structure

```
Takween/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint → Test → Build on every PR/push
│       └── cd.yml                    # Deploy to Vercel + Supabase on main
│
├── public/
│   └── link-preview.jpg              # Open Graph / social preview image
│
├── src/
│   ├── __tests__/                    # All test files (mirrors src/ structure)
│   │   ├── setup.js                  # Vitest global setup & mocks
│   │   ├── app/                      # Page-level tests
│   │   ├── components/               # Component tests
│   │   ├── contexts/                 # Context tests
│   │   └── lib/                      # Utility & validator tests
│   │
│   ├── app/                          # Next.js App Router
│   │   ├── layout.js                 # Root layout (providers, fonts, metadata)
│   │   ├── page.js                   # Landing page (/ route)
│   │   ├── error.js                  # Global error boundary
│   │   ├── not-found.js              # Custom 404 page
│   │   ├── globals.css               # Design system & global styles
│   │   │
│   │   ├── (auth)/                   # Auth route group (no layout nesting)
│   │   │   ├── layout.js             # Centered auth layout
│   │   │   ├── login/                # /login
│   │   │   ├── register/             # /register
│   │   │   ├── forgot-password/      # /forgot-password
│   │   │   └── update-password/      # /update-password
│   │   │
│   │   ├── (dashboard)/              # Dashboard route group
│   │   │   ├── layout.js             # Authenticated layout with Navbar
│   │   │   ├── dashboard/            # /dashboard (main hub)
│   │   │   ├── projects/             # /projects & /projects/[id]
│   │   │   ├── profile/              # /profile (edit profile)
│   │   │   ├── notifications/        # /notifications
│   │   │   └── feedback/             # /feedback (submit feedback)
│   │   │
│   │   ├── admin/                    # Admin section
│   │   │   ├── layout.js             # Admin layout with sidebar
│   │   │   ├── page.js               # /admin (overview stats)
│   │   │   ├── projects/             # Project CRUD
│   │   │   ├── teams/                # Team management
│   │   │   ├── invites/              # Invite token management
│   │   │   ├── departments/          # Department CRUD
│   │   │   ├── skills/               # Skills catalog CRUD
│   │   │   ├── levels/               # Academic levels CRUD
│   │   │   ├── audit/                # Audit log viewer
│   │   │   └── feedback/             # Feedback management
│   │   │
│   │   └── api/                      # API route handlers
│   │       ├── auth/callback/        # OAuth/magic-link callback
│   │       └── email/send/           # SMTP email sending endpoint
│   │
│   ├── components/                   # Reusable React components
│   │   ├── auth/                     # Auth forms (Login, Register, etc.)
│   │   ├── landing/                  # Landing page sections
│   │   ├── layout/                   # Navbar, Footer, PageHeader
│   │   └── ui/                       # Design system primitives (14 components)
│   │
│   ├── contexts/                     # React Context providers
│   │   ├── AuthContext.jsx           # User session & profile state
│   │   ├── NotificationsContext.jsx  # Unread notification count
│   │   └── ToastContext.jsx          # Toast notification system
│   │
│   ├── hooks/                        # Custom React hooks
│   │   └── useDebounce.js            # Debounced value hook
│   │
│   └── lib/                          # Shared utilities
│       ├── supabase/
│       │   ├── client.js             # Browser Supabase client (singleton)
│       │   ├── server.js             # Server Supabase client (per-request)
│       │   ├── middleware.js          # Auth session refresh & route protection
│       │   └── audit.js              # Audit log insertion helper
│       ├── utils.js                  # General utility functions
│       ├── validators.js             # Zod validation schemas
│       └── rateLimit.js              # In-memory API rate limiter
│
├── supabase/
│   ├── migrations/                   # 16 sequential SQL migration files
│   │   ├── 001_initial_schema.sql    # Core tables, RLS, indexes, functions
│   │   ├── 002_admin_invites.sql     # Invite token system
│   │   ├── ...
│   │   └── 016_manual_members_social.sql
│   ├── seed.sql                      # Reference data (departments, skills, levels)
│   ├── functions/
│   │   └── send-email/               # Supabase Edge Function for emails
│   └── templates/
│       └── confirm_signup.html       # Registration confirmation email template
│
├── middleware.js                     # Next.js middleware (delegates to lib/supabase/middleware)
├── next.config.mjs                   # Next.js configuration
├── vitest.config.mjs                 # Vitest test runner configuration
├── eslint.config.mjs                 # ESLint configuration
├── package.json                      # Dependencies & scripts
└── .env.local.example                # Environment variable template
```

---

## Architecture Overview

### Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Browser    │────▶│   Next.js    │────▶│    Supabase      │
│  (React 19)  │◀────│  App Router  │◀────│  (PostgreSQL)    │
└─────────────┘     └──────────────┘     └──────────────────┘
       │                    │                      │
       │              ┌─────┴─────┐          ┌─────┴─────┐
       │              │ Server    │          │ Auth      │
       │              │ Components│          │ (JWT)     │
       │              │ & Actions │          ├───────────┤
       │              └───────────┘          │ Realtime  │
       │                    │                │ (WebSocket│
       │              ┌─────┴─────┐          │  for      │
       │              │ API Routes│          │  notifs)  │
       │              │ /api/*    │          ├───────────┤
       │              └───────────┘          │ RLS       │
       │                    │                │ Policies  │
       │              ┌─────┴─────┐          └───────────┘
       │              │ Nodemailer│
       │              │ (SMTP)    │
       │              └───────────┘
       │
  ┌────┴────┐
  │ CSS     │
  │ Modules │
  └─────────┘
```

The app follows the **Next.js App Router** pattern:

1. **Server Components** handle data fetching directly from Supabase on the server
2. **Client Components** (marked with `'use client'`) handle interactivity and are passed data as props
3. **Server Actions** handle form submissions and mutations
4. **API Routes** handle auth callbacks and email sending
5. **Middleware** refreshes auth sessions and protects routes on every request

### Authentication Flow

```
┌──────────┐    ┌───────────┐    ┌──────────────┐    ┌──────────┐
│  User    │───▶│ /register │───▶│ Supabase     │───▶│ Email    │
│          │    │ (invite   │    │ Auth signUp  │    │ confirm  │
│          │    │  token)   │    │              │    │ link     │
└──────────┘    └───────────┘    └──────────────┘    └──────────┘
                                                          │
┌──────────┐    ┌───────────┐    ┌──────────────┐         │
│  User    │◀───│ /dashboard│◀───│ /api/auth/   │◀────────┘
│  (authed)│    │           │    │ callback     │
└──────────┘    └───────────┘    └──────────────┘
```

1. Admin generates an **invite token** from `/admin/invites`
2. Student visits `/register?token=<invite-token>`
3. Supabase Auth sends a **confirmation email** (custom HTML template)
4. Student clicks the link → `/api/auth/callback` exchanges the code for a session
5. A **database trigger** (`handle_new_user`) auto-creates the student's `profiles` row
6. On every subsequent request, **middleware** refreshes the session cookie

### Role-Based Access

| Role | Access |
|------|--------|
| **Unauthenticated** | Landing page, login, register, forgot-password |
| **Student** (`role = 'student'`) | Dashboard, projects, profile, notifications, feedback |
| **Admin** (`role = 'admin'`) | Everything a student can access + full admin dashboard |

Route protection is handled at two levels:
1. **Middleware** (`middleware.js`) — Redirects unauthenticated users away from protected routes
2. **Layout Guards** — Admin layout checks `profiles.role === 'admin'` server-side

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  departments │       │    levels    │       │    skills    │
│──────────────│       │──────────────│       │──────────────│
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ name (UNIQUE)│       │ name (UNIQUE)│       │ name (UNIQUE)│
│ created_at   │       │ sort_order   │       │ is_predefined│
└──────┬───────┘       │ created_at   │       │ created_at   │
       │               └──────┬───────┘       └──────┬───────┘
       │                      │                      │
       │               ┌──────┴───────┐       ┌──────┴────────┐
       │               │   profiles   │───────│ profile_skills│
       │               │──────────────│       │───────────────│
       │               │ id (PK/FK)   │       │ profile_id(FK)│
       │               │ full_name    │       │ skill_id (FK) │
       │               │ email        │       └───────────────┘
       │               │ whatsapp     │
       │               │ level_id(FK) │
       │               │ linkedin_url │
       │               │ github_url   │
       │               │ avatar_url   │
       │               │ role         │
       │               └──────┬───────┘
       │                      │
  ┌────┴───────┐       ┌──────┴───────┐       ┌──────────────┐
  │  projects  │───────│    teams     │───────│ team_members │
  │────────────│       │──────────────│       │──────────────│
  │ id (PK)    │       │ id (PK)      │       │ id (PK)      │
  │ title      │       │ project_id   │       │ team_id (FK) │
  │ description│       │   (FK,UNIQUE)│       │ user_id (FK) │
  │ dept_id(FK)│       │ owner_id(FK) │       │ role         │
  │ max_team   │       │ status       │       │ joined_at    │
  │ status     │       └──────┬───────┘       └──────────────┘
  │ created_by │              │
  └────────────┘       ┌──────┴───────┐       ┌──────────────┐
                       │manual_members│       │join_requests │
                       │──────────────│       │──────────────│
                       │ id (PK)      │       │ id (PK)      │
                       │ team_id (FK) │       │ team_id (FK) │
                       │ full_name    │       │ user_id (FK) │
                       │ whatsapp     │       │ message      │
                       │ notes        │       │ status       │
                       │ added_by(FK) │       └──────────────┘
                       └──────────────┘

  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │notifications │    │ audit_logs   │    │invite_tokens │
  │──────────────│    │──────────────│    │──────────────│
  │ id (PK)      │    │ id (PK)      │    │ id (PK)      │
  │ user_id (FK) │    │ actor_id(FK) │    │ token (UUID) │
  │ type         │    │ action       │    │ created_by   │
  │ title        │    │ target_type  │    │ max_uses     │
  │ body         │    │ target_id    │    │ current_uses │
  │ metadata     │    │ details      │    │ is_active    │
  │ is_read      │    │ created_at   │    │ expires_at   │
  └──────────────┘    └──────────────┘    └──────────────┘

  ┌──────────────┐
  │user_feedback │
  │──────────────│
  │ id (PK)      │
  │ user_id (FK) │
  │ type         │
  │ message      │
  │ email        │
  │ status       │
  │ admin_notes  │
  └──────────────┘
```

### Tables Reference

#### `profiles`
Extends Supabase `auth.users`. Created automatically via trigger on user signup.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` (PK, FK→auth.users) | User's auth ID |
| `full_name` | `TEXT` | Student's full name |
| `email` | `TEXT` | Email address |
| `whatsapp_number` | `TEXT` | WhatsApp contact number |
| `level_id` | `UUID` (FK→levels) | Academic year/level |
| `linkedin_url` | `TEXT` | LinkedIn profile URL |
| `github_url` | `TEXT` | GitHub profile URL |
| `avatar_url` | `TEXT` | Profile picture URL |
| `role` | `TEXT` | `'student'` or `'admin'` |
| `created_at` | `TIMESTAMPTZ` | Registration timestamp |
| `updated_at` | `TIMESTAMPTZ` | Last profile update |

#### `projects`
Graduation projects created by admins.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` (PK) | Project ID |
| `title` | `TEXT` | Project title |
| `description` | `TEXT` | Detailed description |
| `department_id` | `UUID` (FK→departments) | Owning department |
| `max_team_size` | `INTEGER` | Maximum team members (1–20, default 5) |
| `status` | `TEXT` | `'open'` or `'closed'` |
| `created_by` | `UUID` (FK→profiles) | Admin who created it |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |

#### `teams`
A team is always linked to exactly one project (1:1 via `UNIQUE` constraint on `project_id`).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` (PK) | Team ID |
| `project_id` | `UUID` (FK→projects, UNIQUE) | Linked project |
| `owner_id` | `UUID` (FK→profiles) | Team owner/creator |
| `status` | `TEXT` | `'recruiting'` or `'closed'` |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |

#### `team_members`
Registered platform users who are part of a team.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` (PK) | Member record ID |
| `team_id` | `UUID` (FK→teams) | Team |
| `user_id` | `UUID` (FK→profiles) | User |
| `role` | `TEXT` | `'owner'` or `'member'` |
| `joined_at` | `TIMESTAMPTZ` | When they joined |

#### `manual_members`
Non-registered team members added manually by the team owner.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` (PK) | Record ID |
| `team_id` | `UUID` (FK→teams) | Team |
| `full_name` | `TEXT` | Person's name |
| `whatsapp_number` | `TEXT` | Contact number |
| `notes` | `TEXT` | Additional notes |
| `added_by` | `UUID` (FK→profiles) | Who added them |

#### `join_requests`
Requests from students to join a team.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` (PK) | Request ID |
| `team_id` | `UUID` (FK→teams) | Target team |
| `user_id` | `UUID` (FK→profiles) | Requesting user |
| `message` | `TEXT` | Optional message |
| `status` | `TEXT` | `'pending'`, `'accepted'`, or `'rejected'` |

> A unique partial index ensures only one pending request per user per team.

#### `notifications`
In-app notifications delivered to users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` (PK) | Notification ID |
| `user_id` | `UUID` (FK→profiles) | Recipient |
| `type` | `TEXT` | Event type (see below) |
| `title` | `TEXT` | Short notification title |
| `body` | `TEXT` | Notification message body |
| `metadata` | `JSONB` | Extra data (team ID, request ID, etc.) |
| `is_read` | `BOOLEAN` | Read status |

**Notification types:** `request_received`, `request_accepted`, `request_rejected`, `member_removed`, `member_left`, `team_closed`, `team_deleted`, `ownership_transferred`

#### `invite_tokens`
Admin-generated registration invite tokens.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` (PK) | Token record ID |
| `token` | `UUID` (UNIQUE) | The actual token value |
| `created_by` | `UUID` (FK→profiles) | Admin who created it |
| `max_uses` | `INTEGER` | Maximum allowed uses |
| `current_uses` | `INTEGER` | Current usage count |
| `is_active` | `BOOLEAN` | Whether the token is active |
| `expires_at` | `TIMESTAMPTZ` | Optional expiration |

#### `departments`, `levels`, `skills`
Reference/lookup tables managed by admins.

#### `audit_logs`
Server-side audit trail (no RLS — accessed only via service role).

| Column | Type | Description |
|--------|------|-------------|
| `actor_id` | `UUID` (FK→profiles) | Who performed the action |
| `action` | `TEXT` | What was done |
| `target_type` | `TEXT` | Entity type (e.g., `'project'`, `'team'`) |
| `target_id` | `UUID` | Entity ID |
| `details` | `JSONB` | Additional details |

#### `user_feedback`
Student-submitted feedback.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | `UUID` (FK→profiles) | Submitter |
| `type` | `TEXT` | `'bug'`, `'feature'`, or `'general'` |
| `message` | `TEXT` | Feedback content |
| `status` | `TEXT` | `'new'`, `'reviewed'`, or `'resolved'` |
| `admin_notes` | `TEXT` | Admin response/notes |

### RPC Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `are_teammates` | `user_a UUID, user_b UUID` | `BOOLEAN` | Check if two users share a team |
| `get_team_member_count` | `p_team_id UUID` | `INTEGER` | Total members (registered + manual) |
| `is_user_in_project_team` | `p_user_id UUID, p_project_id UUID` | `BOOLEAN` | Check if user already has a team for a project |
| `use_invite_token` | `p_token UUID` | `BOOLEAN` | Validate and atomically increment invite token usage |

### Triggers

| Trigger | Table | Event | Description |
|---------|-------|-------|-------------|
| `set_profiles_updated_at` | `profiles` | `BEFORE UPDATE` | Auto-updates `updated_at` |
| `set_projects_updated_at` | `projects` | `BEFORE UPDATE` | Auto-updates `updated_at` |
| `set_teams_updated_at` | `teams` | `BEFORE UPDATE` | Auto-updates `updated_at` |
| `set_join_requests_updated_at` | `join_requests` | `BEFORE UPDATE` | Auto-updates `updated_at` |
| `handle_new_user` | `auth.users` | `AFTER INSERT` | Auto-creates `profiles` row from auth metadata |
| `notify_on_join_request` | `join_requests` | `AFTER INSERT` | Sends notification to team owner |
| `notify_on_request_status_change` | `join_requests` | `AFTER UPDATE` | Notifies requester of accept/reject; auto-adds accepted members |

### Row Level Security (RLS)

RLS is enabled on **all tables**. Key policy patterns:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `departments` | Everyone | Admin only | Admin only | Admin only |
| `levels` | Everyone | Admin only | Admin only | Admin only |
| `skills` | Everyone | Authenticated users | Admin only | Admin only |
| `profiles` | Everyone | Own profile only | Own profile only | — |
| `projects` | Everyone | Admin only | Admin only | Admin only |
| `teams` | Everyone | Auth'd (if not already in project team) | Owner only | Owner only |
| `team_members` | Everyone | Owner or self | Owner | Owner or self |
| `join_requests` | Own or team owner's | Self only | Team owner | — |
| `notifications` | Own only | System (all) | Own only | — |

### Migrations

Migrations are in `supabase/migrations/` and must be applied in order:

| # | File | Description |
|---|------|-------------|
| 001 | `001_initial_schema.sql` | Core tables, RLS, indexes, helper functions, triggers |
| 002 | `002_admin_invites.sql` | Invite token system |
| 003 | `003_notifications_webhook.sql` | Auto-notification triggers for join requests |
| 004 | `004_auto_profile_trigger.sql` | Auto-create profile on user signup |
| 005 | `005_min_team_size.sql` | Add min/max team size to projects |
| 006 | `006_team_department.sql` | Department assignment for teams |
| 007 | `007_team_merge_requests.sql` | Team merge request system |
| 008 | `008_audit_logs.sql` | Audit log table |
| 009 | `009_student_directory.sql` | Student search view and RPC |
| 010 | `010_project_scoped_lft.sql` | Per-project "looking for team" status |
| 011 | `011_team_description.sql` | Team description field |
| 012 | `012_featured_projects.sql` | Featured project flag |
| 013 | `013_update_graduation_project_desc.sql` | Change description to TEXT type |
| 014 | `014_user_feedback.sql` | User feedback table |
| 015 | `015_manual_members_public.sql` | Public read access for manual members |
| 016 | `016_manual_members_social.sql` | Social links on profiles |

---

## Frontend Architecture

### Route Groups

Next.js route groups (parenthesized folders) are used to organize routes that share layouts without affecting the URL:

| Group | Path Prefix | Layout | Purpose |
|-------|------------|--------|---------|
| `(auth)` | `/login`, `/register`, etc. | Centered, minimal | Authentication pages |
| `(dashboard)` | `/dashboard`, `/projects`, etc. | Navbar + authenticated | Student-facing pages |
| `admin` | `/admin/*` | Sidebar + admin-only | Admin dashboard |

### Pages Reference

#### Landing & Error Pages

| Route | File | Type | Description |
|-------|------|------|-------------|
| `/` | `app/page.js` | Server | Landing page (redirects to `/dashboard` if authenticated) |
| — | `app/error.js` | Client | Global error boundary with retry |
| — | `app/not-found.js` | Server | Custom 404 page |

#### Auth Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `LoginForm` | Email + password login |
| `/register` | `RegisterForm` | Invite-only registration (reads `?token=` from URL) |
| `/forgot-password` | `ForgotPasswordForm` | Request password reset email |
| `/update-password` | `UpdatePasswordForm` | Set new password (after reset link) |

#### Dashboard Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Main hub — shows profile status, team info, project details, join requests |
| `/projects` | Browse & search all graduation projects with filters (department, status) |
| `/projects/[id]` | Project detail page — team info, join/merge actions |
| `/profile` | Edit profile: name, skills (tag input), social links, academic level |
| `/notifications` | View & manage notifications with mark-as-read |
| `/feedback` | Submit feedback (bug / feature / general) |

#### Admin Pages

| Route | Description |
|-------|-------------|
| `/admin` | Overview dashboard with aggregate stats |
| `/admin/projects` | CRUD for graduation projects |
| `/admin/teams` | View/manage all teams, handle merge requests |
| `/admin/invites` | Generate & manage registration invite tokens |
| `/admin/departments` | CRUD for departments |
| `/admin/skills` | CRUD for skills catalog |
| `/admin/levels` | CRUD for academic levels |
| `/admin/audit` | Browse audit logs with action filter & pagination |
| `/admin/feedback` | View & manage user feedback, update status |

### Component Library

All components follow the pattern `ComponentName/ComponentName.jsx` + `ComponentName.module.css`.

#### UI Primitives (`src/components/ui/`)

| Component | Key Props | Description |
|-----------|-----------|-------------|
| **Avatar** | `src`, `name`, `size` | User avatar with initials fallback |
| **Badge** | `variant`, `children` | Status badges (success, warning, danger, info) |
| **Button** | `variant`, `size`, `loading`, `disabled`, `icon` | Primary / secondary / danger / ghost buttons with loading spinner |
| **Card** | `children`, `className`, `padding` | Container card with shadow and border |
| **EmptyState** | `icon`, `title`, `description`, `action` | Placeholder for empty lists |
| **Icons** | — | Centralized re-exports from `lucide-react` |
| **Input** | `label`, `error`, `icon`, `type` | Form input with label, validation error, and optional icon |
| **Modal** | `isOpen`, `onClose`, `title`, `children`, `actions` | Modal dialog with overlay backdrop |
| **Pagination** | `currentPage`, `totalPages`, `onPageChange` | Page navigation controls |
| **Select** | `label`, `options`, `error`, `value`, `onChange` | Dropdown select with label and error state |
| **Skeleton** | `width`, `height`, `variant` | Loading skeleton placeholder |
| **Tag** | `children`, `onRemove`, `variant` | Removable tag/chip element |
| **TagInput** | `tags`, `onAdd`, `onRemove`, `suggestions`, `placeholder` | Multi-tag input with autocomplete dropdown |
| **Toast** | — | Auto-dismissing toast notifications (via `ToastContext`) |

#### Auth Components (`src/components/auth/`)

| Component | Description |
|-----------|-------------|
| `LoginForm` | Email + password form → `supabase.auth.signInWithPassword()` |
| `RegisterForm` | Invite-only registration → `supabase.auth.signUp()` with metadata |
| `ForgotPasswordForm` | Email form → `supabase.auth.resetPasswordForEmail()` |
| `UpdatePasswordForm` | New password form → `supabase.auth.updateUser()` |

#### Landing Components (`src/components/landing/`)

| Component | Description |
|-----------|-------------|
| `HeroSection` | Animated hero banner with gradient background and CTA buttons |
| `FeaturesSection` | Feature cards grid (team building, project browsing, skills, dashboard) |
| `HowItWorks` | Step-by-step guide cards (Register → Profile → Team → Project) |
| `CTASection` | Bottom call-to-action with register button |

#### Layout Components (`src/components/layout/`)

| Component | Description |
|-----------|-------------|
| `Navbar` | Top navigation with user avatar, links, notification badge, admin link, mobile hamburger |
| `Footer` | Site footer with copyright and links |
| `PageHeader` | Reusable page title bar with optional subtitle and action button |

### Contexts (Global State)

#### `AuthContext` (`src/contexts/AuthContext.jsx`)

Provides authentication state to the entire app.

```jsx
const { user, profile, loading, isAdmin, signOut } = useAuth();
```

| Value | Type | Description |
|-------|------|-------------|
| `user` | `object \| null` | Supabase auth user object |
| `profile` | `object \| null` | User's profile row from `profiles` table |
| `loading` | `boolean` | Whether auth state is still being determined |
| `isAdmin` | `boolean` | `true` if `profile.role === 'admin'` |
| `signOut` | `function` | Signs the user out and redirects to `/login` |

Listens to `onAuthStateChange` and auto-fetches the profile from the database.

#### `NotificationsContext` (`src/contexts/NotificationsContext.jsx`)

Tracks unread notification count for the navbar badge.

```jsx
const { unreadCount, refreshNotifications } = useNotifications();
```

#### `ToastContext` (`src/contexts/ToastContext.jsx`)

Global toast notification system.

```jsx
const { showToast } = useToast();
showToast('Profile updated!', 'success');  // types: success, error, info, warning
```

### Custom Hooks

#### `useDebounce(value, delay)` — `src/hooks/useDebounce.js`

Returns a debounced version of the input value. Used in search inputs to avoid excessive API calls.

```jsx
const debouncedSearch = useDebounce(searchTerm, 300);
```

### Utility Functions

Located in `src/lib/utils.js`:

| Function | Signature | Description |
|----------|-----------|-------------|
| `formatDate` | `(date) → string` | Formats dates in Arabic locale |
| `getInitials` | `(name) → string` | Extracts initials for avatar fallback |
| `truncateText` | `(text, maxLength) → string` | Truncates with ellipsis `...` |
| `buildQueryParams` | `(params) → string` | Builds URL query strings from object |
| `debounce` | `(fn, delay) → fn` | Debounce wrapper (non-hook version) |
| `classNames` | `(...classes) → string` | Conditional CSS class merging |
| `getRelativeTime` | `(date) → string` | Arabic relative time (e.g., "منذ 5 دقائق") |
| `isRTL` | `(text) → boolean` | Detects if text is Arabic/Hebrew (RTL) |

### Validation Schemas

All form validation uses **Zod** schemas defined in `src/lib/validators.js`:

| Schema | Used By | Fields |
|--------|---------|--------|
| `loginSchema` | Login form | `email`, `password` |
| `registerSchema` | Register form | `full_name`, `email`, `password`, `confirmPassword`, `inviteToken` |
| `profileSchema` | Profile editor | `full_name`, `university_id`, `bio`, `skills[]`, `github_url`, `linkedin_url`, `portfolio_url` |
| `projectSchema` | Admin project form | `title`, `description`, `department_id`, `advisor_name`, `is_featured` |
| `feedbackSchema` | Feedback form | `type`, `message`, `email` (optional) |
| `inviteSchema` | Invite creation | `max_uses` |
| `departmentSchema` | Department form | `name` |
| `skillSchema` | Skill form | `name` |
| `levelSchema` | Level form | `name` |

### Design System

The design system is defined in `src/app/globals.css` under the theme name **"Ocean & Sand"**.

#### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#1D6E72` | Primary teal — headers, key UI |
| `--color-primary-dark` | `#155558` | Hover/active states |
| `--color-primary-light` | `#23858A` | Lighter variant |
| `--color-action` | `#2A9298` | Interactive elements (links, buttons) |
| `--color-surface` | `#E1F5EE` | Light teal background surfaces |
| `--color-accent` | `#C49A4A` | Gold accent — highlights, badges |
| `--color-alt-surface` | `#FBF0DC` | Warm sand background |
| `--color-neutral` | `#F2F0EA` | Page background |
| `--color-text` | `#1A3C34` | Primary text (dark green-black) |
| `--color-text-muted` | `#5A7A72` | Secondary/muted text |
| `--color-error` | `#C44A4A` | Error states |
| `--color-success` | `#2A9255` | Success states |
| `--color-warning` | `#C49A4A` | Warning states |

#### Spacing Scale

`--space-xs` (4px) → `--space-sm` (8px) → `--space-md` (16px) → `--space-lg` (24px) → `--space-xl` (32px) → `--space-2xl` (48px) → `--space-3xl` (64px)

#### Typography

- **Font Family:** Inter (Google Fonts) + Noto Sans Arabic
- **Scale:** `--text-xs` (0.75rem) through `--text-5xl` (3rem)
- **Weights:** normal (400), medium (500), semibold (600), bold (700)

#### Other Tokens

- **Border Radius:** `--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (16px), `--radius-full` (9999px)
- **Shadows:** `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- **Transitions:** `--transition-fast` (150ms), `--transition-base` (250ms), `--transition-slow` (400ms)
- **Z-Index:** dropdown (40), navbar (50), modal-overlay (1000), modal (1010), toast (9999)

#### Built-in Animations

| Class | Effect |
|-------|--------|
| `.animate-fade-in` | Fade from transparent |
| `.animate-slide-up` | Slide up with fade |
| `.animate-slide-down` | Slide down with fade |
| `.animate-scale-in` | Scale up from 95% with fade |
| `.animate-spin` | Continuous rotation (loading spinners) |

The design system also includes a full CSS reset, accessibility features (`focus-visible`, `.visually-hidden`, `.sr-only`), custom scrollbar styling, and `prefers-reduced-motion` support.

---

## API Routes

### `POST /api/auth/callback`

Handles the OAuth/magic-link callback from Supabase Auth.

- Exchanges the authorization code for a session
- Sets session cookies
- Redirects to `/dashboard` (or a custom `next` URL)

### `POST /api/email/send`

Sends transactional emails via SMTP (Nodemailer).

**Request Body:**
```json
{
  "to": "student@example.com",
  "subject": "Welcome to Takween",
  "html": "<h1>Welcome!</h1>"
}
```

**Rate Limited:** Uses in-memory rate limiting to prevent abuse.

**Requires:** `SMTP_*` environment variables to be configured.

---

## Email System

Takween uses two email mechanisms:

1. **Supabase Auth Emails** — Confirmation, password reset (uses the custom template in `supabase/templates/confirm_signup.html`)
2. **Nodemailer API Route** — General transactional emails sent via `/api/email/send`

The confirmation email template is a branded Arabic RTL HTML template with a `{{ .ConfirmationURL }}` placeholder.

---

## Testing

### Test Setup

Tests use **Vitest** with **React Testing Library** and **jsdom** environment.

The setup file (`src/__tests__/setup.js`) provides:
- `@testing-library/jest-dom` matchers
- Mocked `next/navigation` (useRouter, useSearchParams, usePathname)
- Mocked Supabase client

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

| Area | Test File | What's Tested |
|------|-----------|---------------|
| **Validators** | `lib/validators.test.js` | All Zod schemas — valid/invalid inputs, edge cases |
| **Utilities** | `lib/utils.test.js` | `formatDate`, `getInitials`, `truncateText`, `classNames`, `isRTL` |
| **Rate Limiter** | `lib/rateLimit.test.js` | Allow/block behavior, interval reset |
| **Button** | `components/ui/Button.test.jsx` | Rendering, variants, loading, disabled, click handlers |
| **Input** | `components/ui/Input.test.jsx` | Labels, errors, icons, input types |
| **Modal** | `components/ui/Modal.test.jsx` | Open/close, overlay click, title, action buttons |
| **Badge** | `components/ui/Badge.test.jsx` | Variant rendering (success, warning, danger, info) |
| **Card** | `components/ui/Card.test.jsx` | Children, className merging, padding |
| **LoginForm** | `components/auth/LoginForm.test.jsx` | Field rendering, form submission, error handling, loading state |
| **ToastContext** | `contexts/ToastContext.test.jsx` | Show toast, auto-dismiss, different types |
| **AuthContext** | `contexts/AuthContext.test.jsx` | Provides user/profile, auth state changes, signOut |
| **Not Found** | `app/not-found.test.jsx` | 404 page rendering |

---

## CI/CD Pipelines

### CI — Continuous Integration

**File:** `.github/workflows/ci.yml`

**Triggers:** Push to `main` or pull request to `main`

**Steps:**
1. Checkout code
2. Setup Node.js 20 with npm cache
3. `npm ci` — Install dependencies
4. `npm run lint` — ESLint check
5. `npm run test` — Run Vitest tests
6. `npm run build` — Verify Next.js production build (with dummy env vars)

### CD — Continuous Deployment

**File:** `.github/workflows/cd.yml`

**Triggers:** Push to `main` or manual dispatch

**Steps:**
1. **Deploy to Vercel** — Pull config → Build → Deploy production
2. **Deploy Supabase Migrations** — Link project → `supabase db push`
3. **Deploy Supabase Edge Functions** — `supabase functions deploy`

**Required Secrets:**
| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel deployment authentication |
| `VERCEL_ORG_ID` | Vercel organization identifier |
| `VERCEL_PROJECT_ID` | Vercel project identifier |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI authentication |
| `SUPABASE_DB_PASSWORD` | Database password for linking |
| `SUPABASE_PROJECT_ID` | Supabase project reference |

---

## Key User Flows

### 1. Student Registration

```
Admin creates invite token → Shares link with student
  → Student visits /register?token=xxx
  → Fills name, email, password
  → Supabase sends confirmation email
  → Student clicks confirm link
  → /api/auth/callback exchanges code
  → Trigger creates profile row
  → Redirect to /dashboard
```

### 2. Team Formation

```
Student browses /projects → Finds interesting project
  → Views /projects/[id]
  → Clicks "Create Team" (if no team exists for this project)
  → OR clicks "Join Team" → Sends join request with message
  → Team owner receives notification
  → Owner accepts/rejects from /dashboard
  → If accepted: trigger adds member to team_members
  → Requester receives notification of result
```

### 3. Adding Manual Members

```
Team owner on /dashboard → Clicks "Add Manual Member"
  → Enters name, WhatsApp, notes
  → Member added to manual_members table
  → Shows alongside registered members in team view
```

### 4. Admin Project Management

```
Admin navigates to /admin/projects
  → Creates new project (title, description, department, max team size)
  → Project appears in student project browser
  → Admin can edit/delete projects
  → All actions logged to audit_logs
```

---

## Contributing

### Branch Naming

```
feature/short-description     # New features
fix/bug-description            # Bug fixes
refactor/what-changed          # Code refactoring
docs/what-documented           # Documentation updates
```

### Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add team merge request UI
fix: resolve notification count not updating
refactor: extract team card into separate component
docs: update API route documentation
test: add profile validation tests
chore: update dependencies
```

### Code Style

- **Components:** One component per file, PascalCase naming
- **Component structure:** `ComponentName/ComponentName.jsx` + `ComponentName.module.css`
- **Styles:** CSS Modules only — no inline styles, no utility-first frameworks
- **Imports:** Use `@/` path alias (maps to `src/`)
- **Server vs Client:** Default to Server Components; add `'use client'` only when needed
- **Naming:** Client-side interactive wrappers use `*Client.js` suffix (e.g., `DashboardClient.js`)
- **Language:** UI text is in Arabic; code (variable names, comments) is in English
- **Validation:** All user input validated with Zod schemas before use

### Adding a New Feature

1. **Database changes** — Add a new migration file in `supabase/migrations/` with the next sequential number
2. **Backend logic** — Use Server Components for data fetching, Server Actions for mutations
3. **Component** — Create in the appropriate `src/components/` subdirectory with CSS Module
4. **Page** — Add route directory under the appropriate route group in `src/app/`
5. **Validation** — Add Zod schema in `src/lib/validators.js`
6. **Tests** — Add test files mirroring the source structure under `src/__tests__/`
7. **Navigation** — Update `Navbar` if a new top-level route is added

---

## FAQ

**Q: How do I create the first admin user?**
A: Register normally, then run this SQL in Supabase:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

**Q: How do invite tokens work?**
A: Admins generate tokens from `/admin/invites`. Each token has a `max_uses` limit. Students register at `/register?token=<token>`. The `use_invite_token` RPC atomically validates and increments usage.

**Q: Why is the app in Arabic?**
A: Takween is designed for Arabic-speaking universities. The root layout sets `dir="rtl"` and `lang="ar"`. The Noto Sans Arabic font is loaded alongside Inter.

**Q: Can I add English language support?**
A: Currently the app is Arabic-only. Adding i18n would require extracting all UI strings into translation files and implementing a language switcher.

**Q: How are emails sent?**
A: Two methods: (1) Supabase Auth handles confirmation/reset emails using custom HTML templates in `supabase/templates/`. (2) The `/api/email/send` API route uses Nodemailer for custom transactional emails.

**Q: How does the real-time notification badge work?**
A: The `notifications` table is added to Supabase Realtime publication. The `NotificationsContext` polls for unread count and updates the navbar badge.

**Q: What happens when a join request is accepted?**
A: A database trigger (`notify_on_request_status_change`) automatically: (1) inserts the user into `team_members`, and (2) creates a notification for the requester.

