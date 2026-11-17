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

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
export const VenueModel = mongoose.models.Venue || mongoose.model('Venue', venueSchema);
export const EventModel = mongoose.models.Event || mongoose.model('Event', eventSchema);
export const RegistrationModel =
  mongoose.models.Registration || mongoose.model('Registration', registrationSchema);

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
    };
    this.isConnectedToMongo = false;
    this.loadSnapshot();
  }

  loadSnapshot() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.state = JSON.parse(raw);
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
    if (this.isConnectedToMongo) {
      const existing = await VenueModel.findOne({
        venue_name: new RegExp(
          `^${data.venue_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
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
      const venue = await VenueModel.create({
        venue_name: data.venue_name,
        location_type: data.location_type || 'in_campus',
        max_capacity: data.max_capacity,
      });
      return formatDoc(venue);
    }

    const existing = this.state.venues.find(
      (v) => v.venue_name.toLowerCase() === data.venue_name.toLowerCase()
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
      ...data,
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
      const venue = await VenueModel.findByIdAndUpdate(id, updates, { new: true }).lean();
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
    if (this.isConnectedToMongo) {
      const venueId = typeof data.venue_id === 'object' ? data.venue_id._id : data.venue_id;
      const organizerId =
        typeof data.organizer_id === 'object' ? data.organizer_id._id : data.organizer_id;

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

      const event = await EventModel.create({
        title: data.title,
        category: data.category,
        description: data.description,
        venue_id: venueId,
        organizer_id: organizerId,
        event_date: data.event_date,
        status: 'Pending',
        registered_count: 0,
      });

      return this.findEventById(event._id.toString());
    }

    const venueId = typeof data.venue_id === 'object' ? data.venue_id._id : data.venue_id;

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
      ...data,
      status: 'Pending',
      registered_count: 0,
      createdAt: new Date().toISOString(),
    };
    this.state.events.push(event);
    this.saveSnapshot();
    return this.populateEvent(event);
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
}

export const db = new CampusMongoEngine();
