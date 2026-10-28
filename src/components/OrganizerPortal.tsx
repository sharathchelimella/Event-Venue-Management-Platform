import React, { useState } from 'react';
import { api } from '../services/api.ts';
import { IEvent, IVenue, EventCategory } from '../types/index.ts';
import { Calendar, Clock, AlertTriangle, CheckCircle, Users, PlusCircle, AlertCircle, MapPin } from 'lucide-react';
import { AttendeeModal } from './AttendeeModal.tsx';

interface OrganizerPortalProps {
  venues: IVenue[];
  myEvents: IEvent[];
  onRefreshEvents: () => Promise<void>;
  onRefreshVenues: () => Promise<void>;
}

export const OrganizerPortal: React.FC<OrganizerPortalProps> = ({
  venues,
  myEvents,
  onRefreshEvents,
  onRefreshVenues,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Hackathon');
  const [description, setDescription] = useState('');
  const [venueId, setVenueId] = useState(venues[0]?._id || '');
  const [eventDate, setEventDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [selectedRosterEvent, setSelectedRosterEvent] = useState<IEvent | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const selectedVenue = venues.find((v) => v._id === venueId);
  const isDateBooked =
    selectedVenue &&
    selectedVenue.booked_dates &&
    eventDate &&
    selectedVenue.booked_dates.includes(eventDate);

  const handleSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Organizer Management Portal</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Request campus facilities for hackathons, seminars, standup shows, and workshops. All requests run through automated conflict detection to prevent double-booking. Once approved by administration, events publish automatically to the public student discovery feed.
        </p>
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
                  onChange={(e) => setCategory(e.target.value as EventCategory)}
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

        {/* Right Column: My Submitted Events & Status Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Submitted Event Requests</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time booking workflow status and attendee management.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {myEvents.length} request{myEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          {myEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              You haven't submitted any event requests yet. Use the booking form on the left to request your first venue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Event & Category</th>
                    <th className="py-2.5 px-3">Venue</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Roster</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myEvents.map((event) => {
                    const venue =
                      typeof event.venue_id === 'object' ? event.venue_id : null;
                    const maxCap = venue ? venue.max_capacity : 0;

                    return (
                      <tr key={event._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 max-w-xs truncate">{event.title}</div>
                          <div className="text-[11px] text-slate-500">{event.category}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {venue?.venue_name || 'Venue'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 tabular-nums">
                          {event.event_date}
                        </td>
                        <td className="py-3 px-3">
                          {event.status === 'Approved' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Approved
                            </span>
                          )}
                          {event.status === 'Pending' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Review
                            </span>
                          )}
                          {event.status === 'Rejected' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {event.status === 'Approved' ? (
                            <button
                              onClick={() => setSelectedRosterEvent(event)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
                            >
                              <Users className="w-3 h-3" />
                              <span className="font-mono tabular-nums">{event.registered_count}</span>
                              <span className="text-slate-400">/</span>
                              <span className="font-mono tabular-nums text-slate-500">{maxCap}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
