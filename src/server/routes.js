/**
 * CampusEventHub REST API Routes (JavaScript Edition)
 */

import { Router } from 'express';
import { db } from './db.js';
import {
  rlsAuthContext,
  requireAuth,
  requireRole,
  logAudit,
  getAuditLogs,
  RLS_POLICIES,
  simulateRLSCheck,
  signToken,
} from './rls.js';

export const apiRouter = Router();

// In-memory verification code registry for password recovery: email -> { code, expiresAt }
const passwordResetCodes = new Map();

// Apply RLS Auth Context extractor to all requests
apiRouter.use(rlsAuthContext);

// -----------------------------------------------------------------------------
// 1. Authentication & Role Management
// -----------------------------------------------------------------------------

// POST /api/auth/register
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields (name, email, password, role) are required.' });
    }

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
      password,
      role,
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
    const token = signToken({ uid: newUser._id, role: newUser.role, email: newUser.email });
    return res.status(201).json({ user: userSafe, token });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to register account.' });
  }
});

// POST /api/auth/login
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
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
    const token = signToken({ uid: user._id, role: user.role, email: user.email });
    return res.json({ user: userSafe, token });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Helper to decode Google credential JWT payload
function parseGoogleJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// POST /api/auth/google
apiRouter.post('/auth/google', async (req, res) => {
  try {
    const { credential, email, name, role, avatar, googleId } = req.body || {};

    let userEmail = email;
    let userName = name;
    let userAvatar = avatar;
    let userGoogleId = googleId;

    if (credential && typeof credential === 'string') {
      const decoded = parseGoogleJwt(credential);
      if (decoded && decoded.email) {
        userEmail = decoded.email;
        userName = userName || decoded.name;
        userAvatar = userAvatar || decoded.picture;
        userGoogleId = userGoogleId || decoded.sub;
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: 'Valid Google email or credential token is required.' });
    }

    userEmail = userEmail.trim().toLowerCase();
    userName = (userName || userEmail.split('@')[0]).trim();

    // Check if user already exists
    let user = await db.findUserByEmail(userEmail);

    if (user) {
      logAudit({
        actor: user.name,
        actorRole: user.role,
        action: 'LOGIN_GOOGLE_SUCCESS',
        collection: 'users',
        outcome: 'ALLOWED',
        predicate: 'google_account_auth == true',
      });

      const { password: _, ...userSafe } = user;
      const token = signToken({ uid: user._id, role: user.role, email: user.email });
      return res.json({ user: userSafe, token, isNewUser: false });
    }

    // Register new user via Google
    const userRole = role && ['Student', 'Organizer'].includes(role) ? role : 'Student';

    const newUser = await db.createUser({
      name: userName,
      email: userEmail,
      password: `google_oauth_${Math.random().toString(36).substring(2, 15)}`,
      role: userRole,
      avatar: userAvatar || '',
      googleId: userGoogleId || '',
      authProvider: 'google',
    });

    logAudit({
      actor: newUser.name,
      actorRole: newUser.role,
      action: 'REGISTER_GOOGLE_SUCCESS',
      collection: 'users',
      outcome: 'ALLOWED',
      predicate: 'google_oauth == true',
    });

    const { password: _, ...userSafe } = newUser;
    const token = signToken({ uid: newUser._id, role: newUser.role, email: newUser.email });
    return res.status(201).json({ user: userSafe, token, isNewUser: true });
  } catch (err) {
    console.error('[CampusEventHub] Google auth error:', err);
    return res.status(500).json({ error: err.message || 'Google authentication failed.' });
  }
});

// POST /api/auth/forgot-password (Functional recovery code generation)
apiRouter.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const user = await db.findUserByEmail(email.trim());
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    passwordResetCodes.set(email.trim().toLowerCase(), {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
    });

    logAudit({
      actor: user.name,
      actorRole: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      collection: 'users',
      outcome: 'ALLOWED',
      predicate: 'email == registered',
    });

    return res.json({
      message: 'Password recovery code generated successfully.',
      code, // Returned for instant interactive testing in campus demo
      expiresIn: '15 minutes',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to request password reset.' });
  }
});

