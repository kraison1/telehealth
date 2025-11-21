# Telehealth Chat

Real-time 1-on-1 chat application built with Next.js, TypeScript, Tailwind CSS, and Socket.IO.

## Features

- User authentication (NextAuth.js with JWT)
- Chat room topics with 1-on-1 conversations
- Create new chat rooms
- Real-time messaging with WebSocket
- Typing indicators
- User join/leave notifications
- Thai timezone timestamps (Asia/Bangkok)
- Message history persistence (SQLite)
- **Search topics** - Filter by topic name or user
- **Popup chat windows** - Facebook-style chat in bottom-right corner
- **Multiple chats** - Open up to 3 chat windows simultaneously
- **Minimize/Maximize** - Collapse chat to avatar bubble
- **Read/Unread status** - Blue dot indicator for unread topics
- **Pagination** - Load more topics and messages (100 per page)
- **Close/Reopen chat** - Close chat rooms to prevent new messages (doctor/nurse only)
- **Filter by status** - Filter topics by all, unread, read, or closed
- **Role-based permissions** - Doctor, Patient, Nurse with different capabilities
- **Success/Error notifications** - Toast messages for all actions

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS 4
- Socket.IO
- NextAuth.js (v5 beta)
- Drizzle ORM
- SQLite (better-sqlite3)

## Getting Started

### 0. Set up env
- open terminal
- cp .env.local .env
- in terminal use command node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > example result abcdefgh
- open file .env add abcdefgh to AUTH_SECRET > example AUTH_SECRET = abcdefgh

### 1. Install dependencies

```bash
npm install
```

### 2. Setup database

```bash
npm run db:generate
npm run db:migrate
```

### 3. Seed test data

```bash
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

### 5. Open the app

Open [http://localhost:3000](http://localhost:3000) in your browser.


### Deployment Guide
- Deploy via Render (Production)
- Deployed production URL: [https://telehealth-0jet.onrender.com](https://telehealth-0jet.onrender.com)

## Test Users

| Username | Password | Name | Role |
|----------|----------|------|------|
| doctor1 | password123 | Dr. Smith | Doctor |
| patient1 | password123 | John Doe | Patient |
| nurse1 | password123 | Jane Wilson | Nurse |

## Role Permissions

| Permission | Doctor | Patient | Nurse |
|------------|--------|---------|-------|
| Create topic | ✅ | ✅ | ✅ |
| Close/Reopen topic | ✅ | ❌ | ✅ |
| Query all topics | ✅ | ❌ | ✅ |
| Query own topics | ✅ | ✅ | ✅ |
| Create users | ❌ | ❌ | ✅ |

## Test Chat Topics

| Room ID | Topic | Participants |
|---------|-------|--------------|
| topic-1 | General Consultation | Dr. Smith & John Doe |
| topic-2 | Follow-up Checkup | Dr. Smith & Jane Wilson |
| topic-3 | Medication Review | Jane Wilson & John Doe |

## How to Use

1. Go to `/chat` (redirects to login if not authenticated)
2. Login with test credentials (e.g., `doctor1` / `password123`)
3. View your chat rooms or create a new one
4. **Search** - Use the search bar to filter topics by name or user
5. **Click a topic** - Opens a small chat popup in bottom-right corner
6. **Multiple chats** - Click more topics to open up to 3 chat windows
7. **Minimize** - Click `-` button to collapse to avatar bubble
8. **Close window** - Click `×` to close chat window
9. **Close chat room** (Doctor/Nurse) - Click `⋮` menu → "Close Chat" to close the room
10. **Reopen chat** (Doctor/Nurse) - Click `⋮` menu → "Reopen Chat" on closed rooms
11. **Filter tabs** - Use "all", "unread", "read", "closed" tabs to filter topics
12. **Create users** (Nurse only) - Click "New User" button to add new users
13. **Notifications** - Green toast for success, red toast for errors
14. Open another browser/incognito, login as different user, join same room
15. Start chatting in real-time!

## Project Structure

```
telehealth
├── .env.local                  # Environment variables (DB, JWT, NextAuth secrets)
├── README.md                   # Project documentation
├── __tests__                   # Unit tests for UI components
│   ├── Avatar.test.tsx         # Tests for Avatar component
│   ├── LoadingSpinner.test.tsx # Tests for loading spinner
│   ├── Modal.test.tsx          # Tests for modal component
│   ├── Toast.test.tsx          # Tests for toast notifications
│   ├── TypingIndicator.test.tsx# Tests for typing indicator
│   └── page.test.tsx           # Tests for main pages
├── app                         # Next.js App Router (frontend + server endpoints)
│   ├── api                     # API routes (server-side logic)
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth configuration (login/session)
│   │   ├── topics              # Topic management (chat topics)
│   │   │   ├── [id]/status/route.ts # Update topic status (open/closed)
│   │   │   ├── read/route.ts   # Mark topic as read
│   │   │   └── route.ts        # List/create topics
│   │   └── users/route.ts      # User API (search/list)
│   ├── chat/page.tsx           # Main chat UI page
│   ├── favicon.ico             # Website icon
│   ├── globals.css             # Global project styles
│   ├── layout.tsx              # Root application layout
│   ├── login/page.tsx          # Login page
│   ├── page.tsx                # Landing page
│   └── providers.tsx           # Context providers (Auth, Theme, etc.)
├── components                  # Reusable UI Components
│   ├── Avatar.tsx              # User avatar component
│   ├── ChatWindow.tsx          # Popup chat window component
│   ├── LoadingSpinner.tsx      # Loading spinner
│   ├── Modal.tsx               # Modal dialog component
│   ├── Toast.tsx               # Toast notification component
│   ├── TypingIndicator.tsx     # Typing indicator
│   └── index.ts                # Component exports
├── db
│   ├── index.ts                # Database connection (SQLite via Drizzle ORM)
│   ├── schema.ts               # Database schema definitions
│   └── seed.ts                 # Database seed script
├── drizzle.config.ts           # Configuration for drizzle-kit (generate/migrate)
├── eslint.config.mjs           # ESLint configuration
├── jest.config.ts              # Jest test configuration
├── jest.setup.ts               # Jest setup (mocks, environment)
├── lib
│   ├── auth.ts                 # Helper functions for authentication (NextAuth)
│   ├── socket.ts               # Socket.IO WebSocket logic
│   └── utils.ts                # Utility functions
├── next-env.d.ts               # TypeScript definitions for Next.js
├── next.config.ts              # Next.js build/config settings
├── package-lock.json           # Dependency lock file
├── package.json                # Dependencies + npm scripts
├── postcss.config.mjs          # PostCSS configuration
├── public                      # Static assets (SVG icons, images)
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── server.ts                   # Custom Node.js server + WebSocket server
├── tsconfig.json               # TypeScript configuration
└── types
    └── next-auth.d.ts          # Type extensions for NextAuth
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate database migrations |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed test users, topics, and messages |
| `npm run db:studio` | Open Drizzle Studio GUI |

