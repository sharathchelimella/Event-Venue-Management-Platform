# CampusEventHub — Campus Venue & Event Management System (MVP)

A modern, full-stack campus venue booking and event management platform built with React, Vite, Tailwind CSS, Express, and MongoDB/Mongoose. Designed for campus communities with strict Role-Based Access Control (RBAC) and Row-Level Security (RLS).

---

## Features

- **Role-Based Workflows**:
  - **Student / Attendee**: Discover approved campus hackathons, standup comedy nights, seminars, and cultural festivals. Real-time seat availability meters with 1-click registration, duplicate booking prevention, and personal registrations passbook with cancellation options.
  - **Event Organizer**: Check facility capacities and existing schedules, submit new venue booking requests with real-time double-booking conflict prevention, track request statuses (`Pending`, `Approved`, `Rejected`), and view/export full attendee rosters (names, emails, registration timestamps).
  - **Campus Administrator**: One-click approval queue (approvals auto-publish to the student feed; rejections immediately release the venue date slot), facility management (add venues, adjust capacities), and an interactive **Row-Level Security (RLS) Policy & Audit Console**.

- **Database-Level Integrity & Guards**:
  - **Double-Booking Prevention**: Partial Unique Index on `{ venue_id: 1, event_date: 1 }` where `status != 'Rejected'`.
  - **Duplicate Registration Prevention**: Compound Unique Index on `{ event_id: 1, user_id: 1 }`.
  - **Atomic Capacity Guard**: Atomic `findOneAndUpdate` query with `{ registered_count: { $lt: max_capacity } }` and `$inc: { registered_count: 1 }` preventing race conditions and locking the "Housefull / Sold Out" state.
  - **Row-Level Security (RLS)**: Server-side query scoping, mutation guards, and real-time security audit logging.

- **Design & UI**:
  - Slate Minimalist aesthetic adhering to SaaS & Dashboard guidelines.
  - Password visibility toggle (Show/Hide) with eye icon on sign in and account registration.
  - Zero-pill metadata typography with tabular numerals (`tabular-nums font-mono`).

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons
- **Backend**: Express 4.x, Node.js (`tsx`)
- **Database & ODM**: MongoDB & Mongoose ODM (embedded high-integrity store with durable JSON snapshot + optional remote MongoDB connection via `MONGODB_URI`)
- **Security**: Custom Row-Level Security (RLS) middleware & Audit Logger

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1. Clone the repository:
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd campus-event-hub
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

4. Build for production:
```bash
npm run build
```

5. Run full-stack production server:
```bash
npm run start
```

---

## Pre-Seeded Demonstration Accounts

For instant testing and evaluation, the database auto-seeds the following accounts on boot:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Student** | `alex.student@campus.edu` | `password123` | Browse events, reserve seats, cancel personal passes |
| **Organizer** | `priya.organizer@campus.edu` | `password123` | Request venues, view submitted events, inspect/export attendee rosters |
| **Admin** | `dean.admin@campus.edu` | `adminpassword` | Approve/reject events, add venues, modify capacities, audit RLS policies |

---

## API Endpoints Overview

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Create a Student or Organizer account |
| `POST` | `/api/auth/login` | Public | Authenticate user |
| `GET` | `/api/auth/me` | Authenticated | Fetch current user session |
| `GET` | `/api/venues` | Public | List all venues and booked dates |
| `POST` | `/api/venues` | Admin | Create a new campus venue |
| `PATCH` | `/api/venues/:id` | Admin | Update venue capacity or name |
| `GET` | `/api/events/approved` | Public | Fetch approved upcoming events |
| `POST` | `/api/events` | Organizer / Admin | Submit a venue booking request |
| `GET` | `/api/events/my-events` | Organizer / Admin | View organizer's submitted events |
| `GET` | `/api/admin/events/pending`| Admin | Review pending booking requests |
| `PATCH` | `/api/admin/events/:id` | Admin | Approve or reject booking request |
| `POST` | `/api/events/:id/register`| Authenticated | Register a seat (atomic capacity check) |
| `DELETE`| `/api/events/:id/register`| Authenticated | Cancel personal seat reservation |
| `GET` | `/api/users/registrations` | Authenticated | View current user's registered passes |
| `GET` | `/api/events/:id/registrations` | Organizer / Admin | View private attendee contact roster (CSV exportable) |
| `GET` | `/api/admin/rls/policies` | Admin | View active Row-Level Security rules |
| `GET` | `/api/admin/rls/audit-logs` | Admin | Live security audit logs |
| `POST` | `/api/admin/rls/simulate` | Admin | Test RLS policy outcomes across personas |

---

## License
Apache-2.0