// POST /api/auth/reset-password (Functional password update)
apiRouter.post('/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const emailKey = email.trim().toLowerCase();
    const record = passwordResetCodes.get(emailKey);
    if (!record || record.code !== code.trim() || record.expiresAt < Date.now()) {
      logAudit({
        actor: email,
        actorRole: 'Guest',
        action: 'PASSWORD_RESET_FAILED',
        collection: 'users',
        outcome: 'DENIED',
        predicate: 'code == valid_and_unexpired',
        reason: 'Invalid or expired password reset verification code.',
      });
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    const updated = await db.updateUserPassword(emailKey, newPassword);
    if (!updated) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    passwordResetCodes.delete(emailKey);

    logAudit({
      actor: updated.name,
      actorRole: updated.role,
      action: 'PASSWORD_RESET_SUCCESS',
      collection: 'users',
      outcome: 'ALLOWED',
      predicate: 'true',
    });

    return res.json({ message: 'Password has been reset successfully. You can now sign in with your new password.' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
});

// GET /api/auth/me
apiRouter.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const user = req.auth.user;
    const { password: _, ...userSafe } = user;
    return res.json({ user: userSafe });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch user.' });
  }
});

// POST /api/auth/demo-switch (Quick persona switcher)
apiRouter.post('/auth/demo-switch', async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!role || !['Student', 'Organizer', 'Admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid demo role (Student, Organizer, Admin) required.' });
    }

    const users = await db.findUsers({ role });
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
    const token = signToken({ uid: user._id, role: user.role, email: user.email });
    return res.json({ user: userSafe, token });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Demo switch failed.' });
  }
});

// -----------------------------------------------------------------------------
// 2. Venue Management
// -----------------------------------------------------------------------------

// GET /api/venues (Public read)
apiRouter.get('/venues', async (_req, res) => {
  try {
    const venues = await db.findVenues();
    return res.json({ venues });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve venues.' });
  }
});

// POST /api/venues (RLS Guard: Admin only)
apiRouter.post('/venues', requireRole(['Admin']), async (req, res) => {
  try {
    const { venue_name, location_type, max_capacity } = req.body || {};

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
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: 'CREATE_VENUE',
      collection: 'venues',
      outcome: 'ALLOWED',
      predicate: 'auth.role == "Admin"',
      reason: `Created venue "${venue.venue_name}" with capacity ${venue.max_capacity}`,
    });

    return res.status(201).json({ venue });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A venue with this name already exists.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to create venue.' });
  }
});

// PATCH /api/venues/:id (RLS Guard: Admin only)
apiRouter.patch('/venues/:id', requireRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { venue_name, max_capacity, location_type } = req.body || {};

    const updates = {};
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
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: 'UPDATE_VENUE_CAPACITY',
      collection: 'venues',
      outcome: 'ALLOWED',
      predicate: 'auth.role == "Admin"',
      reason: `Updated venue "${updated.venue_name}" capacity to ${updated.max_capacity}`,
    });

    return res.json({ venue: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update venue.' });
  }
});

// -----------------------------------------------------------------------------
// 3. Event Booking & Approvals
// -----------------------------------------------------------------------------

// GET /api/events/approved (Public feed)
apiRouter.get('/events/approved', async (_req, res) => {
  try {
    const events = await db.findApprovedEvents();
    return res.json({ events });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve approved events.' });
  }
});

// POST /api/events (RLS Guard: Organizer or Admin only)
apiRouter.post('/events', requireRole(['Organizer', 'Admin']), async (req, res) => {
  try {
    const { title, category, description, venue_id, event_date } = req.body || {};
    const userId = req.auth.uid;

    if (!title || !category || !description || !venue_id || !event_date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (event_date < today) {
      return res.status(400).json({ error: 'Event date cannot be in the past. Please select today or a future date.' });
    }

    const venue = await db.findVenueById(venue_id);
    if (!venue) {
      return res.status(404).json({ error: 'Selected venue does not exist.' });
    }

    const event = await db.createEvent({
      title: title.trim(),
      category,
      description: description.trim(),
      venue_id,
      organizer_id: userId,
      event_date,
    });

    logAudit({
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: 'SUBMIT_EVENT_REQUEST',
      collection: 'events',
      outcome: 'ALLOWED',
      predicate: 'auth.role IN ["Organizer", "Admin"] AND organizer_id == auth.uid',
      reason: `Submitted booking for "${event.title}" on ${event.event_date}`,
    });

    return res.status(201).json({ event });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'This venue is already requested or booked for the selected date. Please choose a different date or venue.',
      });
    }
    return res.status(500).json({ error: err.message || 'Failed to submit event request.' });
  }
});

