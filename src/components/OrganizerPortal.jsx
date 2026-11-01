import React, { useState } from 'react';
import { api } from '../services/api.js';
import {
  Calendar,
  Clock,
  CheckCircle,
  Users,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { AttendeeModal } from './AttendeeModal.jsx';

export const OrganizerPortal = ({
  venues = [],
  myEvents = [],
  onRefreshEvents,
  onRefreshVenues,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hackathon');
  const [description, setDescription] = useState('');
  const [venueId, setVenueId] = useState(venues[0]?._id || '');
  const [eventDate, setEventDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [selectedRosterEvent, setSelectedRosterEvent] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const selectedVenue = venues.find((v) => v._id === venueId);
  const isDateBooked =
    selectedVenue &&
    selectedVenue.booked_dates &&
    eventDate &&
    selectedVenue.booked_dates.includes(eventDate);

  // Compute attendee and program statistics
  const totalRegisteredAttendees = myEvents
    .filter((e) => e.status === 'Approved')
    .reduce((sum, e) => sum + (e.registered_count || 0), 0);
  const approvedPrograms = myEvents.filter((e) => e.status === 'Approved');
  const pendingPrograms = myEvents.filter((e) => e.status === 'Pending');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!title || !description || !venueId || !eventDate) {
      setFormError('Please fill in all required event details.');
      return;
    }

    if (eventDate < todayStr) {
      setFormError('Event date cannot be in the past. Please select today or a future date.');
      return;
    }

    if (isDateBooked) {
      setFormError(
        `This venue (${selectedVenue?.venue_name}) is already scheduled or booked for ${eventDate}. Please choose a different date or venue.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await api.createEvent({
        title,
        category,
        description,
        venue_id: venueId,
        event_date: eventDate,
      });

      setFormSuccess(
        `Event request "${title}" submitted successfully! It is now pending Administrator approval.`
      );
      setTitle('');
      setDescription('');
      setEventDate('');
      await onRefreshEvents();
      await onRefreshVenues();
    } catch (err) {
      setFormError(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & KPI Summary Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Organizer Management Portal</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Monitor real-time attendee registrations for your programs, view student rosters with contact info, and submit new venue booking requests with conflict prevention.
          </p>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Total Registered Users</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {totalRegisteredAttendees}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Across all approved programs</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <CheckCircle className="w-4 h-4 text-slate-700" />
              <span>Approved Programs</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {approvedPrograms.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Live on public feed</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pending Review</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {pendingPrograms.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting admin decision</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Calendar className="w-4 h-4 text-slate-700" />
              <span>Total Programs</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {myEvents.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Created by your club</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Venue Booking Request Form (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <PlusCircle className="w-4 h-4 text-slate-900" />
            <h3 className="text-sm font-bold text-slate-900">Book a Campus Venue</h3>
          </div>

          {formError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Event Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 24-Hour Campus Hackathon"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-slate-900"
                >
                  <option value="Hackathon">Hackathon</option>
                  <option value="Standup Comedy">Standup Comedy</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Cultural Show">Cultural Show</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Date *</label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-slate-900 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Venue *</label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-slate-900"
              >
                {venues.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.venue_name} ({v.max_capacity} Seats, {v.location_type === 'out_campus' ? 'Off-Campus' : 'In-Campus'})
                  </option>
                ))}
              </select>
            </div>

            {/* Live Conflict Warning Banner */}
            {selectedVenue && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span>Venue Capacity:</span>
                  <span className="font-mono tabular-nums">{selectedVenue.max_capacity} Seats</span>
                </div>
                {selectedVenue.booked_dates && selectedVenue.booked_dates.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block">
                      Currently Reserved/Pending Dates:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedVenue.booked_dates.map((d) => (
                        <span
                          key={d}
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                            d === eventDate
                              ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {d} {d === eventDate && '⚠️ Conflict!'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Event Description *</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Outline the schedule, speaker details, and requirements for attendees..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || Boolean(isDateBooked)}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? 'Submitting Request...' : 'Submit Booking Request'}
            </button>
          </form>
        </div>

        {/* Right Column: My Submitted Events & Attendees Management (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Programs & Registered Users</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Check user registration numbers and view detailed attendee rosters for each program.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {myEvents.length} program{myEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          {myEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              You haven't submitted any event requests yet. Use the booking form on the left to request your first venue.
            </div>
          ) : (
            <div className="space-y-3">
              {myEvents.map((event) => {
                const venue =
                  typeof event.venue_id === 'object' ? event.venue_id : null;
                const maxCap = venue ? venue.max_capacity : 0;
                const registered = event.registered_count || 0;
                const percent = maxCap > 0 ? Math.min(100, Math.round((registered / maxCap) * 100)) : 0;

                return (
                  <div
                    key={event._id}
                    className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors bg-white shadow-2xs space-y-3"
                  >
                    {/* Top Row: Title, Category, Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span className="font-semibold text-slate-900">{event.category}</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">{event.event_date}</span>
                          <span>·</span>
                          <span>{venue?.venue_name || 'Campus Venue'}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                      </div>

                      <div className="shrink-0">
                        {event.status === 'Approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved & Live
                          </span>
                        )}
                        {event.status === 'Pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" />
                            Pending Review
                          </span>
                        )}
                        {event.status === 'Rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: How Many Registered & Action Button to View Who They Are */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1 max-w-xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Registered Users:
                          </span>
                          <span className="font-mono tabular-nums font-bold text-slate-900">
                            {registered} / {maxCap} Seats ({percent}%)
                          </span>
                        </div>

                        {/* Capacity meter */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              percent >= 100
                                ? 'bg-rose-600'
                                : percent > 75
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Who Are They button */}
                      <div>
                        {event.status === 'Approved' ? (
                          <button
                            onClick={() => setSelectedRosterEvent(event)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg transition-colors shadow-2xs"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>View Registered Users ({registered})</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Registrations open upon Admin approval
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Attendee Roster Modal */}
      {selectedRosterEvent && (
        <AttendeeModal
          event={selectedRosterEvent}
          onClose={() => setSelectedRosterEvent(null)}
        />
      )}
    </div>
  );
};
