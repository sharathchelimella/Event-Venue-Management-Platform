/**
 * CampusEventHub REST API Routes with Row-Level Security (RLS)
 * Enforces authenticated ownership, role validation, anti-tampering guards,
 * and security audit logging.
 */

import { Router, Request, Response } from 'express';
import { db } from './db.ts';
import { UserRole } from '../types/index.ts';
import {
  rlsAuthContext,
  requireAuth,
  requireRole,
  logAudit,
  getAuditLogs,
  RLS_POLICIES,
  simulateRLSCheck,
} from './rls.ts';

export const apiRouter = Router();

// Apply RLS Authentication Context extractor to all API requests
apiRouter.use(rlsAuthContext);

// -----------------------------------------------------------------------------
// 1. Authentication & Role Management
// -----------------------------------------------------------------------------

// POST /api/auth/register
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields (name, email, password, role) are required.' });
    }

    // FR-02: Admin accounts cannot be self-registered
    if (role === 'Admin') {
      logAudit({
        actor: name,
        actorRole: 'Guest',
        action: 'REGISTER_ADMIN_ATTEMPT',
        collection: 'users',
        outcome: 'DENIED',
        predicate: 'role != "Admin"',
        reason: 'Self-registration of administrator accounts is prohibited.',
      });
      return res.status(403).json({ error: 'Admin accounts cannot be self-registered.' });
    }

    if (role !== 'Student' && role !== 'Organizer') {
      return res.status(400).json({ error: 'Role must be either Student or Organizer.' });
    }

    const newUser = await db.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      role: role as UserRole,
    });

    logAudit({
      actor: newUser.name,
      actorRole: newUser.role,
      action: 'REGISTER_ACCOUNT',
      collection: 'users',
      outcome: 'ALLOWED',
      predicate: 'true',
    });

    const { password: _, ...userSafe } = newUser;
    return res.status(201).json({ user: userSafe });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to register account.' });
  }
});

// POST /api/auth/login
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db.findUserByEmail(email.trim());
    if (!user || user.password !== password) {
      logAudit({
        actor: email,
        actorRole: 'Guest',
        action: 'LOGIN_FAILURE',
        collection: 'users',
        outcome: 'DENIED',
        predicate: 'password_hash == match',
        reason: 'Invalid credentials provided',
      });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    logAudit({
      actor: user.name,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      collection: 'users',
      outcome: 'ALLOWED',
      predicate: 'true',
    });

    const { password: _, ...userSafe } = user;
    return res.json({ user: userSafe });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// GET /api/auth/me
apiRouter.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.auth!.user;
    const { password: _, ...userSafe } = user;
    return res.json({ user: userSafe });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch user.' });
  }
});

// POST /api/auth/demo-switch (Quick persona switcher)
apiRouter.post('/auth/demo-switch', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!role || !['Student', 'Organizer', 'Admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid demo role (Student, Organizer, Admin) required.' });
    }

    const users = await db.findUsers({ role: role as UserRole });
    if (users.length === 0) {
      return res.status(404).json({ error: `No demo account found for role ${role}.` });
    }

    const user = users[0];
    logAudit({
      actor: user.name,
      actorRole: user.role,
      action: 'DEMO_ROLE_SWITCH',
      collection: 'users',
      outcome: 'ALLOWED',
      predicate: 'demo_environment == true',
    });

    const { password: _, ...userSafe } = user;
    return res.json({ user: userSafe });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Demo switch failed.' });
  }
});

// -----------------------------------------------------------------------------
// 2. Venue Management (RLS: Public Read, Admin-Only Mutations)
// -----------------------------------------------------------------------------

// GET /api/venues (Public read)
apiRouter.get('/venues', async (_req: Request, res: Response) => {
  try {
    const venues = await db.findVenues();
    return res.json({ venues });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve venues.' });
  }
});

// POST /api/venues (RLS Guard: Admin only)
apiRouter.post('/venues', requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { venue_name, location_type, max_capacity } = req.body;

    if (!venue_name || !max_capacity) {
      return res.status(400).json({ error: 'Venue name and max capacity are required.' });
    }

    const capacityNum = parseInt(max_capacity, 10);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      return res.status(400).json({ error: 'Capacity must be a positive integer greater than zero.' });
    }

    const venue = await db.createVenue({
      venue_name: venue_name.trim(),
      location_type: location_type === 'out_campus' ? 'out_campus' : 'in_campus',
      max_capacity: capacityNum,
    });

    logAudit({
      actor: req.auth!.user.name,
      actorRole: req.auth!.role,
      action: 'CREATE_VENUE',
      collection: 'venues',
      outcome: 'ALLOWED',
      predicate: 'auth.role == "Admin"',
      reason: `Created venue "${venue.venue_name}" with capacity ${venue.max_capacity}`,
    });

    return res.status(201).json({ venue });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A venue with this name already exists.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to create venue.' });
  }
});

