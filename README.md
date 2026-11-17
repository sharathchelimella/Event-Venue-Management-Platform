# CampusEventHub — Campus Venue & Event Management System

A production-grade, full-stack campus venue booking and event management platform built with React 19, Vite, Tailwind CSS, Express, and MongoDB/Mongoose. Designed for campus communities with strict Role-Based Access Control (RBAC), Row-Level Security (RLS), and database-level concurrency guards.

---

## Key Features & Capabilities

### 1. Student / Attendee Experience
- **Google Sign-In & Instant Authentication**: Sign in or create an account with 1-click via Google accounts or campus email credentials, with profile avatar rendering.
- **Interactive Event Discovery**: Browse campus hackathons, standup comedy nights, research seminars, and cultural festivals with category filters and real-time text search.
- **Visual Capacity & Seat Meters**: Real-time capacity progress indicators showing exact seats remaining and percentage booked.
- **Atomic 1-Click Reservation**: Instant seat booking with automatic duplicate registration prevention and "Housefull / Sold Out" state locking.
- **Personal Registrations Passbook**: Dedicated passbook view to inspect reserved passes, event details, venue locations, and 1-click self-service cancellation.

### 2. Event Organizer Portal
- **Facility Availability & Schedule Inspection**: Real-time venue directory displaying auditorium capacities, facilities, and booked calendar dates.
- **Conflict-Free Booking Request Submission**: Submit venue reservation requests with date validation and real-time double-booking conflict prevention (blocks dates already occupied or in the past).
- **Request Lifecycle Tracking**: Track event submission statuses across `Pending`, `Approved`, and `Rejected` states with organizer summary metrics.
- **Private Attendee Contact Roster**: Securely view attendee names, emails, and registration timestamps for organized events, complete with 1-click **CSV Export**.

### 3. Campus Administrator Management & Security Console
- **One-Click Decision Queue**: Review pending venue booking requests. Approvals auto-publish events directly to the student feed; rejections immediately release the date slot.
- **Facility Management**: Register new campus auditoriums/halls and perform live inline capacity adjustments.
- **Interactive Row-Level Security (RLS) Console**:
  - **Policy Inspector**: Inspect active database security policies across collections (`venues`, `events`, `registrations`).
  - **Live Audit Log Stream**: Real-time telemetry monitoring actor permissions, actions, outcomes (`PERMITTED` vs `DENIED`), and policy predicates.
  - **Policy Simulator**: Test access control evaluations on demand across roles (`Student`, `Organizer`, `Admin`, `Guest`) and operations.

### 4. Database Concurrency & Integrity Guards
- **Dual Persistence Architecture**: Connects seamlessly to remote **MongoDB Atlas** clusters via `MONGODB_URI` with Mongoose schemas and models, with automatic fallback to an embedded durable JSON store (`.campus_data.json`) for zero-dependency offline development.
- **Partial Unique Index Guard**: Enforced partial unique constraint on `{ venue_id: 1, event_date: 1 }` where `status != 'Rejected'`, preventing date double-booking.
- **Compound Unique Index Guard**: Enforced compound constraint on `{ event_id: 1, user_id: 1 }`, guaranteeing single-ticket limits per attendee.
- **Atomic Capacity Guard**: High-concurrency `findOneAndUpdate` query with `{ registered_count: { $lt: max_capacity } }` and `$inc: { registered_count: 1 }`, eliminating overbooking race conditions under high traffic spikes.

### 5. Performance, Telemetry & Web Vitals
- **Core Web Vitals HUD**: Embedded real-time telemetry widget tracking FCP, LCP, CLS, INP, and TTFB, along with memory usage and interaction latency benchmarking.
- **Optimized Bundling**: Route-level code-splitting with React `lazy` and `Suspense`, zero-CLS layout skeletons, and manual vendor chunking.
- **Built-in Benchmark Suite**: CLI test harness covering load, stress, spike, endurance, and database indexing benchmarks.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript / JSX, Vite 8 |
| **Styling & Icons** | Tailwind CSS v4, Lucide React |
| **Backend Runtime** | Node.js (v18+), Express 4.x |
| **Database & ODM** | MongoDB & Mongoose ODM (Atlas + Embedded Snapshot fallback) |
| **Security Layer** | Row-Level Security (RLS) middleware & Audit Logger |
| **Telemetry & Observability** | Custom Core Web Vitals HUD & Performance Benchmark Suite |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm

### 1. Installation
Clone the repository and install dependencies using `--legacy-peer-deps`:

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd campuseventhub
npm install --legacy-peer-deps
```

### 2. Environment Configuration
Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development

# Optional: Remote MongoDB Atlas Connection String
# If omitted or offline, the app seamlessly runs on the high-integrity embedded store.
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority"

# Optional: Google OAuth 2.0 Client ID for 1-click Google Sign-In SDK
VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
```

### 3. Run the Development Server
Start the unified Vite and Express development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build & Production Run
To create an optimized production build and start the server:

```bash
npm run build
npm run start
```

---

## Pre-Seeded Demonstration Accounts

For instant evaluation, the database auto-seeds test accounts on initial boot:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Student** | `alex.student@campus.edu` | `password123` | Discover events, reserve seats, view passbook, cancel personal passes |
| **Organizer** | `priya.organizer@campus.edu` | `password123` | Request venues, track booking statuses, view & export attendee rosters |
| **Admin** | `dean.admin@campus.edu` | `adminpassword` | Approve/reject events, add/edit venues, audit RLS policies & logs |

> **Tip:** You can switch between demo personas instantly in the UI with 1 click using the demo switch controls.

---

## REST API Reference

### Authentication & Sessions
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new Student or Organizer account |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and return session |
| `POST` | `/api/auth/google` | Public | Authenticate or sign up with Google account / OAuth token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and session data |

### Venues & Facilities
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/venues` | Public | List all venues, locations, capacities, and booked dates |
| `POST` | `/api/venues` | Admin | Register a new campus venue |
| `PATCH` | `/api/venues/:id` | Admin | Update venue capacity or facility name |

### Events & Bookings
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events/approved` | Public | Fetch approved upcoming events for the student feed |
| `POST` | `/api/events` | Organizer / Admin | Submit a new venue reservation request |
| `GET` | `/api/events/my-events` | Organizer / Admin | List events submitted by the current organizer |
| `GET` | `/api/events/:id` | Authenticated | Retrieve single event detail with populated venue and organizer |
| `GET` | `/api/admin/events/pending` | Admin | Retrieve pending event requests awaiting administrative approval |
| `PATCH` | `/api/admin/events/:id` | Admin | Approve or reject venue booking request |

### Registrations & Attendees
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/events/:id/register` | Authenticated | Reserve a seat (atomic capacity guard & duplicate check) |
| `DELETE` | `/api/events/:id/register` | Authenticated | Cancel personal seat reservation and release capacity |
| `GET` | `/api/users/registrations` | Authenticated | Fetch current student's reserved tickets |
| `GET` | `/api/events/:id/registrations` | Organizer / Admin | Fetch private attendee roster for an event (CSV exportable) |

### Row-Level Security (RLS) & Governance
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/rls/policies` | Admin | Inspect active Row-Level Security policy definitions |
| `GET` | `/api/admin/rls/audit-logs` | Admin | Stream live security audit logs |
| `POST` | `/api/admin/rls/simulate` | Admin | Simulate policy evaluation across roles and actions |

---

## Automated Benchmark Suite

CampusEventHub includes benchmarking scripts to validate performance under simulated load:

```bash
# Core Web Vitals telemetry audit
npm run benchmark

# Database & persistence latency benchmark
npm run benchmark:db

# High-concurrency load testing
npm run benchmark:load

# Database throughput and index scaling
npm run benchmark:database

# Concurrency stress & race condition testing
npm run benchmark:stress

# Run all benchmarks
npm run benchmark:all
```

---

## License

Distributed under the Apache-2.0 License.