// GET /api/events/my-events (RLS: Organizer sees only their own submissions)
apiRouter.get('/events/my-events', async (req, res) => {
  try {
    if (!req.auth || (req.auth.role !== 'Organizer' && req.auth.role !== 'Admin')) {
      return res.json({ events: [] });
    }
    const userId = req.auth.uid;
    const events = await db.findOrganizerEvents(userId);
    return res.json({ events });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch organizer events.' });
  }
});

// GET /api/admin/events/pending (RLS Guard: Admin only)
apiRouter.get('/admin/events/pending', async (req, res) => {
  try {
    if (!req.auth || req.auth.role !== 'Admin') {
      return res.json({ events: [] });
    }
    const events = await db.findPendingEvents();
    return res.json({ events });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch pending requests.' });
  }
});

// PATCH /api/admin/events/:id (RLS Guard: Admin only)
apiRouter.patch('/admin/events/:id', requireRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
    }

    const updated = await db.updateEventStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    logAudit({
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: `EVENT_${status.toUpperCase()}`,
      collection: 'events',
      outcome: 'ALLOWED',
      predicate: 'auth.role == "Admin"',
      reason: `Admin updated event status to ${status}`,
    });

    return res.json({ event: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update event status.' });
  }
});

// -----------------------------------------------------------------------------
// 4. Registrations & Capacity Enforcement
// -----------------------------------------------------------------------------

// POST /api/events/:id/register (Student - Atomic seat increment)
apiRouter.post('/events/:id/register', requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.auth.uid;

    const result = await db.registerUserForEvent(eventId, userId);

    logAudit({
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: 'RESERVE_SEAT',
      collection: 'registrations',
      outcome: 'ALLOWED',
      predicate: 'auth.uid == user_id AND registered_count < max_capacity',
      reason: `Reserved seat for event "${result.event.title}"`,
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You are already registered for this event.' });
    }
    if (err.message?.includes('Housefull') || err.message?.includes('capacity')) {
      return res.status(400).json({ error: 'Housefull: Maximum venue capacity reached.' });
    }
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// DELETE /api/events/:id/register (Student - Cancel own reservation)
apiRouter.delete('/events/:id/register', requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.auth.uid;

    const success = await db.cancelRegistration(eventId, userId);
    if (!success) {
      return res.status(404).json({ error: 'Registration record not found.' });
    }

    logAudit({
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: 'CANCEL_REGISTRATION',
      collection: 'registrations',
      outcome: 'ALLOWED',
      predicate: 'auth.uid == user_id',
      reason: 'Cancelled personal seat reservation',
    });

    return res.json({ message: 'Registration cancelled successfully.' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to cancel registration.' });
  }
});

// GET /api/users/registrations (Student - Personal passbook)
apiRouter.get('/users/registrations', async (req, res) => {
  try {
    if (!req.auth) {
      return res.json({ registrations: [] });
    }
    const userId = req.auth.uid;
    const registrations = await db.getUserRegistrations(userId);
    return res.json({ registrations });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve registrations.' });
  }
});

// GET /api/events/:id/registrations (Organizer - Attendee roster with names & emails)
apiRouter.get('/events/:id/registrations', requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await db.findEventById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const organizerId = typeof event.organizer_id === 'object' ? event.organizer_id._id : event.organizer_id;
    const isOwner = req.auth.uid === organizerId;
    const isAdmin = req.auth.role === 'Admin';

    if (!isOwner && !isAdmin) {
      logAudit({
        actor: req.auth.user.name,
        actorRole: req.auth.role,
        action: 'VIEW_ATTENDEE_ROSTER_UNAUTHORIZED',
        collection: 'registrations',
        outcome: 'DENIED',
        predicate: 'event.organizer_id == auth.uid OR auth.role == "Admin"',
        reason: "Attempted to access private attendee contact roster for another organizer's event.",
      });

      return res.status(403).json({
        error: '403 Forbidden: Contact rosters are private to the event organizer and campus administration.',
      });
    }

    const attendees = await db.getEventAttendees(eventId);

    logAudit({
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: 'VIEW_ATTENDEE_ROSTER',
      collection: 'registrations',
      outcome: 'ALLOWED',
      predicate: 'event.organizer_id == auth.uid OR auth.role == "Admin"',
      reason: `Retrieved ${attendees.length} attendee records for event "${event.title}"`,
    });

    return res.json({ attendees });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve attendees.' });
  }
});

