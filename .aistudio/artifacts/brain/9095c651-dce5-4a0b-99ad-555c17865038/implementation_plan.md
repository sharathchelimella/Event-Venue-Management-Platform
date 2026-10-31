# Strict Role-Based View Isolation & Demo Bar Removal

Hide the top demo switcher bar for logged-in students and attendees so they only see the student experience (Browse Events, Venues Directory, My Registrations) without any organizer or admin UI affordances. Organizers and Admins access their dedicated portals exclusively through authenticated login with role verification.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following adjustments have been confirmed based on your answers:
> - **Student Role Isolation**: When a student or attendee is logged in, the top demo bar and role switcher are completely hidden from the header. Students never see "Organizer" or "Admin" switcher buttons, portals, or queues.
> - **Credential-Based Privileged Access**: Access to the Organizer Portal and Admin Console requires signing in with valid Organizer (`priya.organizer@campus.edu`) or Admin (`dean.admin@campus.edu`) account credentials via the standard Sign In modal.
> - **Navigation Cleanliness**: The main navigation bar renders strictly student-scoped links (`Browse Events`, `Venues Directory`, `My Registrations`) when a student is logged in, with zero clutter from administrative or organizer features.

---

## 1. Overview & Core Concept

CampusEventHub should feel like a real campus portal for students where they see only what is relevant to an attendee. By removing the demo role switcher bar for logged-in students:
1. **Students (Attendees)** enjoy an uncluttered, student-only interface: browsing events, checking real-time capacity, registering for seats, and managing their personal passes.
2. **Organizers & Admins** authenticate securely through the Sign In modal to access their respective management tools (venue booking, attendee rosters, and admin approval queues).

---

## 2. User Experience & Visual Design

### UI Layout Structure
```
[Unauthenticated Guest]
  ├── Top Navigation: Browse Events · Venues Directory
  └── Top Right: "Sign In / Register" Button (Opens AuthModal with quick prefill helpers)

[Logged-in Student (Alex Rivera)]
  ├── Top Demo Bar: HIDDEN (Clean zero-clutter top header)
  ├── Top Navigation: Browse Events · Venues Directory · My Registrations
  └── Top Right: Student Name (Alex Rivera), Role Badge (Student), Logout Button

[Logged-in Organizer (Priya Sharma)]
  ├── Top Navigation: Browse Events · Venues Directory · Organizer Portal
  └── Top Right: Priya Sharma · Organizer · Logout Button

[Logged-in Admin (Dean Office)]
  ├── Top Navigation: Browse Events · Venues Directory · Admin Queue · Venues & RLS
  └── Top Right: Dean Office · Admin · Logout Button
```

### Key Changes
- In `src/components/Header.tsx`:
  - Conditionally suppress the top demo bar (`bg-slate-900`) whenever `currentUser?.role === 'Student'` (or when a user is logged in).
  - Ensure the navigation bar displays only tabs permitted for the active role:
    - `Student`: `Browse Events`, `Venues Directory`, `My Registrations`.
    - `Organizer`: `Browse Events`, `Venues Directory`, `Organizer Portal`.
    - `Admin`: `Browse Events`, `Venues Directory`, `Admin Queue`.
- In `src/App.tsx`:
  - Default the initial load to an unauthenticated guest or authenticated student without rendering intrusive demo switcher buttons.
  - When a student is active, ensure `activeTab` cannot switch to `organizer` or `admin`.

---

## 3. Technical Architecture & Security Enforcement

- **Client-Side Guard**: The tab router prevents rendering `<OrganizerPortal>` or `<AdminPortal>` if `currentUser?.role` does not match the required privileges.
- **Backend RLS Guard (Defense-in-Depth)**: Even if a client attempts to forge an API call to `/api/events` (create), `/api/admin/events/:id` (approval), or `/api/venues` (create venue), the Express Row-Level Security middleware intercepts the request and returns a strict `403 Forbidden: Access restricted to [Admin/Organizer] roles`.

---

## 4. Verification Plan

1. Log in as a Student (`alex.student@campus.edu`):
   - Verify the top demo switcher bar is completely gone.
   - Verify no "Organizer" or "Admin" buttons appear in the top bar or header navigation.
   - Verify only "Browse Events", "Venues Directory", and "My Registrations" are visible.
2. Sign out and sign in as Organizer:
   - Verify the Organizer Portal is available.
3. Sign out and sign in as Admin:
   - Verify the Admin Queue and RLS Security Console are available.
4. Verify all compilation and tests pass cleanly.