// PATCH /api/venues/:id (RLS Guard: Admin only)
apiRouter.patch('/venues/:id', requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { venue_name, max_capacity, location_type } = req.body;

    const updates: any = {};
    if (venue_name) updates.venue_name = venue_name.trim();
    if (location_type) updates.location_type = location_type;
    if (max_capacity !== undefined) {
      const cap = parseInt(max_capacity, 10);
      if (isNaN(cap) || cap <= 0) {
        return res.status(400).json({ error: 'Capacity must be greater than zero.' });
      }
      updates.max_capacity = cap;
    }

    const updated = await db.updateVenue(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Venue not found.' });
    }

    logAudit({
      actor: req.auth!.user.name,
      actorRole: req.auth!.role,
      action: 'UPDATE_VENUE_CAPACITY',
      collection: 'venues',
      outcome: 'ALLOWED',
      predicate: 'auth.role == "Admin"',
      reason: `Updated venue "${updated.venue_name}" capacity to ${updated.max_capacity}`,
    });

    return res.json({ venue: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update venue.' });
  }
});

// -----------------------------------------------------------------------------
// 3. Event Booking & Approvals (RLS Protected)
// -----------------------------------------------------------------------------

// GET /api/events/approved (Public / Student feed)
apiRouter.get('/events/approved', async (_req: Request, res: Response) => {
  try {
    const events = await db.findApprovedEvents();
    return res.json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve approved events.' });
  }
});

// POST /api/events (RLS Guard: Organizer or Admin only; sets organizer_id = auth.uid)
apiRouter.post('/events', requireRole(['Organizer', 'Admin']), async (req: Request, res: Response) => {
  try {
    const { title, category, description, venue_id, event_date } = req.body;
    // RLS: Bind event ownership strictly to the authenticated user's ID
    const userId = req.auth!.uid;

    if (!title || !category || !description || !venue_id || !event_date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Edge Case 1: Past Date Prevention
    const today = new Date().toISOString().split('T')[0];
    if (event_date < today) {
      return res.status(400).json({ error: 'Event date cannot be in the past. Please select today or a future date.' });
    }

    // Verify Venue exists
    const venue = await db.findVenueById(venue_id);
    if (!venue) {
      return res.status(404).json({ error: 'Selected venue does not exist.' });
    }

    // Database Partial Unique Index check on (venue_id, event_date)
    const event = await db.createEvent({
      title: title.trim(),
      category,
      description: description.trim(),
      venue_id,
      organizer_id: userId,
      event_date,
    });

    logAudit({
      actor: req.auth!.user.name,
      actorRole: req.auth!.role,
      action: 'SUBMIT_EVENT_REQUEST',
      collection: 'events',
      outcome: 'ALLOWED',
      predicate: 'auth.role IN ["Organizer", "Admin"] AND organizer_id == auth.uid',
      reason: `Submitted booking for "${event.title}" on ${event.event_date}`,
    });

    return res.status(201).json({ event });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'This venue is already requested or booked for the selected date. Please choose a different date or venue.',
      });
    }
    return res.status(500).json({ error: err.message || 'Failed to submit event request.' });
  }
});

// GET /api/events/my-events (RLS: Organizer can only view their own submissions)
apiRouter.get('/events/my-events', requireRole(['Organizer', 'Admin']), async (req: Request, res: Response) => {
  try {
    // RLS: Scoped strictly to authenticated user's ID
    const userId = req.auth!.uid;
    const events = await db.findOrganizerEvents(userId);
    return res.json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch organizer events.' });
  }
});

// GET /api/admin/events/pending (RLS Guard: Admin only)
apiRouter.get('/admin/events/pending', requireRole(['Admin']), async (_req: Request, res: Response) => {
  try {
    const events = await db.findPendingEvents();
    return res.json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch pending requests.' });
  }
});

