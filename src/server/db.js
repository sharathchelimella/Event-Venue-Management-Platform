/**
 * CampusEventHub Database & Persistence Layer (JavaScript Edition)
 * Implements Mongoose ODM schemas, partial unique index for scheduling conflicts,
 * compound unique index for duplicate attendee prevention, and atomic capacity guards.
 * Supports both remote MongoDB connection and embedded JSON fallback.
 */

import mongoose, { Schema } from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DATA_FILE = path.resolve(process.cwd(), '.campus_data.json');

// -----------------------------------------------------------------------------
// Mongoose Schemas & Models
// -----------------------------------------------------------------------------
export const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  role: { type: String, enum: ['Student', 'Organizer', 'Admin'], required: true },
  avatar: { type: String, default: '' },
  googleId: { type: String, default: '' },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  createdAt: { type: Date, default: Date.now },
});

export const venueSchema = new Schema({
  venue_name: { type: String, required: true, unique: true },
  location_type: { type: String, enum: ['in_campus', 'out_campus'], default: 'in_campus' },
  max_capacity: { type: Number, required: true, min: 1 },
  coverImage: { type: String, default: '' },
  images: [
    {
      url: { type: String, required: true },
      caption: { type: String, default: '' },
      isCover: { type: Boolean, default: false },
    },
  ],
  description: { type: String, default: '' },
  facilities: [{ type: String }],
  pricing: {
    pricingType: { type: String, default: 'Free' },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  createdAt: { type: Date, default: Date.now },
});

export const eventSchema = new Schema({
  title: { type: String, required: true },
  category: {
    type: String,
    enum: ['Hackathon', 'Standup Comedy', 'Seminar', 'Cultural Show', 'Other'],
    required: true,
  },
  description: { type: String, required: true },
  venue_id: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
  organizer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  event_date: { type: String, required: true },
  event_time: { type: String, default: '10:00 AM - 01:00 PM' },
  duration_hours: { type: Number, default: 3 },
  posterImage: { type: String, default: '' },
  tags: [{ type: String }],
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  registered_count: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

// Partial Unique Index on (venue_id, event_date) for active (Pending / Approved) events
eventSchema.index(
  { venue_id: 1, event_date: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['Pending', 'Approved'] } } }
);

export const registrationSchema = new Schema({
  event_id: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

// Compound Unique Index on (event_id, user_id)
registrationSchema.index({ event_id: 1, user_id: 1 }, { unique: true });

// Venue Listing Schema for Community / User Listed Venues
export const venueListingSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  venueName: { type: String, required: true },
  category: {
    type: String,
    enum: ['Auditorium', 'Banquet Hall', 'Conference Hall', 'Seminar Hall', 'Outdoor Space', 'Other'],
    required: true,
  },
  description: { type: String, required: true },
  detailedInfo: { type: String, default: '' },
  capacity: { type: Number, required: true, min: 1 },
  suitableEvents: [{ type: String }],
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pinCode: { type: String, required: true },
  landmark: { type: String, default: '' },
  mapLocation: { type: String, default: '' },
  contactName: { type: String, required: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  altContactPhone: { type: String, default: '' },
  whatsappNumber: { type: String, default: '' },
  organizationName: { type: String, default: '' },
  preferredContactMethod: {
    type: String,
    enum: ['Email', 'Phone', 'WhatsApp', 'Any'],
    default: 'Email',
  },
  publicContactPreferences: {
    showEmail: { type: Boolean, default: true },
    showPhone: { type: Boolean, default: true },
    showWhatsapp: { type: Boolean, default: false },
  },
  facilities: [{ type: String }],
  pricing: {
    pricingType: {
      type: String,
      enum: ['Free', 'Per Hour', 'Per Day', 'Custom Quote'],
      default: 'Per Day',
    },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  operatingHours: {
    openingTime: { type: String, default: '09:00' },
    closingTime: { type: String, default: '21:00' },
    availableDays: [{ type: String }],
    venueRules: { type: String, default: '' },
  },
  images: [
    {
      url: { type: String, required: true },
      caption: { type: String, default: '' },
      isCover: { type: Boolean, default: false },
    },
  ],
  approvalStatus: {
    type: String,
    enum: ['Pending Approval', 'Approved', 'Rejected', 'Changes Requested'],
    default: 'Pending Approval',
  },
  adminRemarks: { type: String, default: '' },
  changeHistory: [
    {
      action: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      performedBy: { type: String, default: 'System' },
      details: { type: String, default: '' },
    },
  ],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

venueListingSchema.index({ approvalStatus: 1, isActive: 1 });
venueListingSchema.index({ ownerId: 1 });
venueListingSchema.index({ city: 1 });
venueListingSchema.index({ category: 1 });

// Venue Inquiries Schema
export const venueInquirySchema = new Schema({
  listingId: { type: Schema.Types.ObjectId, ref: 'VenueListing', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  senderName: { type: String, required: true },
  senderEmail: { type: String, required: true },
  senderPhone: { type: String, default: '' },
  eventDate: { type: String, required: true },
  guestCount: { type: Number, default: 1 },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Resolved', 'Archived'],
    default: 'New',
  },
  createdAt: { type: Date, default: Date.now },
});

venueInquirySchema.index({ listingId: 1 });
venueInquirySchema.index({ ownerId: 1 });

// Contact & Listing Requests Schema (Private Admin Inquiries)
export const contactRequestSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  requestType: {
    type: String,
    enum: ['List a Property', 'Submit Event Details', 'General Inquiry'],
    default: 'List a Property',
    required: true,
  },
  itemName: { type: String, default: '', trim: true },
  location: { type: String, default: '', trim: true },
  message: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['New', 'Under Review', 'Contacted', 'Completed', 'Rejected'],
    default: 'New',
  },
  internalNotes: { type: String, default: '' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

contactRequestSchema.index({ status: 1, createdAt: -1 });
contactRequestSchema.index({ requestType: 1 });
contactRequestSchema.index({ email: 1 });

// AI Event Plan Schema for Saved AI Recommendations
export const aiEventPlanSchema = new Schema({
  organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  linkedEventId: { type: Schema.Types.ObjectId, ref: 'Event', default: null },
  title: { type: String, required: true },
  category: { type: String, required: true },
  preferences: {
    participants: { type: Number, default: 100 },
    budget: { type: Number, default: 20000 },
    duration: { type: String, default: '4 Hours' },
    date: { type: String, default: '' },
    audience: { type: String, default: 'Open to All Students' },
    indoorOutdoor: { type: String, default: 'Indoor' },
    specialRequirements: { type: String, default: '' },
  },
  eventIdeas: [
    {
      title: { type: String, required: true },
      theme: { type: String, default: '' },
      description: { type: String, default: '' },
      activities: [{ type: String }],
      engagementTips: [{ type: String }],
    },
  ],
  recommendedVenues: [
    {
      venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
      venueName: { type: String, required: true },
      suitabilityReason: { type: String, default: '' },
      matchScore: { type: Number, default: 90 },
      capacity: { type: Number, default: 0 },
      coverImage: { type: String, default: '' },
      isAvailable: { type: Boolean, default: true },
    },
  ],
  schedule: [
    {
      time: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, default: '' },
    },
  ],
  budgetBreakdown: [
    {
      category: { type: String, required: true },
      estimatedAmount: { type: Number, required: true },
      notes: { type: String, default: '' },
    },
  ],
  requiredEquipment: [{ type: String }],
  promotionalCopy: {
    socialCaptions: [{ type: String }],
    posterContent: { type: String, default: '' },
    promotionalPitch: { type: String, default: '' },
  },
  status: {
    type: String,
    enum: ['Draft', 'SubmittedForReview', 'Archived'],
    default: 'Draft',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

aiEventPlanSchema.index({ organizerId: 1, createdAt: -1 });
aiEventPlanSchema.index({ linkedEventId: 1 });

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
export const VenueModel = mongoose.models.Venue || mongoose.model('Venue', venueSchema);
export const EventModel = mongoose.models.Event || mongoose.model('Event', eventSchema);
export const RegistrationModel =
  mongoose.models.Registration || mongoose.model('Registration', registrationSchema);
export const VenueListingModel =
  mongoose.models.VenueListing || mongoose.model('VenueListing', venueListingSchema);
export const VenueInquiryModel =
  mongoose.models.VenueInquiry || mongoose.model('VenueInquiry', venueInquirySchema);
export const ContactRequestModel =
  mongoose.models.ContactRequest || mongoose.model('ContactRequest', contactRequestSchema);
export const AiEventPlanModel =
  mongoose.models.AiEventPlan || mongoose.model('AiEventPlan', aiEventPlanSchema);

// Format helper to convert Mongoose documents to plain objects with string IDs
function formatDoc(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) obj._id = obj._id.toString();
  if (obj.venue_id && typeof obj.venue_id === 'object' && obj.venue_id._id) {
    obj.venue_id = formatDoc(obj.venue_id);
  } else if (obj.venue_id && typeof obj.venue_id !== 'object') {
    obj.venue_id = obj.venue_id.toString();
  }
  if (obj.organizer_id && typeof obj.organizer_id === 'object' && obj.organizer_id._id) {
    obj.organizer_id = formatDoc(obj.organizer_id);
  } else if (obj.organizer_id && typeof obj.organizer_id !== 'object') {
    obj.organizer_id = obj.organizer_id.toString();
  }
  if (obj.user_id && typeof obj.user_id === 'object' && obj.user_id._id) {
    obj.user_id = formatDoc(obj.user_id);
  } else if (obj.user_id && typeof obj.user_id !== 'object') {
    obj.user_id = obj.user_id.toString();
  }
  if (obj.event_id && typeof obj.event_id === 'object' && obj.event_id._id) {
    obj.event_id = formatDoc(obj.event_id);
  } else if (obj.event_id && typeof obj.event_id !== 'object') {
    obj.event_id = obj.event_id.toString();
  }
  if (obj.ownerId && typeof obj.ownerId === 'object' && obj.ownerId._id) {
    obj.ownerId = formatDoc(obj.ownerId);
  } else if (obj.ownerId && typeof obj.ownerId !== 'object') {
    obj.ownerId = obj.ownerId.toString();
  }
  if (obj.listingId && typeof obj.listingId === 'object' && obj.listingId._id) {
    obj.listingId = formatDoc(obj.listingId);
  } else if (obj.listingId && typeof obj.listingId !== 'object') {
    obj.listingId = obj.listingId.toString();
  }
  if (obj.senderId && typeof obj.senderId === 'object' && obj.senderId._id) {
    obj.senderId = formatDoc(obj.senderId);
  } else if (obj.senderId && typeof obj.senderId !== 'object') {
    obj.senderId = obj.senderId.toString();
  }
  if (obj.userId && typeof obj.userId === 'object' && obj.userId._id) {
    obj.userId = formatDoc(obj.userId);
  } else if (obj.userId && typeof obj.userId !== 'object') {
    obj.userId = obj.userId.toString();
  }
  if (obj.organizerId && typeof obj.organizerId === 'object' && obj.organizerId._id) {
    obj.organizerId = formatDoc(obj.organizerId);
  } else if (obj.organizerId && typeof obj.organizerId !== 'object') {
    obj.organizerId = obj.organizerId.toString();
  }
  if (obj.linkedEventId && typeof obj.linkedEventId === 'object' && obj.linkedEventId._id) {
    obj.linkedEventId = formatDoc(obj.linkedEventId);
  } else if (obj.linkedEventId && typeof obj.linkedEventId !== 'object') {
    obj.linkedEventId = obj.linkedEventId.toString();
  }
  return obj;
}

// -----------------------------------------------------------------------------
// CampusMongoEngine
// -----------------------------------------------------------------------------
class CampusMongoEngine {
  constructor() {
    this.state = {
      users: [],
      venues: [],
      events: [],
      registrations: [],
      listings: [],
      inquiries: [],
      contactRequests: [],
      aiEventPlans: [],
    };
    this.isConnectedToMongo = false;
    this.loadSnapshot();
  }

  loadSnapshot() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.state = {
          listings: [],
          inquiries: [],
          contactRequests: [],
          aiEventPlans: [],
          ...JSON.parse(raw),
        };
      }
    } catch {
      // Use defaults if read fails
    }
  }

  saveSnapshot() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch {
      // Ignore write errors in ephemeral environments
    }
  }

  async connect(uri) {
    const mongoUri = uri || process.env.MONGODB_URI;
    if (mongoUri) {
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
        this.isConnectedToMongo = true;
        console.log('[MongoDB] Connected to remote MongoDB instance successfully.');
        await Promise.allSettled([
          UserModel.init(),
          VenueModel.init(),
          EventModel.init(),
          RegistrationModel.init(),
          VenueListingModel.init(),
          VenueInquiryModel.init(),
          ContactRequestModel.init(),
          AiEventPlanModel.init(),
        ]);
        return true;
      } catch (err) {
        console.warn(
          `[MongoDB] Remote connection failed (${err.message}), running embedded high-integrity store.`
        );
      }
    }
    console.log('[MongoDB] Running embedded high-integrity Mongoose store with partial index guards.');
    return true;
  }

  generateId() {
    return new mongoose.Types.ObjectId().toHexString();
  }

  // ---- Users ----
  async findUsers(query = {}) {
    if (this.isConnectedToMongo) {
      const users = await UserModel.find(query).lean();
      return users.map((u) => ({ ...u, _id: u._id.toString() }));
    }
    return this.state.users.filter((u) => {
      for (const [k, v] of Object.entries(query)) {
        if (u[k] !== v) return false;
      }
      return true;
    });
  }

  async findUserByEmail(email) {
    if (this.isConnectedToMongo) {
      const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const user = await UserModel.findOne({
        email: new RegExp(`^${escaped}$`, 'i'),
      }).lean();
      return user ? { ...user, _id: user._id.toString() } : null;
    }
    const user = this.state.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    return user || null;
  }

  async findUserById(id) {
    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const user = await UserModel.findById(id).lean();
      return user ? { ...user, _id: user._id.toString() } : null;
    }
    const user = this.state.users.find((u) => u._id === id);
    return user || null;
  }

  async createUser(data) {
    if (this.isConnectedToMongo) {
      const existing = await this.findUserByEmail(data.email);
      if (existing) {
        const err = new Error(
          `E11000 duplicate key error collection: users index: email_1 dup key: { email: "${data.email}" }`
        );
        err.code = 11000;
        throw err;
      }
      const user = await UserModel.create({
        name: data.name,
        email: data.email.toLowerCase(),
        password: data.password || `google_${Math.random().toString(36).substring(2, 12)}`,
        role: data.role || 'Student',
        avatar: data.avatar || '',
        googleId: data.googleId || '',
        authProvider: data.authProvider || 'local',
      });
      return formatDoc(user);
    }

    const existing = await this.findUserByEmail(data.email);
    if (existing) {
      const err = new Error(
        `E11000 duplicate key error collection: users index: email_1 dup key: { email: "${data.email}" }`
      );
      err.code = 11000;
      throw err;
    }
    const user = {
      _id: this.generateId(),
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password || `google_${Math.random().toString(36).substring(2, 12)}`,
      role: data.role || 'Student',
      avatar: data.avatar || '',
      googleId: data.googleId || '',
      authProvider: data.authProvider || 'local',
      createdAt: new Date().toISOString(),
    };
    this.state.users.push(user);
    this.saveSnapshot();
    return user;
  }

  async updateUserPassword(email, newPassword) {
    if (this.isConnectedToMongo) {
      const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const user = await UserModel.findOneAndUpdate(
        { email: new RegExp(`^${escaped}$`, 'i') },
        { password: newPassword },
        { new: true }
      ).lean();
      return user ? formatDoc(user) : null;
    }
    const userIndex = this.state.users.findIndex(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (userIndex === -1) return null;
    this.state.users[userIndex].password = newPassword;
    this.saveSnapshot();
    return this.state.users[userIndex];
  }

  // ---- Venues ----
  async findVenues() {
    if (this.isConnectedToMongo) {
      const venues = await VenueModel.find().lean();
      const activeEvents = await EventModel.find({ status: { $ne: 'Rejected' } })
        .select('venue_id event_date')
        .lean();
      return venues.map((v) => {
        const vId = v._id.toString();
        const bookedDates = activeEvents
          .filter((e) => (e.venue_id ? e.venue_id.toString() : '') === vId)
          .map((e) => e.event_date);
        return {
          ...v,
          _id: vId,
          booked_dates: Array.from(new Set(bookedDates)),
        };
      });
    }

    const activeEvents = this.state.events.filter((e) => e.status !== 'Rejected');
    return this.state.venues.map((v) => {
      const bookedDates = activeEvents
        .filter((e) => {
          const vId = typeof e.venue_id === 'object' ? e.venue_id._id : e.venue_id;
          return vId === v._id;
        })
        .map((e) => e.event_date);
      return {
        ...v,
        booked_dates: Array.from(new Set(bookedDates)),
      };
    });
  }

  async findVenueById(id) {
    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const venue = await VenueModel.findById(id).lean();
      return venue ? { ...venue, _id: venue._id.toString() } : null;
    }
    const venue = this.state.venues.find((v) => v._id === id);
    return venue || null;
  }

  async createVenue(data) {
    const venuePayload = {
      venue_name: (data.venue_name || '').trim(),
      location_type: data.location_type || 'in_campus',
      max_capacity: Number(data.max_capacity) || 100,
      coverImage: data.coverImage || (data.images && data.images[0] ? data.images[0].url : ''),
      images: Array.isArray(data.images) ? data.images : [],
      description: (data.description || '').trim(),
      facilities: Array.isArray(data.facilities) ? data.facilities : [],
      pricing: data.pricing || { pricingType: 'Free', price: 0, currency: 'INR' },
    };

    if (this.isConnectedToMongo) {
      const existing = await VenueModel.findOne({
        venue_name: new RegExp(
          `^${venuePayload.venue_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          'i'
        ),
      });
      if (existing) {
        const err = new Error(
          `E11000 duplicate key error collection: venues index: venue_name_1 dup key: { venue_name: "${data.venue_name}" }`
        );
        err.code = 11000;
        throw err;
      }
      const venue = await VenueModel.create(venuePayload);
      return formatDoc(venue);
    }

    const existing = this.state.venues.find(
      (v) => v.venue_name.toLowerCase() === venuePayload.venue_name.toLowerCase()
    );
    if (existing) {
      const err = new Error(
        `E11000 duplicate key error collection: venues index: venue_name_1 dup key: { venue_name: "${data.venue_name}" }`
      );
      err.code = 11000;
      throw err;
    }
    const venue = {
      _id: this.generateId(),
      ...venuePayload,
      createdAt: new Date().toISOString(),
    };
    this.state.venues.push(venue);
    this.saveSnapshot();
    return venue;
  }

  async updateVenue(id, updates) {
    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      if (updates.venue_name) {
        const existing = await VenueModel.findOne({
          _id: { $ne: id },
          venue_name: new RegExp(
            `^${updates.venue_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
            'i'
          ),
        });
        if (existing) {
          const err = new Error(
            'E11000 duplicate key error collection: venues index: venue_name_1'
          );
          err.code = 11000;
          throw err;
        }
      }
      const venue = await VenueModel.findByIdAndUpdate(
        id,
        { $set: updates },
        { returnDocument: 'after' }
      ).lean();
      return venue ? { ...venue, _id: venue._id.toString() } : null;
    }

    const venueIndex = this.state.venues.findIndex((v) => v._id === id);
    if (venueIndex === -1) return null;

    if (updates.venue_name) {
      const existing = this.state.venues.find(
        (v) => v.venue_name.toLowerCase() === updates.venue_name.toLowerCase() && v._id !== id
      );
      if (existing) {
        const err = new Error(
          'E11000 duplicate key error collection: venues index: venue_name_1'
        );
        err.code = 11000;
        throw err;
      }
    }

    this.state.venues[venueIndex] = {
      ...this.state.venues[venueIndex],
      ...updates,
    };
    this.saveSnapshot();
    return this.state.venues[venueIndex];
  }

  // ---- Events ----
  populateEvent(event) {
    const venue = this.state.venues.find(
      (v) => v._id === (typeof event.venue_id === 'object' ? event.venue_id._id : event.venue_id)
    );
    const organizer = this.state.users.find(
      (u) =>
        u._id ===
        (typeof event.organizer_id === 'object' ? event.organizer_id._id : event.organizer_id)
    );
    return {
      ...event,
      venue_id: venue || event.venue_id,
      organizer_id: organizer
        ? { _id: organizer._id, name: organizer.name, email: organizer.email, role: organizer.role }
        : event.organizer_id,
    };
  }

  async findApprovedEvents() {
    if (this.isConnectedToMongo) {
      const events = await EventModel.find({ status: 'Approved' })
        .populate('venue_id')
        .populate('organizer_id', '_id name email role')
        .sort({ event_date: 1 })
        .lean();
      return events.map((e) => formatDoc(e));
    }
    return this.state.events
      .filter((e) => e.status === 'Approved')
      .map((e) => this.populateEvent(e))
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }

  async findPendingEvents() {
    if (this.isConnectedToMongo) {
      const events = await EventModel.find({ status: 'Pending' })
        .populate('venue_id')
        .populate('organizer_id', '_id name email role')
        .sort({ event_date: 1 })
        .lean();
      return events.map((e) => formatDoc(e));
    }
    return this.state.events
      .filter((e) => e.status === 'Pending')
      .map((e) => this.populateEvent(e))
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }

  async findOrganizerEvents(organizerId) {
    if (this.isConnectedToMongo) {
      const events = await EventModel.find({ organizer_id: organizerId })
        .populate('venue_id')
        .populate('organizer_id', '_id name email role')
        .sort({ createdAt: -1 })
        .lean();
      return events.map((e) => formatDoc(e));
    }
    return this.state.events
      .filter((e) => {
        const oId = typeof e.organizer_id === 'object' ? e.organizer_id._id : e.organizer_id;
        return oId === organizerId;
      })
      .map((e) => this.populateEvent(e))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  async findEventById(id) {
    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const event = await EventModel.findById(id)
        .populate('venue_id')
        .populate('organizer_id', '_id name email role')
        .lean();
      return event ? formatDoc(event) : null;
    }
    const event = this.state.events.find((e) => e._id === id);
    return event ? this.populateEvent(event) : null;
  }

  async createEvent(data) {
    const venueId = typeof data.venue_id === 'object' ? data.venue_id._id : data.venue_id;
    const organizerId =
      typeof data.organizer_id === 'object' ? data.organizer_id._id : data.organizer_id;

    const eventPayload = {
      title: (data.title || '').trim(),
      category: data.category || 'Hackathon',
      description: (data.description || '').trim(),
      venue_id: venueId,
      organizer_id: organizerId,
      event_date: data.event_date,
      event_time: data.event_time || '10:00 AM - 01:00 PM',
      duration_hours: Number(data.duration_hours) || 3,
      posterImage: data.posterImage || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      status: 'Pending',
      registered_count: 0,
      createdAt: new Date(),
    };

    if (this.isConnectedToMongo) {
      // Partial unique index conflict check: Pending / Approved events on same venue & date
      const conflict = await EventModel.findOne({
        venue_id: venueId,
        event_date: data.event_date,
        status: { $in: ['Pending', 'Approved'] },
      });

      if (conflict) {
        const err = new Error(
          `E11000 duplicate key error: venue ${venueId} is already scheduled on date ${data.event_date}`
        );
        err.code = 11000;
        throw err;
      }

      const event = await EventModel.create(eventPayload);
      return this.findEventById(event._id.toString());
    }

    const conflict = this.state.events.find((e) => {
      const e_venueId = typeof e.venue_id === 'object' ? e.venue_id._id : e.venue_id;
      return (
        e_venueId === venueId &&
        e.event_date === data.event_date &&
        (e.status === 'Pending' || e.status === 'Approved')
      );
    });

    if (conflict) {
      const err = new Error(
        `E11000 duplicate key error: venue ${venueId} is already scheduled on date ${data.event_date}`
      );
      err.code = 11000;
      throw err;
    }

    const event = {
      _id: this.generateId(),
      ...eventPayload,
      createdAt: eventPayload.createdAt.toISOString(),
    };
    this.state.events.push(event);
    this.saveSnapshot();
    return this.populateEvent(event);
  }

  async updateEvent(id, updates, userId, isAdmin = false) {
    const existing = await this.findEventById(id);
    if (!existing) {
      throw new Error('Event not found.');
    }

    const organizerIdStr =
      typeof existing.organizer_id === 'object' ? existing.organizer_id._id : existing.organizer_id;

    if (organizerIdStr !== userId && !isAdmin) {
      throw new Error('403 Forbidden: You do not have permission to modify this event.');
    }

    const payload = { ...updates };
    delete payload._id;
    delete payload.registered_count; // Atomic guard: do not mutate registration count via updateEvent

    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid event ID.');
      await EventModel.findByIdAndUpdate(id, { $set: payload }, { returnDocument: 'after' });
      return this.findEventById(id);
    }

    const eventIndex = this.state.events.findIndex((e) => e._id === id);
    if (eventIndex === -1) throw new Error('Event not found.');

    this.state.events[eventIndex] = {
      ...this.state.events[eventIndex],
      ...payload,
    };
    this.saveSnapshot();
    return this.populateEvent(this.state.events[eventIndex]);
  }

  async updateEventStatus(id, status) {
    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      await EventModel.findByIdAndUpdate(id, { status });
      return this.findEventById(id);
    }

    const eventIndex = this.state.events.findIndex((e) => e._id === id);
    if (eventIndex === -1) return null;

    this.state.events[eventIndex].status = status;
    this.saveSnapshot();
    return this.populateEvent(this.state.events[eventIndex]);
  }

  // ---- Registrations & Atomic Capacity Guard ----
  async registerUserForEvent(eventId, userId) {
    if (this.isConnectedToMongo) {
      const event = await EventModel.findById(eventId).populate('venue_id');
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.status !== 'Approved') {
        throw new Error('Registration is only permitted for Approved events.');
      }

      // Compound unique index check (event_id, user_id)
      const existing = await RegistrationModel.findOne({
        event_id: eventId,
        user_id: userId,
      });

      if (existing) {
        const err = new Error(
          `E11000 duplicate key error: user ${userId} is already registered for event ${eventId}`
        );
        err.code = 11000;
        throw err;
      }

      const maxCapacity = event.venue_id ? event.venue_id.max_capacity : 0;

      // Atomic Capacity Guard: findOneAndUpdate with registered_count < maxCapacity
      const updatedEvent = await EventModel.findOneAndUpdate(
        { _id: eventId, registered_count: { $lt: maxCapacity } },
        { $inc: { registered_count: 1 } },
        { new: true }
      )
        .populate('venue_id')
        .populate('organizer_id', '_id name email role');

      if (!updatedEvent) {
        throw new Error('Housefull: Maximum venue capacity reached.');
      }

      const registration = await RegistrationModel.create({
        event_id: eventId,
        user_id: userId,
      });

      return {
        registration: formatDoc(registration),
        event: formatDoc(updatedEvent),
      };
    }

    const event = this.state.events.find((e) => e._id === eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status !== 'Approved') {
      throw new Error('Registration is only permitted for Approved events.');
    }

    // Compound Unique Index check (event_id, user_id)
    const existingRegistration = this.state.registrations.find((r) => {
      const r_eventId = typeof r.event_id === 'object' ? r.event_id._id : r.event_id;
      const r_userId = typeof r.user_id === 'object' ? r.user_id._id : r.user_id;
      return r_eventId === eventId && r_userId === userId;
    });

    if (existingRegistration) {
      const err = new Error(
        `E11000 duplicate key error: user ${userId} is already registered for event ${eventId}`
      );
      err.code = 11000;
      throw err;
    }

    // Capacity Check with Atomic Increment
    const venue = this.state.venues.find(
      (v) => v._id === (typeof event.venue_id === 'object' ? event.venue_id._id : event.venue_id)
    );
    const maxCapacity = venue ? venue.max_capacity : 0;

    if (event.registered_count >= maxCapacity) {
      throw new Error('Housefull: Maximum venue capacity reached.');
    }

    event.registered_count += 1;

    const registration = {
      _id: this.generateId(),
      event_id: eventId,
      user_id: userId,
      createdAt: new Date().toISOString(),
    };
    this.state.registrations.push(registration);
    this.saveSnapshot();

    return {
      registration,
      event: this.populateEvent(event),
    };
  }

  async cancelRegistration(eventId, userId) {
    if (this.isConnectedToMongo) {
      const deleted = await RegistrationModel.findOneAndDelete({
        event_id: eventId,
        user_id: userId,
      });
      if (!deleted) return false;

      await EventModel.findByIdAndUpdate(eventId, {
        $inc: { registered_count: -1 },
      });
      return true;
    }

    const index = this.state.registrations.findIndex((r) => {
      const r_eventId = typeof r.event_id === 'object' ? r.event_id._id : r.event_id;
      const r_userId = typeof r.user_id === 'object' ? r.user_id._id : r.user_id;
      return r_eventId === eventId && r_userId === userId;
    });

    if (index === -1) return false;

    this.state.registrations.splice(index, 1);

    const event = this.state.events.find((e) => e._id === eventId);
    if (event && event.registered_count > 0) {
      event.registered_count -= 1;
    }

    this.saveSnapshot();
    return true;
  }

  async getUserRegistrations(userId) {
    if (this.isConnectedToMongo) {
      const regs = await RegistrationModel.find({ user_id: userId })
        .populate({
          path: 'event_id',
          populate: [
            { path: 'venue_id' },
            { path: 'organizer_id', select: '_id name email role' },
          ],
        })
        .sort({ createdAt: -1 })
        .lean();

      return regs
        .filter((r) => r.event_id)
        .map((reg) => ({
          _id: reg._id.toString(),
          createdAt: reg.createdAt ? reg.createdAt.toISOString() : new Date().toISOString(),
          event: formatDoc(reg.event_id),
        }));
    }

    const userRegs = this.state.registrations.filter((r) => {
      const r_userId = typeof r.user_id === 'object' ? r.user_id._id : r.user_id;
      return r_userId === userId;
    });

    return userRegs
      .map((reg) => {
        const eventId = typeof reg.event_id === 'object' ? reg.event_id._id : reg.event_id;
        const event = this.state.events.find((e) => e._id === eventId);
        return {
          _id: reg._id,
          createdAt: reg.createdAt,
          event: event ? this.populateEvent(event) : null,
        };
      })
      .filter((r) => r.event !== null);
  }

  async getEventAttendees(eventId) {
    if (this.isConnectedToMongo) {
      const regs = await RegistrationModel.find({ event_id: eventId })
        .populate('user_id', 'name email')
        .sort({ createdAt: 1 })
        .lean();

      return regs.map((reg) => ({
        name: reg.user_id ? reg.user_id.name : 'Unknown Attendee',
        email: reg.user_id ? reg.user_id.email : 'Unknown Email',
        registeredAt: reg.createdAt ? reg.createdAt.toISOString() : new Date().toISOString(),
      }));
    }

    const regs = this.state.registrations.filter((r) => {
      const r_eventId = typeof r.event_id === 'object' ? r.event_id._id : r.event_id;
      return r_eventId === eventId;
    });

    return regs.map((reg) => {
      const uId = typeof reg.user_id === 'object' ? reg.user_id._id : reg.user_id;
      const user = this.state.users.find((u) => u._id === uId);
      return {
        name: user ? user.name : 'Unknown Attendee',
        email: user ? user.email : 'Unknown Email',
        registeredAt: reg.createdAt,
      };
    });
  }

  async countVenues() {
    if (this.isConnectedToMongo) {
      return await VenueModel.countDocuments();
    }
    return this.state.venues.length;
  }

  async countUsers() {
    if (this.isConnectedToMongo) {
      return await UserModel.countDocuments();
    }
    return this.state.users.length;
  }

  async countEvents() {
    if (this.isConnectedToMongo) {
      return await EventModel.countDocuments();
    }
    return this.state.events.length;
  }

  // ---------------------------------------------------------------------------
  // Venue Listings & Inquiries Engine (MongoDB + Embedded Fallback)
  // ---------------------------------------------------------------------------

  maskListingContacts(listing) {
    if (!listing) return null;
    const safe = { ...listing };
    if (!safe.publicContactPreferences?.showEmail) {
      safe.contactEmail = null;
    }
    if (!safe.publicContactPreferences?.showPhone) {
      safe.contactPhone = null;
    }
    if (!safe.publicContactPreferences?.showWhatsapp) {
      safe.whatsappNumber = null;
    }
    return safe;
  }

  async createVenueListing(data, ownerId, ownerName = 'Venue Owner') {
    const listingPayload = {
      ownerId,
      venueName: (data.venueName || '').trim(),
      category: data.category || 'Auditorium',
      description: (data.description || '').trim(),
      detailedInfo: (data.detailedInfo || '').trim(),
      capacity: Number(data.capacity) || 50,
      suitableEvents: Array.isArray(data.suitableEvents) ? data.suitableEvents : [],
      address: (data.address || '').trim(),
      city: (data.city || '').trim(),
      state: (data.state || '').trim(),
      pinCode: (data.pinCode || '').trim(),
      landmark: (data.landmark || '').trim(),
      mapLocation: (data.mapLocation || '').trim(),
      contactName: (data.contactName || '').trim(),
      contactEmail: (data.contactEmail || '').trim().toLowerCase(),
      contactPhone: (data.contactPhone || '').trim(),
      altContactPhone: (data.altContactPhone || '').trim(),
      whatsappNumber: (data.whatsappNumber || '').trim(),
      organizationName: (data.organizationName || '').trim(),
      preferredContactMethod: data.preferredContactMethod || 'Email',
      publicContactPreferences: {
        showEmail: data.publicContactPreferences?.showEmail ?? true,
        showPhone: data.publicContactPreferences?.showPhone ?? true,
        showWhatsapp: data.publicContactPreferences?.showWhatsapp ?? false,
      },
      facilities: Array.isArray(data.facilities) ? data.facilities : [],
      pricing: {
        pricingType: data.pricing?.pricingType || 'Per Day',
        price: Number(data.pricing?.price || 0),
        currency: data.pricing?.currency || 'INR',
      },
      operatingHours: {
        openingTime: data.operatingHours?.openingTime || '09:00',
        closingTime: data.operatingHours?.closingTime || '21:00',
        availableDays: Array.isArray(data.operatingHours?.availableDays) && data.operatingHours.availableDays.length > 0
          ? data.operatingHours.availableDays
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        venueRules: (data.operatingHours?.venueRules || '').trim(),
      },
      images: Array.isArray(data.images) ? data.images : [],
      approvalStatus: 'Pending Approval',
      adminRemarks: '',
      changeHistory: [
        {
          action: 'LISTING_SUBMITTED',
          timestamp: new Date(),
          performedBy: ownerName,
          details: 'New venue listing submitted for administrative verification and approval.',
        },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.isConnectedToMongo) {
      const created = await VenueListingModel.create(listingPayload);
      return formatDoc(created);
    }

    const listing = {
      _id: this.generateId(),
      ...listingPayload,
      createdAt: listingPayload.createdAt.toISOString(),
      updatedAt: listingPayload.updatedAt.toISOString(),
    };
    if (!this.state.listings) this.state.listings = [];
    this.state.listings.push(listing);
    this.saveSnapshot();
    return listing;
  }

  async findApprovedVenueListings(filters = {}) {
    const { search, category, city, minCapacity } = filters;

    if (this.isConnectedToMongo) {
      const query = {
        approvalStatus: 'Approved',
        isActive: true,
      };

      if (category && category !== 'all') {
        query.category = category;
      }

      if (city && city !== 'all') {
        query.city = new RegExp(`^${city.trim()}$`, 'i');
      }

      if (minCapacity && !isNaN(Number(minCapacity))) {
        query.capacity = { $gte: Number(minCapacity) };
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { venueName: regex },
          { description: regex },
          { city: regex },
          { address: regex },
          { landmark: regex },
        ];
      }

      const listings = await VenueListingModel.find(query)
        .populate('ownerId', '_id name email role')
        .sort({ updatedAt: -1 })
        .lean();

      return listings.map((l) => this.maskListingContacts(formatDoc(l)));
    }

    if (!this.state.listings) this.state.listings = [];
    let results = this.state.listings.filter(
      (l) => l.approvalStatus === 'Approved' && l.isActive !== false
    );

    if (category && category !== 'all') {
      results = results.filter((l) => l.category === category);
    }
    if (city && city !== 'all') {
      results = results.filter((l) => (l.city || '').toLowerCase() === city.toLowerCase());
    }
    if (minCapacity && !isNaN(Number(minCapacity))) {
      results = results.filter((l) => Number(l.capacity) >= Number(minCapacity));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (l) =>
          (l.venueName || '').toLowerCase().includes(q) ||
          (l.description || '').toLowerCase().includes(q) ||
          (l.city || '').toLowerCase().includes(q) ||
          (l.address || '').toLowerCase().includes(q)
      );
    }

    return results
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map((l) => {
        const owner = this.state.users.find((u) => u._id === (typeof l.ownerId === 'object' ? l.ownerId._id : l.ownerId));
        const formatted = {
          ...l,
          ownerId: owner ? { _id: owner._id, name: owner.name, email: owner.email, role: owner.role } : l.ownerId,
        };
        return this.maskListingContacts(formatted);
      });
  }

  async findVenueListingById(id, requestingUserId = null, isAdmin = false) {
    let listing = null;

    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await VenueListingModel.findById(id).populate('ownerId', '_id name email role').lean();
      listing = formatDoc(doc);
    } else {
      if (!this.state.listings) this.state.listings = [];
      const raw = this.state.listings.find((l) => l._id === id);
      if (raw) {
        const owner = this.state.users.find((u) => u._id === (typeof raw.ownerId === 'object' ? raw.ownerId._id : raw.ownerId));
        listing = {
          ...raw,
          ownerId: owner ? { _id: owner._id, name: owner.name, email: owner.email, role: owner.role } : raw.ownerId,
        };
      }
    }

    if (!listing) return null;

    const ownerIdStr = typeof listing.ownerId === 'object' ? listing.ownerId._id : listing.ownerId;
    const isOwner = requestingUserId && requestingUserId === ownerIdStr;

    // Non-owner and non-admin can only view approved listings
    if (!isOwner && !isAdmin && listing.approvalStatus !== 'Approved') {
      return null;
    }

    // Mask contact info for third-party public view
    if (!isOwner && !isAdmin) {
      return this.maskListingContacts(listing);
    }

    return listing;
  }

  async findVenueListingsByOwner(ownerId) {
    if (this.isConnectedToMongo) {
      const docs = await VenueListingModel.find({ ownerId })
        .sort({ updatedAt: -1 })
        .lean();
      return docs.map(formatDoc);
    }

    if (!this.state.listings) this.state.listings = [];
    return this.state.listings
      .filter((l) => {
        const l_owner = typeof l.ownerId === 'object' ? l.ownerId._id : l.ownerId;
        return l_owner === ownerId;
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  async findAllVenueListingsAdmin() {
    if (this.isConnectedToMongo) {
      const docs = await VenueListingModel.find()
        .populate('ownerId', '_id name email role')
        .sort({ createdAt: -1 })
        .lean();
      return docs.map(formatDoc);
    }

    if (!this.state.listings) this.state.listings = [];
    return this.state.listings
      .map((l) => {
        const owner = this.state.users.find((u) => u._id === (typeof l.ownerId === 'object' ? l.ownerId._id : l.ownerId));
        return {
          ...l,
          ownerId: owner ? { _id: owner._id, name: owner.name, email: owner.email, role: owner.role } : l.ownerId,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async updateVenueListing(id, updates, userId, isAdmin = false, userName = 'User') {
    const existing = await this.findVenueListingById(id, userId, isAdmin);
    if (!existing) {
      throw new Error('Venue listing not found.');
    }

    const ownerIdStr = typeof existing.ownerId === 'object' ? existing.ownerId._id : existing.ownerId;
    if (ownerIdStr !== userId && !isAdmin) {
      throw new Error('403 Forbidden: You do not have permission to modify this listing.');
    }

    // Detect if key details changed that warrant resetting approval for owner edits
    const keyFields = ['venueName', 'category', 'description', 'capacity', 'address', 'city', 'facilities', 'pricing', 'images'];
    let keyChanged = false;
    for (const key of keyFields) {
      if (updates[key] !== undefined && JSON.stringify(updates[key]) !== JSON.stringify(existing[key])) {
        keyChanged = true;
        break;
      }
    }

    const payload = {
      ...updates,
      updatedAt: new Date(),
    };

    delete payload._id;
    delete payload.ownerId;

    const historyEntry = {
      timestamp: new Date(),
      performedBy: userName,
    };

    if (existing.approvalStatus === 'Approved' && keyChanged && !isAdmin) {
      payload.approvalStatus = 'Pending Approval';
      historyEntry.action = 'RE_APPROVAL_REQUESTED';
      historyEntry.details = 'Important venue details modified by owner; listing re-submitted for review.';
    } else {
      historyEntry.action = 'LISTING_UPDATED';
      historyEntry.details = `Listing details updated by ${isAdmin ? 'Administrator' : 'Owner'}.`;
    }

    if (this.isConnectedToMongo) {
      const updated = await VenueListingModel.findByIdAndUpdate(
        id,
        {
          $set: payload,
          $push: { changeHistory: historyEntry },
        },
        { returnDocument: 'after' }
      )
        .populate('ownerId', '_id name email role')
        .lean();
      return formatDoc(updated);
    }

    if (!this.state.listings) this.state.listings = [];
    const index = this.state.listings.findIndex((l) => l._id === id);
    if (index === -1) throw new Error('Listing not found.');

    const target = this.state.listings[index];
    const updated = {
      ...target,
      ...payload,
      changeHistory: [...(target.changeHistory || []), historyEntry],
      updatedAt: new Date().toISOString(),
    };
    this.state.listings[index] = updated;
    this.saveSnapshot();
    return updated;
  }

  async updateVenueListingStatus(id, status, adminRemarks = '', adminId = null, adminName = 'Administrator') {
    const validStatuses = ['Pending Approval', 'Approved', 'Rejected', 'Changes Requested'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const historyEntry = {
      action: `STATUS_${status.toUpperCase().replace(/\s+/g, '_')}`,
      timestamp: new Date(),
      performedBy: adminName,
      details: `Status set to "${status}". Remarks: ${adminRemarks || 'None provided.'}`,
    };

    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid listing ID.');
      const updated = await VenueListingModel.findByIdAndUpdate(
        id,
        {
          $set: {
            approvalStatus: status,
            adminRemarks: adminRemarks || '',
            updatedAt: new Date(),
          },
          $push: { changeHistory: historyEntry },
        },
        { returnDocument: 'after' }
      )
        .populate('ownerId', '_id name email role')
        .lean();

      if (!updated) throw new Error('Venue listing not found.');
      return formatDoc(updated);
    }

    if (!this.state.listings) this.state.listings = [];
    const index = this.state.listings.findIndex((l) => l._id === id);
    if (index === -1) throw new Error('Venue listing not found.');

    const target = this.state.listings[index];
    const updated = {
      ...target,
      approvalStatus: status,
      adminRemarks: adminRemarks || '',
      updatedAt: new Date().toISOString(),
      changeHistory: [...(target.changeHistory || []), historyEntry],
    };
    this.state.listings[index] = updated;
    this.saveSnapshot();
    return updated;
  }

  async deleteVenueListing(id, userId, isAdmin = false) {
    const existing = await this.findVenueListingById(id, userId, isAdmin);
    if (!existing) throw new Error('Venue listing not found.');

    const ownerIdStr = typeof existing.ownerId === 'object' ? existing.ownerId._id : existing.ownerId;
    if (ownerIdStr !== userId && !isAdmin) {
      throw new Error('403 Forbidden: You do not have permission to delete this listing.');
    }

    if (this.isConnectedToMongo) {
      await VenueListingModel.findByIdAndDelete(id);
      await VenueInquiryModel.deleteMany({ listingId: id });
      return true;
    }

    if (!this.state.listings) this.state.listings = [];
    this.state.listings = this.state.listings.filter((l) => l._id !== id);
    if (this.state.inquiries) {
      this.state.inquiries = this.state.inquiries.filter((inq) => {
        const inq_listId = typeof inq.listingId === 'object' ? inq.listingId._id : inq.listingId;
        return inq_listId !== id;
      });
    }
    this.saveSnapshot();
    return true;
  }

  // ---- Inquiries ----
  async createVenueInquiry(data, senderUserId = null) {
    const { listingId, senderName, senderEmail, senderPhone, eventDate, guestCount, message } = data;
    if (!listingId || !senderName || !senderEmail || !eventDate || !message) {
      throw new Error('Missing required fields for venue inquiry.');
    }

    let listing = null;
    if (this.isConnectedToMongo) {
      listing = await VenueListingModel.findById(listingId).lean();
    } else {
      if (!this.state.listings) this.state.listings = [];
      listing = this.state.listings.find((l) => l._id === listingId);
    }

    if (!listing) {
      throw new Error('Venue listing does not exist.');
    }

    const ownerId = typeof listing.ownerId === 'object' ? listing.ownerId._id : listing.ownerId;

    const payload = {
      listingId,
      ownerId,
      senderId: senderUserId || undefined,
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim().toLowerCase(),
      senderPhone: (senderPhone || '').trim(),
      eventDate: eventDate.trim(),
      guestCount: Number(guestCount) || 1,
      message: message.trim(),
      status: 'New',
      createdAt: new Date(),
    };

    if (this.isConnectedToMongo) {
      const inq = await VenueInquiryModel.create(payload);
      return formatDoc(inq);
    }

    const inq = {
      _id: this.generateId(),
      ...payload,
      createdAt: payload.createdAt.toISOString(),
    };
    if (!this.state.inquiries) this.state.inquiries = [];
    this.state.inquiries.push(inq);
    this.saveSnapshot();
    return inq;
  }

  async findInquiriesByOwner(ownerId) {
    if (this.isConnectedToMongo) {
      const inqs = await VenueInquiryModel.find({ ownerId })
        .populate('listingId', '_id venueName category city address images pricing')
        .sort({ createdAt: -1 })
        .lean();
      return inqs.map(formatDoc);
    }

    if (!this.state.inquiries) this.state.inquiries = [];
    return this.state.inquiries
      .filter((i) => {
        const i_owner = typeof i.ownerId === 'object' ? i.ownerId._id : i.ownerId;
        return i_owner === ownerId;
      })
      .map((i) => {
        const listId = typeof i.listingId === 'object' ? i.listingId._id : i.listingId;
        const venue = (this.state.listings || []).find((l) => l._id === listId);
        return {
          ...i,
          listingId: venue
            ? {
                _id: venue._id,
                venueName: venue.venueName,
                category: venue.category,
                city: venue.city,
                address: venue.address,
                images: venue.images,
                pricing: venue.pricing,
              }
            : i.listingId,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async updateInquiryStatus(inquiryId, status, ownerId) {
    const validStatuses = ['New', 'Contacted', 'Resolved', 'Archived'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid inquiry status. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(inquiryId)) throw new Error('Invalid inquiry ID.');
      const inq = await VenueInquiryModel.findById(inquiryId);
      if (!inq) throw new Error('Inquiry not found.');
      if (inq.ownerId.toString() !== ownerId.toString()) {
        throw new Error('403 Forbidden: You do not own this inquiry.');
      }
      inq.status = status;
      await inq.save();
      return formatDoc(inq);
    }

    if (!this.state.inquiries) this.state.inquiries = [];
    const index = this.state.inquiries.findIndex((i) => i._id === inquiryId);
    if (index === -1) throw new Error('Inquiry not found.');
    const inq = this.state.inquiries[index];
    const i_owner = typeof inq.ownerId === 'object' ? inq.ownerId._id : inq.ownerId;
    if (i_owner !== ownerId) {
      throw new Error('403 Forbidden: You do not own this inquiry.');
    }
    inq.status = status;
    this.saveSnapshot();
    return inq;
  }

  // ---- Verified Admin Contact Configuration ----
  async getAdminContactEmail() {
    if (process.env.ADMIN_CONTACT_EMAIL) {
      return process.env.ADMIN_CONTACT_EMAIL;
    }
    try {
      const admins = await this.findUsers({ role: 'Admin' });
      if (admins && admins.length > 0) {
        return admins[0].email;
      }
    } catch {
      // Ignore
    }
    return 'dean.admin@campus.edu';
  }

  // ---- Organizers Registry ----
  async findOrganizers() {
    if (this.isConnectedToMongo) {
      const list = await UserModel.find({ role: { $in: ['Organizer', 'Admin'] } })
        .select('_id name email role avatar')
        .sort({ name: 1 })
        .lean();
      return list.map((u) => ({ ...u, _id: u._id.toString() }));
    }
    return (this.state.users || [])
      .filter((u) => u.role === 'Organizer' || u.role === 'Admin')
      .map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.avatar || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // ---- Private Admin Contact & Listing Inquiries ----
  async createContactRequest(data) {
    const validTypes = ['List a Property', 'Submit Event Details', 'General Inquiry'];
    const requestType = validTypes.includes(data.requestType) ? data.requestType : 'List a Property';

    if (this.isConnectedToMongo) {
      const created = await ContactRequestModel.create({
        name: (data.name || '').trim(),
        email: (data.email || '').trim().toLowerCase(),
        phone: (data.phone || '').trim(),
        requestType,
        itemName: (data.itemName || '').trim(),
        location: (data.location || '').trim(),
        message: (data.message || '').trim(),
        userId: data.userId || null,
        status: 'New',
        internalNotes: '',
      });
      return formatDoc(created);
    }

    if (!this.state.contactRequests) this.state.contactRequests = [];
    const item = {
      _id: this.generateId(),
      name: (data.name || '').trim(),
      email: (data.email || '').trim().toLowerCase(),
      phone: (data.phone || '').trim(),
      requestType,
      itemName: (data.itemName || '').trim(),
      location: (data.location || '').trim(),
      message: (data.message || '').trim(),
      userId: data.userId || null,
      status: 'New',
      internalNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.contactRequests.push(item);
    this.saveSnapshot();
    return item;
  }

  async findContactRequests(filters = {}) {
    const { requestType, status } = filters;
    if (this.isConnectedToMongo) {
      const query = {};
      if (requestType && requestType !== 'all') query.requestType = requestType;
      if (status && status !== 'all') query.status = status;
      const list = await ContactRequestModel.find(query)
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .lean();
      return list.map(formatDoc);
    }

    let list = this.state.contactRequests || [];
    if (requestType && requestType !== 'all') {
      list = list.filter((r) => r.requestType === requestType);
    }
    if (status && status !== 'all') {
      list = list.filter((r) => r.status === status);
    }
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async findContactRequestById(id) {
    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const req = await ContactRequestModel.findById(id).populate('userId', 'name email role').lean();
      return formatDoc(req);
    }
    const req = (this.state.contactRequests || []).find((r) => r._id === id);
    return req || null;
  }

  async updateContactRequest(id, updates = {}) {
    const validStatuses = ['New', 'Under Review', 'Contacted', 'Completed', 'Rejected'];
    const sanitized = {};
    if (updates.status && validStatuses.includes(updates.status)) {
      sanitized.status = updates.status;
    }
    if (updates.internalNotes !== undefined) {
      sanitized.internalNotes = updates.internalNotes;
    }
    sanitized.updatedAt = new Date();

    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid request ID.');
      const updated = await ContactRequestModel.findByIdAndUpdate(id, { $set: sanitized }, { new: true });
      if (!updated) throw new Error('Contact request not found.');
      return formatDoc(updated);
    }

    if (!this.state.contactRequests) this.state.contactRequests = [];
    const index = this.state.contactRequests.findIndex((r) => r._id === id);
    if (index === -1) throw new Error('Contact request not found.');
    this.state.contactRequests[index] = {
      ...this.state.contactRequests[index],
      ...sanitized,
      updatedAt: new Date().toISOString(),
    };
    this.saveSnapshot();
    return this.state.contactRequests[index];
  }

  // ---------------------------------------------------------------------------
  // AI Event Plans Engine
  // ---------------------------------------------------------------------------
  async createAiEventPlan(data, organizerId) {
    if (!organizerId) throw new Error('Organizer ID is required to save an AI event plan.');
    const planPayload = {
      organizerId,
      linkedEventId: data.linkedEventId || null,
      title: data.title || 'Untitled AI Event Plan',
      category: data.category || 'Other',
      preferences: {
        participants: Number(data.preferences?.participants) || 100,
        budget: Number(data.preferences?.budget) || 20000,
        duration: data.preferences?.duration || '4 Hours',
        date: data.preferences?.date || '',
        audience: data.preferences?.audience || 'Open to All Students',
        indoorOutdoor: data.preferences?.indoorOutdoor || 'Indoor',
        specialRequirements: data.preferences?.specialRequirements || '',
      },
      eventIdeas: Array.isArray(data.eventIdeas) ? data.eventIdeas : [],
      recommendedVenues: Array.isArray(data.recommendedVenues) ? data.recommendedVenues : [],
      schedule: Array.isArray(data.schedule) ? data.schedule : [],
      budgetBreakdown: Array.isArray(data.budgetBreakdown) ? data.budgetBreakdown : [],
      requiredEquipment: Array.isArray(data.requiredEquipment) ? data.requiredEquipment : [],
      promotionalCopy: {
        socialCaptions: Array.isArray(data.promotionalCopy?.socialCaptions) ? data.promotionalCopy.socialCaptions : [],
        posterContent: data.promotionalCopy?.posterContent || '',
        promotionalPitch: data.promotionalCopy?.promotionalPitch || '',
      },
      status: data.status || 'Draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.isConnectedToMongo) {
      const plan = await AiEventPlanModel.create(planPayload);
      return formatDoc(plan);
    }

    if (!this.state.aiEventPlans) this.state.aiEventPlans = [];
    const inMemPlan = {
      ...planPayload,
      _id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.aiEventPlans.push(inMemPlan);
    this.saveSnapshot();
    return inMemPlan;
  }

  async findAiEventPlans(organizerId) {
    if (!organizerId) return [];
    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(organizerId)) return [];
      const list = await AiEventPlanModel.find({ organizerId })
        .populate('linkedEventId', 'title category date status venue_id')
        .sort({ updatedAt: -1 })
        .lean();
      return list.map(formatDoc);
    }

    if (!this.state.aiEventPlans) this.state.aiEventPlans = [];
    const list = this.state.aiEventPlans.filter((p) => String(p.organizerId) === String(organizerId));
    return [...list].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  async findAiEventPlanById(id, organizerId = null) {
    if (!id) return null;
    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const query = { _id: id };
      if (organizerId && mongoose.Types.ObjectId.isValid(organizerId)) {
        query.organizerId = organizerId;
      }
      const plan = await AiEventPlanModel.findOne(query)
        .populate('linkedEventId', 'title category date status venue_id')
        .lean();
      return formatDoc(plan);
    }

    if (!this.state.aiEventPlans) this.state.aiEventPlans = [];
    const plan = this.state.aiEventPlans.find((p) => {
      const matchesId = String(p._id) === String(id);
      if (!matchesId) return false;
      if (organizerId) return String(p.organizerId) === String(organizerId);
      return true;
    });
    return plan || null;
  }

  async updateAiEventPlan(id, updates = {}, organizerId = null) {
    if (!id) throw new Error('Plan ID is required.');
    const sanitized = {};
    if (updates.title !== undefined) sanitized.title = updates.title;
    if (updates.category !== undefined) sanitized.category = updates.category;
    if (updates.preferences) sanitized.preferences = updates.preferences;
    if (Array.isArray(updates.eventIdeas)) sanitized.eventIdeas = updates.eventIdeas;
    if (Array.isArray(updates.recommendedVenues)) sanitized.recommendedVenues = updates.recommendedVenues;
    if (Array.isArray(updates.schedule)) sanitized.schedule = updates.schedule;
    if (Array.isArray(updates.budgetBreakdown)) sanitized.budgetBreakdown = updates.budgetBreakdown;
    if (Array.isArray(updates.requiredEquipment)) sanitized.requiredEquipment = updates.requiredEquipment;
    if (updates.promotionalCopy) sanitized.promotionalCopy = updates.promotionalCopy;
    if (updates.status) sanitized.status = updates.status;
    sanitized.updatedAt = new Date();

    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid plan ID.');
      const query = { _id: id };
      if (organizerId && mongoose.Types.ObjectId.isValid(organizerId)) {
        query.organizerId = organizerId;
      }
      const updated = await AiEventPlanModel.findOneAndUpdate(query, { $set: sanitized }, { new: true });
      if (!updated) throw new Error('AI event plan not found or permission denied.');
      return formatDoc(updated);
    }

    if (!this.state.aiEventPlans) this.state.aiEventPlans = [];
    const index = this.state.aiEventPlans.findIndex((p) => {
      if (String(p._id) !== String(id)) return false;
      if (organizerId && String(p.organizerId) !== String(organizerId)) return false;
      return true;
    });
    if (index === -1) throw new Error('AI event plan not found or permission denied.');
    this.state.aiEventPlans[index] = {
      ...this.state.aiEventPlans[index],
      ...sanitized,
      updatedAt: new Date().toISOString(),
    };
    this.saveSnapshot();
    return this.state.aiEventPlans[index];
  }

  async deleteAiEventPlan(id, organizerId = null) {
    if (!id) throw new Error('Plan ID is required.');
    if (this.isConnectedToMongo) {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('Invalid plan ID.');
      const query = { _id: id };
      if (organizerId && mongoose.Types.ObjectId.isValid(organizerId)) {
        query.organizerId = organizerId;
      }
      const deleted = await AiEventPlanModel.findOneAndDelete(query);
      if (!deleted) throw new Error('AI event plan not found or permission denied.');
      return true;
    }

    if (!this.state.aiEventPlans) this.state.aiEventPlans = [];
    const initialLen = this.state.aiEventPlans.length;
    this.state.aiEventPlans = this.state.aiEventPlans.filter((p) => {
      if (String(p._id) !== String(id)) return true;
      if (organizerId && String(p.organizerId) !== String(organizerId)) return true;
      return false;
    });
    if (this.state.aiEventPlans.length === initialLen) {
      throw new Error('AI event plan not found or permission denied.');
    }
    this.saveSnapshot();
    return true;
  }
}

export const db = new CampusMongoEngine();
