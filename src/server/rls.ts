/**
 * CampusEventHub Row-Level Security (RLS) Engine & Audit System
 * Enforces database-level ownership predicates, role validations,
 * query filtering, and real-time security auditing.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import { IUser, UserRole } from '../types/index.ts';

export interface AuthContext {
  uid: string;
  role: UserRole;
  user: IUser;
}

export interface RLSAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  collection: string;
  outcome: 'ALLOWED' | 'DENIED';
  predicate: string;
  reason?: string;
}

export interface RLSPolicy {
  id: string;
  collection: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  permittedRoles: UserRole[];
  predicateDescription: string;
  status: 'ACTIVE';
}

// In-memory security audit log
const auditLogs: RLSAuditEntry[] = [];

export function logAudit(entry: Omit<RLSAuditEntry, 'id' | 'timestamp'>) {
  const newEntry: RLSAuditEntry = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLogs.unshift(newEntry);
  if (auditLogs.length > 50) {
    auditLogs.pop();
  }
}

export function getAuditLogs(): RLSAuditEntry[] {
  return [...auditLogs];
}

// Active RLS Policy Definitions
export const RLS_POLICIES: RLSPolicy[] = [
  {
    id: 'POL-VENUE-01',
    collection: 'venues',
    operation: 'SELECT',
    permittedRoles: ['Student', 'Organizer', 'Admin'],
    predicateDescription: 'true (Public discovery of campus venue facilities and capacities)',
    status: 'ACTIVE',
  },
  {
    id: 'POL-VENUE-02',
    collection: 'venues',
    operation: 'INSERT',
    permittedRoles: ['Admin'],
    predicateDescription: 'auth.role == "Admin" (Only campus administration can add new venues)',
    status: 'ACTIVE',
  },
  {
    id: 'POL-VENUE-03',
    collection: 'venues',
    operation: 'UPDATE',
    permittedRoles: ['Admin'],
    predicateDescription: 'auth.role == "Admin" (Only campus administration can adjust venue capacity)',
    status: 'ACTIVE',
  },
  {
    id: 'POL-EVENT-01',
    collection: 'events',
    operation: 'SELECT',
    permittedRoles: ['Student', 'Organizer', 'Admin'],
    predicateDescription: 'status == "Approved" OR organizer_id == auth.uid OR auth.role == "Admin"',
    status: 'ACTIVE',
  },
  {
    id: 'POL-EVENT-02',
    collection: 'events',
    operation: 'INSERT',
    permittedRoles: ['Organizer', 'Admin'],
    predicateDescription: 'auth.role IN ["Organizer", "Admin"] AND organizer_id == auth.uid',
    status: 'ACTIVE',
  },
  {
    id: 'POL-EVENT-03',
    collection: 'events',
    operation: 'UPDATE',
    permittedRoles: ['Admin'],
    predicateDescription: 'auth.role == "Admin" (One-click decision queue; organizers cannot self-approve)',
    status: 'ACTIVE',
  },
  {
    id: 'POL-REG-01',
    collection: 'registrations',
    operation: 'SELECT',
    permittedRoles: ['Student', 'Organizer', 'Admin'],
    predicateDescription: 'user_id == auth.uid (Personal passbook) OR (is_roster AND event.organizer_id == auth.uid) OR auth.role == "Admin"',
    status: 'ACTIVE',
  },
  {
    id: 'POL-REG-02',
    collection: 'registrations',
    operation: 'INSERT',
    permittedRoles: ['Student'],
    predicateDescription: 'auth.role == "Student" AND requested_user_id == auth.uid (Cannot forge other student tickets)',
    status: 'ACTIVE',
  },
  {
    id: 'POL-REG-03',
    collection: 'registrations',
    operation: 'DELETE',
    permittedRoles: ['Student', 'Admin'],
    predicateDescription: 'user_id == auth.uid OR auth.role == "Admin" (Students can only cancel their own reservations)',
    status: 'ACTIVE',
  },
];

// Extend Express Request to include Auth Context
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

// Middleware: Extract Authentication Context
export async function rlsAuthContext(req: Request, _res: Response, next: NextFunction) {
  const userIdHeader = req.headers['x-user-id'];
  if (typeof userIdHeader === 'string' && userIdHeader.trim()) {
    try {
      const user = await db.findUserById(userIdHeader.trim());
      if (user) {
        req.auth = {
          uid: user._id,
          role: user.role,
          user,
        };
      }
    } catch {
      // Continue unauthenticated if user lookup fails
    }
  }
  next();
}

// RLS Guard: Require Authenticated User
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    logAudit({
      actor: 'Anonymous Guest',
      actorRole: 'Guest',
      action: `${req.method} ${req.path}`,
      collection: req.path.split('/')[2] || 'unknown',
      outcome: 'DENIED',
      predicate: 'auth != null',
      reason: 'Authentication token or session missing',
    });
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  next();
}

// RLS Guard: Require Specific Role(s)
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      logAudit({
        actor: 'Anonymous Guest',
        actorRole: 'Guest',
        action: `${req.method} ${req.path}`,
        collection: req.path.split('/')[2] || 'unknown',
        outcome: 'DENIED',
        predicate: 'auth != null',
        reason: 'Authentication token missing',
      });
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      logAudit({
        actor: req.auth.user.name,
        actorRole: req.auth.role,
        action: `${req.method} ${req.path}`,
        collection: req.path.split('/')[2] || 'unknown',
        outcome: 'DENIED',
        predicate: `auth.role IN [${allowedRoles.join(', ')}]`,
        reason: `Role "${req.auth.role}" does not have required permissions.`,
      });
      return res.status(403).json({
        error: `403 Forbidden: Access restricted to [${allowedRoles.join(', ')}] roles.`,
      });
    }

    next();
  };
}

// Simulator Engine: Evaluates a hypothetical security request against RLS rules
export function simulateRLSCheck(params: {
  role: 'Student' | 'Organizer' | 'Admin' | 'Guest';
  action: string;
  targetOwnerId?: string;
  actorId?: string;
}): { outcome: 'ALLOWED' | 'DENIED'; ruleId: string; predicate: string; reason: string } {
  const { role, action, targetOwnerId = 'owner-123', actorId = 'actor-123' } = params;

  switch (action) {
    case 'VIEW_APPROVED_EVENTS':
      return {
        outcome: 'ALLOWED',
        ruleId: 'POL-EVENT-01',
        predicate: 'status == "Approved"',
        reason: 'Public read allowed for all approved campus events.',
      };

    case 'SUBMIT_EVENT_REQUEST':
      if (role === 'Organizer' || role === 'Admin') {
        return {
          outcome: 'ALLOWED',
          ruleId: 'POL-EVENT-02',
          predicate: 'auth.role IN ["Organizer", "Admin"] AND organizer_id == auth.uid',
          reason: 'Authorized organizer submitting booking under own identity.',
        };
      }
      return {
        outcome: 'DENIED',
        ruleId: 'POL-EVENT-02',
        predicate: 'auth.role IN ["Organizer", "Admin"]',
        reason: `Role "${role}" is not permitted to request campus venues. Only Event Organizers or Admins can submit requests.`,
      };

    case 'APPROVE_REJECT_EVENT':
      if (role === 'Admin') {
        return {
          outcome: 'ALLOWED',
          ruleId: 'POL-EVENT-03',
          predicate: 'auth.role == "Admin"',
          reason: 'Campus administrator holds single-click approval authority.',
        };
      }
      return {
        outcome: 'DENIED',
        ruleId: 'POL-EVENT-03',
        predicate: 'auth.role == "Admin"',
        reason: `Role "${role}" cannot approve or reject events. Organizers are strictly blocked from self-approving.`,
      };

    case 'VIEW_ATTENDEE_ROSTER':
      if (role === 'Admin' || (role === 'Organizer' && actorId === targetOwnerId)) {
        return {
          outcome: 'ALLOWED',
          ruleId: 'POL-REG-01',
          predicate: 'event.organizer_id == auth.uid OR auth.role == "Admin"',
          reason: 'Access granted: Actor owns this event or holds Admin authority.',
        };
      }
      return {
        outcome: 'DENIED',
        ruleId: 'POL-REG-01',
        predicate: 'event.organizer_id == auth.uid OR auth.role == "Admin"',
        reason: 'Denied: Student attendee contact rosters are private to the event organizer and campus administration.',
      };

    case 'CREATE_VENUE':
    case 'EDIT_VENUE_CAPACITY':
      if (role === 'Admin') {
        return {
          outcome: 'ALLOWED',
          ruleId: 'POL-VENUE-02',
          predicate: 'auth.role == "Admin"',
          reason: 'Campus administrator authorized for facility management.',
        };
      }
      return {
        outcome: 'DENIED',
        ruleId: 'POL-VENUE-02',
        predicate: 'auth.role == "Admin"',
        reason: `Role "${role}" cannot modify campus venue configurations. Only Admins can manage spaces.`,
      };

    case 'CANCEL_ANOTHER_STUDENT_PASS':
      if (role === 'Admin') {
        return {
          outcome: 'ALLOWED',
          ruleId: 'POL-REG-03',
          predicate: 'auth.role == "Admin"',
          reason: 'Administrative override permitted.',
        };
      }
      return {
        outcome: 'DENIED',
        ruleId: 'POL-REG-03',
        predicate: 'user_id == auth.uid',
        reason: 'Denied: Row-level security prohibits cancelling reservations belonging to other students.',
      };

    default:
      return {
        outcome: 'DENIED',
        ruleId: 'DEFAULT-DENY',
        predicate: 'explicit_grant == true',
        reason: 'No policy exists permitting this operation.',
      };
  }
}