// PATCH /api/admin/events/:id (RLS Guard: Admin only - Organizers cannot self-approve)
apiRouter.patch('/admin/events/:id', requireRole(['Admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
    }

    const updated = await db.updateEventStatus(id, status as 'Approved' | 'Rejected');
    if (!updated) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    logAudit({
      actor: req.auth!.user.name,
      actorRole: req.auth!.role,
      action: `EVENT_${status.toUpperCase()}`,
      collection: 'events',
      outcome: 'ALLOWED',
      predicate: 'auth.role == "Admin"',
      reason: `Admin updated event status to ${status}`,
    });

    return res.json({ event: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update event status.' });
  }
});

// -----------------------------------------------------------------------------
// 4. Registrations & Capacity Enforcement (RLS Protected)
// -----------------------------------------------------------------------------

// POST /api/events/:id/register (RLS: Authenticated Student registers for themselves)
apiRouter.post('/events/:id/register', requireAuth, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    // RLS: User ID is extracted directly from the verified authentication context
    const userId = req.auth!.uid;

    const result = await db.registerUserForEvent(eventId, userId);

    logAudit({
      actor: req.auth!.user.name,
      actorRole: req.auth!.role,
      action: 'RESERVE_SEAT',
      collection: 'registrations',
      outcome: 'ALLOWED',
      predicate: 'auth.uid == user_id AND registered_count < max_capacity',
      reason: `Reserved seat for event "${result.event.title}"`,
    });

    return res.status(201).json(result);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You are already registered for this event.' });
    }
    if (err.message?.includes('Housefull') || err.message?.includes('capacity')) {
      return res.status(400).json({ error: 'Housefull: Maximum venue capacity reached.' });
    }
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// DELETE /api/events/:id/register (RLS: User can only cancel their own registration)
apiRouter.delete('/events/:id/register', requireAuth, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const userId = req.auth!.uid;

    const success = await db.cancelRegistration(eventId, userId);
    if (!success) {
      return res.status(404).json({ error: 'Registration record not found.' });
    }

    logAudit({
      actor: req.auth!.user.name,
      actorRole: req.auth!.role,
      action: 'CANCEL_REGISTRATION',
      collection: 'registrations',
      outcome: 'ALLOWED',
      predicate: 'auth.uid == user_id',
      reason: 'Cancelled personal seat reservation',
    });

    return res.json({ message: 'Registration cancelled successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to cancel registration.' });
  }
});

// GET /api/users/registrations (RLS: Student can only view their own passes)
apiRouter.get('/users/registrations', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.uid;
    const registrations = await db.getUserRegistrations(userId);
    return res.json({ registrations });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve registrations.' });
  }
});

// GET /api/events/:id/registrations (RLS: Attendee roster is private to event owner or Admin)
apiRouter.get('/events/:id/registrations', requireAuth, async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await db.findEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const organizerId = typeof event.organizer_id === 'object' ? event.organizer_id._id : event.organizer_id;

    // RLS Predicate check: Actor must be the organizer who owns this event OR an Admin
    const isOwner = req.auth!.uid === organizerId;
    const isAdmin = req.auth!.role === 'Admin';

    if (!isOwner && !isAdmin) {
      logAudit({
        actor: req.auth!.user.name,
        actorRole: req.auth!.role,
        action: 'VIEW_ATTENDEE_ROSTER_UNAUTHORIZED',
        collection: 'registrations',
        outcome: 'DENIED',
        predicate: 'event.organizer_id == auth.uid OR auth.role == "Admin"',
        reason: 'Attempted to access private attendee contact roster for another organizer\'s event.',
      });

      return res.status(403).json({
        error: '403 Forbidden: Contact rosters are private to the event organizer and campus administration.',
      });
    }

    const attendees = await db.getEventAttendees(eventId);

    logAudit({
      actor: req.auth!.user.name,
      actorRole: req.auth!.role,
      action: 'VIEW_ATTENDEE_ROSTER',
      collection: 'registrations',
      outcome: 'ALLOWED',
      predicate: 'event.organizer_id == auth.uid OR auth.role == "Admin"',
      reason: `Retrieved ${attendees.length} attendee records for event "${event.title}"`,
    });

    return res.json({ attendees });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve attendees.' });
  }
});

// -----------------------------------------------------------------------------
// 5. Admin RLS Security & Audit Endpoints
// -----------------------------------------------------------------------------

// GET /api/admin/rls/policies (View active RLS rules)
apiRouter.get('/admin/rls/policies', requireRole(['Admin']), (_req: Request, res: Response) => {
  return res.json({ policies: RLS_POLICIES });
});

// GET /api/admin/rls/audit-logs (View live access audit logs)
apiRouter.get('/admin/rls/audit-logs', requireRole(['Admin']), (_req: Request, res: Response) => {
  return res.json({ logs: getAuditLogs() });
});

// POST /api/admin/rls/simulate (Interactive Policy Simulator)
apiRouter.post('/admin/rls/simulate', requireRole(['Admin']), (req: Request, res: Response) => {
  const result = simulateRLSCheck(req.body);
  return res.json(result);
});
