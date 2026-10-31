/**
 * CampusEventHub Client API Service
 * Handles all REST communication with /api endpoints.
 */

import { IUser, IVenue, IEvent, IRegistration, UserRole, EventCategory } from '../types/index.ts';

const CURRENT_USER_KEY = 'campus_event_hub_user';

export const storage = {
  getUser(): IUser | null {
    try {
      const data = localStorage.getItem(CURRENT_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setUser(user: IUser | null) {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const currentUser = storage.getUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(currentUser?._id ? { 'x-user-id': currentUser._id } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<IUser> {
    const res = await apiRequest<{ user: IUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    storage.setUser(res.user);
    return res.user;
  },

  async register(name: string, email: string, password: string, role: 'Student' | 'Organizer'): Promise<IUser> {
    const res = await apiRequest<{ user: IUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    storage.setUser(res.user);
    return res.user;
  },

  async getMe(): Promise<IUser | null> {
    try {
      const res = await apiRequest<{ user: IUser }>('/api/auth/me');
      storage.setUser(res.user);
      return res.user;
    } catch {
      storage.setUser(null);
      return null;
    }
  },

  async demoSwitch(role: UserRole): Promise<IUser> {
    const res = await apiRequest<{ user: IUser }>('/api/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    storage.setUser(res.user);
    return res.user;
  },

  logout() {
    storage.setUser(null);
  },

  // Venues
  async getVenues(): Promise<IVenue[]> {
    const res = await apiRequest<{ venues: IVenue[] }>('/api/venues');
    return res.venues;
  },

  async createVenue(venue_name: string, location_type: 'in_campus' | 'out_campus', max_capacity: number): Promise<IVenue> {
    const res = await apiRequest<{ venue: IVenue }>('/api/venues', {
      method: 'POST',
      body: JSON.stringify({ venue_name, location_type, max_capacity }),
    });
    return res.venue;
  },

  async updateVenue(id: string, updates: Partial<IVenue>): Promise<IVenue> {
    const res = await apiRequest<{ venue: IVenue }>(`/api/venues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.venue;
  },

  // Events
  async getApprovedEvents(): Promise<IEvent[]> {
    const res = await apiRequest<{ events: IEvent[] }>('/api/events/approved');
    return res.events;
  },

  async getMyEvents(): Promise<IEvent[]> {
    const res = await apiRequest<{ events: IEvent[] }>('/api/events/my-events');
    return res.events;
  },

  async getPendingEvents(): Promise<IEvent[]> {
    const res = await apiRequest<{ events: IEvent[] }>('/api/admin/events/pending');
    return res.events;
  },

  async createEvent(data: {
    title: string;
    category: EventCategory;
    description: string;
    venue_id: string;
    event_date: string;
  }): Promise<IEvent> {
    const res = await apiRequest<{ event: IEvent }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.event;
  },

  async updateEventStatus(id: string, status: 'Approved' | 'Rejected'): Promise<IEvent> {
    const res = await apiRequest<{ event: IEvent }>(`/api/admin/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.event;
  },

  // Registrations
  async registerForEvent(eventId: string): Promise<{ registration: IRegistration; event: IEvent }> {
    return apiRequest<{ registration: IRegistration; event: IEvent }>(`/api/events/${eventId}/register`, {
      method: 'POST',
    });
  },

  async cancelRegistration(eventId: string): Promise<void> {
    await apiRequest(`/api/events/${eventId}/register`, {
      method: 'DELETE',
    });
  },

  async getMyRegistrations(userId?: string): Promise<{ _id: string; createdAt: string; event: IEvent }[]> {
    try {
      const res = await apiRequest<{ registrations: { _id: string; createdAt: string; event: IEvent }[] }>(
        '/api/users/registrations',
        userId ? { headers: { 'x-user-id': userId } } : {}
      );
      return res.registrations || [];
    } catch {
      return [];
    }
  },

  async getAttendees(eventId: string): Promise<{ name: string; email: string; registeredAt: string }[]> {
    const res = await apiRequest<{ attendees: { name: string; email: string; registeredAt: string }[] }>(
      `/api/events/${eventId}/registrations`
    );
    return res.attendees;
  },

  // RLS Security & Audit
  async getRLSPolicies(): Promise<any[]> {
    const res = await apiRequest<{ policies: any[] }>('/api/admin/rls/policies');
    return res.policies;
  },

  async getRLSAuditLogs(): Promise<any[]> {
    const res = await apiRequest<{ logs: any[] }>('/api/admin/rls/audit-logs');
    return res.logs;
  },

  async simulateRLS(data: {
    role: 'Student' | 'Organizer' | 'Admin' | 'Guest';
    action: string;
    targetOwnerId?: string;
    actorId?: string;
  }): Promise<{ outcome: 'ALLOWED' | 'DENIED'; ruleId: string; predicate: string; reason: string }> {
    return apiRequest('/api/admin/rls/simulate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