// -----------------------------------------------------------------------------
// 5. Admin RLS Security & Audit Endpoints
// -----------------------------------------------------------------------------

apiRouter.get('/admin/rls/policies', requireRole(['Admin']), (_req, res) => {
  return res.json({ policies: RLS_POLICIES });
});

apiRouter.get('/admin/rls/audit-logs', requireRole(['Admin']), (_req, res) => {
  return res.json({ logs: getAuditLogs() });
});

apiRouter.post('/admin/rls/simulate', requireRole(['Admin']), (req, res) => {
  const result = simulateRLSCheck(req.body);
  return res.json(result);
});

// -----------------------------------------------------------------------------
// 6. "List Your Venue" Community Listings & Inquiries API
// -----------------------------------------------------------------------------

// Basic in-memory rate limiter for public inquiry submissions: key -> [timestamps]
const inquiryRateLimits = new Map();

function checkInquiryRateLimit(key) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxSubmissions = 6;
  const history = inquiryRateLimits.get(key) || [];
  const validHistory = history.filter((ts) => now - ts < windowMs);

  if (validHistory.length >= maxSubmissions) {
    return false;
  }

  validHistory.push(now);
  inquiryRateLimits.set(key, validHistory);
  return true;
}

// POST /api/listings - Create venue listing (Authenticated)
apiRouter.post('/listings', requireAuth, async (req, res) => {
  try {
    const {
      venueName,
      category,
      description,
      capacity,
      address,
      city,
      state,
      pinCode,
      contactName,
      contactEmail,
      contactPhone,
    } = req.body || {};

    if (
      !venueName ||
      !category ||
      !description ||
      !capacity ||
      !address ||
      !city ||
      !state ||
      !pinCode ||
      !contactName ||
      !contactEmail ||
      !contactPhone
    ) {
      return res.status(400).json({
        error:
          'Please complete all required fields: Venue name, category, description, capacity, address, city, state, pin code, contact name, email, and phone.',
      });
    }

    const listing = await db.createVenueListing(req.body, req.auth.uid, req.auth.user.name);

    logAudit({
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: 'CREATE_VENUE_LISTING',
      collection: 'venue_listings',
      outcome: 'ALLOWED',
      predicate: 'auth.uid != null',
      reason: `Created listing "${listing.venueName}" in category "${listing.category}". Queued for admin review.`,
    });

    return res.status(201).json({ listing });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to submit venue listing.' });
  }
});

// GET /api/listings/approved - Public search of approved venue listings
apiRouter.get('/listings/approved', async (req, res) => {
  try {
    const { search, category, city, minCapacity } = req.query || {};
    const listings = await db.findApprovedVenueListings({
      search,
      category,
      city,
      minCapacity,
    });
    return res.json({ listings });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to search approved venues.' });
  }
});

// GET /api/listings/my-listings - Retrieve listings owned by the logged-in user
apiRouter.get('/listings/my-listings', requireAuth, async (req, res) => {
  try {
    const listings = await db.findVenueListingsByOwner(req.auth.uid);
    return res.json({ listings });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve your listings.' });
  }
});

// GET /api/listings/my-inquiries - Received inquiries for venue owner
apiRouter.get('/listings/my-inquiries', requireAuth, async (req, res) => {
  try {
    const inquiries = await db.findInquiriesByOwner(req.auth.uid);
    return res.json({ inquiries });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load inquiries.' });
  }
});

// PATCH /api/listings/inquiries/:id - Update inquiry status (Owner)
apiRouter.patch('/listings/inquiries/:id', requireAuth, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const updated = await db.updateInquiryStatus(req.params.id, status, req.auth.uid);
    return res.json({ inquiry: updated });
  } catch (err) {
    const statusCode = err.message?.includes('403') ? 403 : 500;
    return res.status(statusCode).json({ error: err.message || 'Failed to update inquiry status.' });
  }
});

// GET /api/admin/listings - Admin listing submissions queue (All statuses)
apiRouter.get('/admin/listings', requireRole(['Admin']), async (req, res) => {
  try {
    const listings = await db.findAllVenueListingsAdmin();
    return res.json({ listings });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch admin listings.' });
  }
});

