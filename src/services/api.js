/**
 * CampusEventHub Client API Service (JavaScript Edition)
 */

const CURRENT_USER_KEY = 'campus_event_hub_user';

export const storage = {
  getUser() {
    try {
      const data = localStorage.getItem(CURRENT_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  setUser(user) {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },
};

async function apiRequest(endpoint, options = {}) {
  const currentUser = storage.getUser();
  const headers = {
    'Content-Type': 'application/json',
    ...(currentUser?._id ? { 'x-user-id': currentUser._id } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  async login(email, password) {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    storage.setUser(res.user);
    return res.user;
  },

  async register(name, email, password, role) {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    storage.setUser(res.user);
    return res.user;
  },

  async getMe() {
    try {
      const res = await apiRequest('/api/auth/me');
      storage.setUser(res.user);
      return res.user;
    } catch {
      storage.setUser(null);
      return null;
    }
  },

  async demoSwitch(role) {
    const res = await apiRequest('/api/auth/demo-switch', {
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
  async getVenues() {
    const res = await apiRequest('/api/venues');
    return res.venues;
  },

  async createVenue(venue_name, location_type, max_capacity) {
    const res = await apiRequest('/api/venues', {
      method: 'POST',
      body: JSON.stringify({ venue_name, location_type, max_capacity }),
    });
    return res.venue;
  },

  async updateVenue(id, updates) {
    const res = await apiRequest(`/api/venues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.venue;
  },

  // Events
  async getApprovedEvents() {
    const res = await apiRequest('/api/events/approved');
    return res.events;
  },

  async getMyEvents() {
    const res = await apiRequest('/api/events/my-events');
    return res.events;
  },

  async getPendingEvents() {
    const res = await apiRequest('/api/admin/events/pending');
    return res.events;
  },

  async createEvent(data) {
    const res = await apiRequest('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.event;
  },

  async updateEventStatus(id, status) {
    const res = await apiRequest(`/api/admin/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.event;
  },

  // Registrations
  async registerForEvent(eventId) {
    return apiRequest(`/api/events/${eventId}/register`, {
      method: 'POST',
    });
  },

  async cancelRegistration(eventId) {
    await apiRequest(`/api/events/${eventId}/register`, {
      method: 'DELETE',
    });
  },

  async getMyRegistrations(userId) {
    try {
      const res = await apiRequest(
        '/api/users/registrations',
        userId ? { headers: { 'x-user-id': userId } } : {}
      );
      return res.registrations || [];
    } catch {
      return [];
    }
  },

  async getAttendees(eventId) {
    const res = await apiRequest(`/api/events/${eventId}/registrations`);
    return res.attendees;
  },

  // RLS Security & Audit
  async getRLSPolicies() {
    const res = await apiRequest('/api/admin/rls/policies');
    return res.policies;
  },

  async getRLSAuditLogs() {
    const res = await apiRequest('/api/admin/rls/audit-logs');
    return res.logs;
  },

  async simulateRLS(data) {
    return apiRequest('/api/admin/rls/simulate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
