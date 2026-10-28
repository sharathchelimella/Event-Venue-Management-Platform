# Row-Level Security (RLS) Implementation Plan for CampusEventHub

Implement strict, granular **Row-Level Security (RLS)** across the Express and MongoDB architecture. This enforces authenticated ownership and role predicates across all database queries and mutations, preventing unauthorized cross-tenant data access, privilege escalation, or student roster exposure, alongside an interactive **RLS Security Policy & Audit Panel** in the Admin Console.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following RLS specifications have been confirmed based on your choices:
> - **Architecture**: Server-side Express and MongoDB row-level security middleware intercepting and wrapping all model operations.
> - **Enforcement Strictness**: Strict RLS with authenticated user (`auth.uid`) and role (`auth.role`) predicates on every operation.
> - **Admin Visibility**: An interactive RLS Security Policy and Audit viewer added to the Admin Console, including a real-time policy matrix, access audit logs, and an interactive policy simulator.

---

## 1. Row-Level Security Policy Matrix

| Collection | Operation | Enforced RLS Predicate / Rule | Permitted Roles | Violation Response |
| :--- | :--- | :--- | :--- | :--- |
| **`venues`** | `SELECT` | `true` (Public catalog of venues & capacity) | All (`Student`, `Organizer`, `Admin`, `Guest`) | Allowed |
| **`venues`** | `INSERT`, `UPDATE` | `auth.role == 'Admin'` | `Admin` only | `403 Forbidden: Only campus administrators can manage venue capacities.` |
| **`events`** | `SELECT (Approved)` | `status == 'Approved'` | All (`Student`, `Organizer`, `Admin`, `Guest`) | Allowed |
| **`events`** | `SELECT (Pending / Rejected)` | `organizer_id == auth.uid OR auth.role == 'Admin'` | Owner `Organizer` or `Admin` | `403 Forbidden: Cannot view pending/rejected events belonging to other organizers.` |
| **`events`** | `INSERT` | `auth.role IN ['Organizer', 'Admin'] AND organizer_id == auth.uid` | `Organizer`, `Admin` | `403 Forbidden: Must be an organizer and cannot forge organizer_id.` |
| **`events`** | `UPDATE (status)` | `auth.role == 'Admin'` (Organizers cannot self-approve) | `Admin` only | `403 Forbidden: Only campus administrators can approve or reject event bookings.` |
| **`registrations`** | `SELECT (Personal)` | `user_id == auth.uid OR auth.role == 'Admin'` | Record Owner or `Admin` | `403 Forbidden: Cannot access another student's registered passes.` |
| **`registrations`** | `SELECT (Attendee Roster)`| `event.organizer_id == auth.uid OR auth.role == 'Admin'` | Event Owner or `Admin` | `403 Forbidden: Only the event organizer or administrator can view student contact rosters.` |
| **`registrations`** | `INSERT` | `auth.uid == requested_user_id AND auth.role == 'Student'` | Authenticated `Student` | `403 Forbidden: Cannot register seats on behalf of other accounts.` |
| **`registrations`** | `DELETE` | `user_id == auth.uid OR auth.role == 'Admin'` | Record Owner or `Admin` | `403 Forbidden: Cannot cancel registrations for another student.` |

---

## 2. Technical Architecture & Component Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CampusEventHub Web Client                       │
├────────────────────────────────────────────────────────────────────────┤
│ Top Bar: Brand, Nav, Demo Role Switcher (Student / Organizer / Admin)  │
├────────────────────────────────────────────────────────────────────────┤
│ Active View Router:                                                    │
│  ├── Student Feed: Public Approved events, 1-Click register            │
│  ├── My Registrations: Read own passes (RLS filtered: user_id == uid)  │
│  ├── Organizer Portal: Manage own events (RLS: organizer_id == uid)    │
│  └── Admin Portal: Pending Queue, Venues, + NEW RLS Security Panel     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Fetch + x-user-id Header
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Express API Server + RLS Layer                     │
├────────────────────────────────────────────────────────────────────────┤
│ RLS Interceptor & Context Middleware:                                  │
│  1. Extract auth context: { uid, role, email, name }                   │
│  2. Assert role requirements (requireRole('Admin'), requireAuth())     │
│  3. Query Filter Injection (automatically injects ownership clauses)   │
│  4. Mutation Guard (asserts record ownership prior to update/delete)   │
│  5. Security Audit Logger (records policy checks & denials)            │
├────────────────────────────────────────────────────────────────────────┤
│ New Dedicated Endpoint:                                                │
│  ├── GET  /api/admin/rls/policies (Fetches active policy definitions)  │
│  ├── POST /api/admin/rls/simulate (Simulates policy check for UI)      │
│  └── GET  /api/admin/rls/audit-logs (Recent access/rejection records)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Mongoose / MongoDB Engine
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 MongoDB Database (campusEventHub)                      │
│   (Collections: users, venues, events, registrations)                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. User Experience & Visual Design

### Admin RLS Security & Policy Audit Console
- Added as a sub-tab / panel within the **Campus Administration Console**:
  1. **Policy Definitions Matrix**: Clean high-density table displaying all 10 active security rules, target collections, allowed roles, enforced conditions (`auth.uid == record.owner`), and enforcement state (`Active (Enforced)`).
  2. **Interactive Policy Simulator**:
     - Allows the Admin to select:
       - *Actor*: Student (Alex), Organizer (Priya), Admin (Dean), or Anonymous Guest
       - *Action*: View Attendee Emails, Approve Booking, Book Venue, Cancel Registration, etc.
       - *Target*: Specific event or registration
     - Instantly evaluates against the backend RLS rule engine and outputs `ALLOWED` (green) or `DENIED` (crimson) with the exact failing predicate.
  3. **Live Security Audit Log**: Displays recent policy evaluation events with timestamps, requesting persona, target collection, action, and outcome.

---

## 4. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Side Query & Mutation RLS Middleware**
  - *Chosen Approach*: RLS is enforced at the controller and database adapter layer in Express. Even if a user attempts to manually forge a REST request (e.g., passing another user's ID or querying another organizer's pending events), the server rejects it with a strict `403 Forbidden`.
  - *Why*: Eliminates security vulnerabilities and cross-tenant data leaks.

- **Decision 2: Automatic Query Scoping (Defense in Depth)**
  - *Chosen Approach*: Rather than relying solely on client parameters, endpoints like `/api/events/my-events` and `/api/users/registrations` extract the identity strictly from the verified session context (`auth.uid`), completely preventing parameter tampering.

- **Decision 3: Zero Disruption to Existing Flow**
  - *Chosen Approach*: Legitimate actions for Students, Organizers, and Admins operate without additional friction, while unauthorized actions (e.g. student attempting to approve events or view private attendee emails) are strictly intercepted.