// PATCH /api/admin/listings/:id/status - Admin approve / reject / request changes
apiRouter.patch('/admin/listings/:id/status', requireRole(['Admin']), async (req, res) => {
  try {
    const { status, adminRemarks } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const updated = await db.updateVenueListingStatus(
      req.params.id,
      status,
      adminRemarks,
      req.auth.uid,
      req.auth.user.name
    );

    logAudit({
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: 'MODERATE_VENUE_LISTING',
      collection: 'venue_listings',
      outcome: 'ALLOWED',
      predicate: 'auth.role == "Admin"',
      reason: `Updated venue listing "${updated.venueName}" to status "${status}". Remarks: ${adminRemarks || 'None'}`,
    });

    return res.json({ listing: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to update listing status.' });
  }
});

// GET /api/listings/:id - Retrieve venue details (masks contacts for non-owners)
apiRouter.get('/listings/:id', async (req, res) => {
  try {
    const listing = await db.findVenueListingById(
      req.params.id,
      req.auth?.uid,
      req.auth?.role === 'Admin'
    );

    if (!listing) {
      return res.status(404).json({ error: 'Venue listing not found or is currently private.' });
    }

    return res.json({ listing });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve venue details.' });
  }
});

// PUT /api/listings/:id - Update venue listing (Owner or Admin)
apiRouter.put('/listings/:id', requireAuth, async (req, res) => {
  try {
    const updated = await db.updateVenueListing(
      req.params.id,
      req.body,
      req.auth.uid,
      req.auth.role === 'Admin',
      req.auth.user.name
    );

    logAudit({
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: 'UPDATE_VENUE_LISTING',
      collection: 'venue_listings',
      outcome: 'ALLOWED',
      predicate: 'listing.ownerId == auth.uid OR auth.role == "Admin"',
      reason: `Updated listing "${updated.venueName}". Current status: "${updated.approvalStatus}".`,
    });

    return res.json({ listing: updated });
  } catch (err) {
    const statusCode = err.message?.includes('403') ? 403 : 500;
    return res.status(statusCode).json({ error: err.message || 'Failed to update listing.' });
  }
});

// DELETE /api/listings/:id - Delete venue listing (Owner or Admin)
apiRouter.delete('/listings/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteVenueListing(req.params.id, req.auth.uid, req.auth.role === 'Admin');

    logAudit({
      actor: req.auth.user.name,
      actorRole: req.auth.role,
      action: 'DELETE_VENUE_LISTING',
      collection: 'venue_listings',
      outcome: 'ALLOWED',
      predicate: 'listing.ownerId == auth.uid OR auth.role == "Admin"',
      reason: `Deleted venue listing ${req.params.id}`,
    });

    return res.json({ success: true, message: 'Venue listing deleted successfully.' });
  } catch (err) {
    const statusCode = err.message?.includes('403') ? 403 : 500;
    return res.status(statusCode).json({ error: err.message || 'Failed to delete listing.' });
  }
});

// POST /api/listings/:id/inquire - Submit inquiry to venue owner (Public or Authenticated with anti-spam rate limiting)
apiRouter.post('/listings/:id/inquire', async (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'guest_client';
    const rateLimitKey = `${ip}_${req.body?.senderEmail || ''}`;

    if (!checkInquiryRateLimit(rateLimitKey)) {
      return res.status(429).json({
        error: 'Too many inquiries sent in a short window. Please wait a few minutes before submitting another request.',
      });
    }

    const { senderName, senderEmail, senderPhone, eventDate, guestCount, message } = req.body || {};
    if (!senderName || !senderEmail || !eventDate || !message) {
      return res.status(400).json({
        error: 'Please provide your name, email, event date, and inquiry message.',
      });
    }

    const inquiry = await db.createVenueInquiry(
      {
        listingId: req.params.id,
        senderName,
        senderEmail,
        senderPhone,
        eventDate,
        guestCount,
        message,
      },
      req.auth?.uid
    );

    logAudit({
      actor: senderName,
      actorRole: req.auth?.role || 'Guest',
      action: 'SUBMIT_VENUE_INQUIRY',
      collection: 'venue_inquiries',
      outcome: 'ALLOWED',
      predicate: 'rate_limit == OK',
      reason: `Dispatched inquiry for venue listing ${req.params.id} regarding date ${eventDate}.`,
    });

    return res.status(201).json({
      inquiry,
      message: 'Your inquiry has been delivered directly to the venue owner!',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to send inquiry.' });
  }
});
