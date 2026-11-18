/**
 * EventSphere Client API Service (JavaScript Edition)
 */

const USER_KEY = 'eventsphere_auth_user';
const TOKEN_KEY = 'eventsphere_auth_token';
const LEGACY_USER_KEY = 'campus_event_hub_user';

export const storage = {
  getUser() {
    try {
      const data = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  },

  setSession(user, token, rememberMe = true) {
    try {
      const target = rememberMe ? localStorage : sessionStorage;
      // Clear opposite storage
      const opposite = rememberMe ? sessionStorage : localStorage;
      opposite.removeItem(USER_KEY);
      opposite.removeItem(TOKEN_KEY);

      if (user) {
        target.setItem(USER_KEY, JSON.stringify(user));
        localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(USER_KEY);
        localStorage.removeItem(LEGACY_USER_KEY);
      }

      if (token) {
        target.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Ignore storage errors in private browsing
    }
  },

  setUser(user) {
    this.setSession(user, this.getToken(), true);
  },

  clearSession() {
    try {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore
    }
  },
};

async function apiRequest(endpoint, options = {}) {
  const token = storage.getToken();
  const currentUser = storage.getUser();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  async login(email, password, rememberMe = true) {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    storage.setSession(res.user, res.token, rememberMe);
    return res.user;
  },

  async register(name, email, password, role, rememberMe = true) {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    storage.setSession(res.user, res.token, rememberMe);
    return res.user;
  },

  async googleAuth(payload, rememberMe = true) {
    const res = await apiRequest('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    storage.setSession(res.user, res.token, rememberMe);
    return res.user;
  },

  async forgotPassword(email) {
    return await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email, code, newPassword) {
    return await apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  },

  async getMe() {
    try {
      const res = await apiRequest('/api/auth/me');
      if (res.user) {
        storage.setUser(res.user);
      }
      return res.user;
    } catch {
      storage.clearSession();
      return null;
    }
  },

  async demoSwitch(role) {
    const res = await apiRequest('/api/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    storage.setSession(res.user, res.token, true);
    return res.user;
  },

  logout() {
    storage.clearSession();
  },

  // Venues
  async getVenues() {
    const res = await apiRequest('/api/venues');
    return res.venues;
  },

  async createVenue(venueData, location_type, max_capacity) {
    const payload =
      typeof venueData === 'object'
        ? venueData
        : { venue_name: venueData, location_type, max_capacity };

    const res = await apiRequest('/api/venues', {
      method: 'POST',
      body: JSON.stringify(payload),
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

  async updateEvent(id, updates) {
    const res = await apiRequest(`/api/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
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

  // Community Venue Listings & Inquiries
  async createListing(data) {
    const res = await apiRequest('/api/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.listing;
  },

  async getApprovedListings(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.city && params.city !== 'all') query.set('city', params.city);
    if (params.minCapacity) query.set('minCapacity', params.minCapacity);

    const queryString = query.toString();
    const endpoint = `/api/listings/approved${queryString ? `?${queryString}` : ''}`;
    const res = await apiRequest(endpoint);
    return res.listings || [];
  },

  async getMyListings() {
    const res = await apiRequest('/api/listings/my-listings');
    return res.listings || [];
  },

  async getListingDetails(id) {
    const res = await apiRequest(`/api/listings/${id}`);
    return res.listing;
  },

  async updateListing(id, updates) {
    const res = await apiRequest(`/api/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return res.listing;
  },

  async deleteListing(id) {
    const res = await apiRequest(`/api/listings/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  async getAdminListings() {
    const res = await apiRequest('/api/admin/listings');
    return res.listings || [];
  },

  async updateListingStatus(id, status, adminRemarks = '') {
    const res = await apiRequest(`/api/admin/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminRemarks }),
    });
    return res.listing;
  },

  async sendVenueInquiry(listingId, data) {
    const res = await apiRequest(`/api/listings/${listingId}/inquire`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async getMyInquiries() {
    const res = await apiRequest('/api/listings/my-inquiries');
    return res.inquiries || [];
  },

  async updateInquiryStatus(inquiryId, status) {
    const res = await apiRequest(`/api/listings/inquiries/${inquiryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.inquiry;
  },

  // Private Admin Listing & Contact Inquiries
  async getContactConfig() {
    const res = await apiRequest('/api/config/contact');
    return res;
  },

  async submitContactRequest(data) {
    const res = await apiRequest('/api/contact-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res;
  },

  async getAdminContactRequests(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.requestType && params.requestType !== 'all') query.set('requestType', params.requestType);
    const queryString = query.toString();
    const endpoint = `/api/admin/contact-requests${queryString ? `?${queryString}` : ''}`;
    const res = await apiRequest(endpoint);
    return res.requests || [];
  },

  async updateAdminContactRequest(id, updates) {
    const res = await apiRequest(`/api/admin/contact-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.request;
  },

  async getAdminOrganizers() {
    const res = await apiRequest('/api/admin/organizers');
    return res.organizers || [];
  },

  async adminCreateEvent(data) {
    const res = await apiRequest('/api/admin/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.event;
  },
};