## Authentication

### How it works

- Uses NextAuth.js v5 with JWT strategy
- Session expires after 30 minutes of inactivity
- Token is automatically refreshed on each request (sliding session)
- Protected routes redirect to `/login` if not authenticated

### Session Configuration

```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 60, // 30 minutes
}
```

#### Token Refresh

NextAuth.js handles token refresh automatically:
1. JWT token stored in HTTP-only cookie
2. On each API/page request, token validity is checked
3. If valid, session continues with updated expiry
4. If expired, user redirected to login page

### Role in Session

The user role is included in the JWT token and session:

```typescript
// After login, session contains role
session.user.role // "doctor" | "patient" | "nurse"
```

## Role-Based Access Control

### Role Definitions

- **Doctor**: Senior medical professional, can manage chat rooms
- **Patient**: Patient undergoing medical care
- **Nurse**: Healthcare assistant, can manage users and chat rooms

### Feature Availability by Role

#### Create Chat Topics
- **Doctor**: ✅ Can create topics with any user
- **Patient**: ✅ Can create topics with doctors/nurses
- **Nurse**: ✅ Can create topics with doctors/patients

#### Close/Reopen Chat Rooms
- **Doctor**: ✅ Can close/reopen any chat room via menu
- **Patient**: ❌ Cannot access close/reopen feature
- **Nurse**: ✅ Can close/reopen any chat room via menu

#### View Chat Topics
- **Doctor**: ✅ Can see all topics
- **Patient**: ✅ Can only see topics they participate in
- **Nurse**: ✅ Can see all topics

#### Create New Users
- **Doctor**: ❌ Cannot create users
- **Patient**: ❌ Cannot create users
- **Nurse**: ✅ Can create new users with any role

### Backend Permission Checks

All permission checks are enforced on the backend:

```
GET /api/topics
  - Patient: filters to own topics only
  - Doctor/Nurse: sees all topics

PATCH /api/topics/[id]/status
  - Patient: 403 Forbidden
  - Doctor/Nurse: allowed

POST /api/users
  - Patient/Doctor: 403 Forbidden
  - Nurse: allowed
```

## Notifications & Feedback

### Toast Messages

All user actions show immediate feedback via toast notifications:

- **Success** (Green): Topic created, user created, topic status changed
- **Error** (Red): Failed actions, permission denied, validation errors
- Auto-dismisses after 3 seconds
- Can be manually closed

### Examples

```
✓ Topic created successfully     (green)
✗ Patients cannot close topics   (red)
✓ User created successfully      (green)
✓ Topic closed successfully      (green)
```

## Environment Variables

Create `.env.local` file:

```
AUTH_SECRET=your-super-secret-key-change-in-production
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
```
