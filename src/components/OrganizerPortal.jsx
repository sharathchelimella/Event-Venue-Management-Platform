import React, { useState, useEffect } from 'react';
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
  Upload,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Edit3,
  Eye,
  Tag,
  MapPin,
  Building2,
  X,
  ExternalLink,
} from 'lucide-react';
import { AttendeeModal } from './AttendeeModal.jsx';
import { VenueDetailModal } from './VenueDetailModal.jsx';
import {
  EVENT_POSTER_PRESETS,
  CATEGORY_THEMES,
  getEventPoster,
  getVenueCover,
} from '../utils/imagePlaceholders.js';

export const OrganizerPortal = ({
  venues = [],
  myEvents = [],
  onRefreshEvents,
  onRefreshVenues,
  initialVenueId = null,
}) => {
  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Hackathon');
  const [description, setDescription] = useState('');
  const [venueId, setVenueId] = useState(initialVenueId || venues[0]?._id || '');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('10:00 AM - 01:00 PM');
  const [posterImage, setPosterImage] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [selectedRosterEvent, setSelectedRosterEvent] = useState(null);
  const [inspectingVenue, setInspectingVenue] = useState(null);
  const [showLivePreview, setShowLivePreview] = useState(true);

  // Edit Event Modal State
  const [editingEvent, setEditingEvent] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Hackathon');
  const [editDescription, setEditDescription] = useState('');
  const [editEventTime, setEditEventTime] = useState('');
  const [editPosterImage, setEditPosterImage] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [updatingEvent, setUpdatingEvent] = useState(false);
  const [editError, setEditError] = useState(null);

  // Sync initialVenueId when passed
  useEffect(() => {
    if (initialVenueId) {
      setVenueId(initialVenueId);
    }
  }, [initialVenueId]);

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

  // Handle local poster file upload (convert to Base64)
  const handleFileUpload = (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      const err = 'Please upload a JPG, PNG, or WebP image.';
      if (isEdit) setEditError(err);
      else setFormError(err);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const err = 'Image size exceeds 5MB limit. Please choose a smaller image.';
      if (isEdit) setEditError(err);
      else setFormError(err);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (isEdit) {
        setEditPosterImage(reader.result);
        setEditError(null);
      } else {
        setPosterImage(reader.result);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!title.trim() || !description.trim() || !venueId || !eventDate) {
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
      const tags = tagsInput
        ? tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      await api.createEvent({
        title: title.trim(),
        category,
        description: description.trim(),
        venue_id: venueId,
        event_date: eventDate,
        event_time: eventTime.trim() || undefined,
        posterImage: posterImage || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      setFormSuccess(
        `Event request "${title}" submitted successfully with your custom poster! It is now pending Administrator approval.`
      );
      setTitle('');
      setDescription('');
      setEventDate('');
      setPosterImage('');
      setTagsInput('');
      await onRefreshEvents();
      await onRefreshVenues();
    } catch (err) {
      setFormError(err.message || 'Failed to submit booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Event Modal
  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setEditTitle(event.title || '');
    setEditCategory(event.category || 'Hackathon');
    setEditDescription(event.description || '');
    setEditEventTime(event.event_time || '');
    setEditPosterImage(event.posterImage || '');
    setEditTagsInput((event.tags || []).join(', '));
    setEditError(null);
  };

  // Save Event Updates
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;
    setEditError(null);

    if (!editTitle.trim() || !editDescription.trim()) {
      setEditError('Title and description are required.');
      return;
    }

    setUpdatingEvent(true);
    try {
      const tags = editTagsInput
        ? editTagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      await api.updateEvent(editingEvent._id, {
        title: editTitle.trim(),
        category: editCategory,
        description: editDescription.trim(),
        event_time: editEventTime.trim() || undefined,
        posterImage: editPosterImage,
        tags,
      });

      setEditingEvent(null);
      await onRefreshEvents();
    } catch (err) {
      setEditError(err.message || 'Failed to update event.');
    } finally {
      setUpdatingEvent(false);
    }
  };

  const previewTheme = CATEGORY_THEMES[category] || CATEGORY_THEMES['Other'];
  const previewPoster = posterImage || getEventPoster({ category });

  return (
    <div className="space-y-8">
      {/* Top Banner & KPI Summary Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Organizer Management Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Create immersive event requests with HD posters, inspect venue photo galleries, monitor attendee registrations, and manage your published programs.
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
        {/* Left Column: Venue Booking Request Form & Poster Studio (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-slate-900" />
              <h3 className="text-sm font-bold text-slate-900">Create Event & Book Venue</h3>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              Step 1 of Approval
            </span>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Title */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Event Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 24-Hour AI & Web3 Hackathon 2026"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-900"
              />
            </div>

            {/* Category & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:border-slate-900"
                >
                  <option value="Hackathon">Hackathon</option>
                  <option value="Standup Comedy">Standup Comedy</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Cultural Show">Cultural Show</option>
                  <option value="Other">Other / Workshop</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Event Timing (e.g. 10:00 AM - 01:00 PM)
                </label>
                <input
                  type="text"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  placeholder="e.g. 09:30 AM - 04:30 PM"
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:border-slate-900 font-mono"
                />
              </div>
            </div>

            {/* Venue Selector with Visual Inspector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-slate-700">Select Venue *</label>
                {selectedVenue && (
                  <button
                    type="button"
                    onClick={() => setInspectingVenue(selectedVenue)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Inspect Venue Photos & Amenities</span>
                  </button>
                )}
              </div>

              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:border-slate-900"
              >
                {venues.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.venue_name} ({v.max_capacity} Seats,{' '}
                    {v.location_type === 'out_campus' ? 'Off-Campus' : 'In-Campus'})
                  </option>
                ))}
              </select>

              {/* Visual Mini-Card for the Selected Venue */}
              {selectedVenue && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <img
                    src={
                      selectedVenue.coverImage ||
                      (selectedVenue.images && selectedVenue.images[0]?.url) ||
                      getVenueCover(selectedVenue)
                    }
                    alt={selectedVenue.venue_name}
                    className="w-16 h-12 object-cover rounded-lg shrink-0 border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {selectedVenue.venue_name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-semibold text-slate-700">
                        {selectedVenue.max_capacity} Seats
                      </span>
                      <span>•</span>
                      <span>{selectedVenue.location_type === 'out_campus' ? 'Off-Campus' : 'In-Campus'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingVenue(selectedVenue)}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                  >
                    Gallery
                  </button>
                </div>
              )}
            </div>

            {/* Event Date & Live Conflict Warning */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Event Date *</label>
              <input
                type="date"
                required
                min={todayStr}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:border-slate-900 font-mono"
              />

              {selectedVenue?.booked_dates && selectedVenue.booked_dates.length > 0 && (
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">
                    Booked / Scheduled Dates for {selectedVenue.venue_name}:
                  </span>
                  <div className="flex flex-wrap gap-1">
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

            {/* Poster Upload Studio */}
            <div className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-900 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Event Poster / Cover Image</span>
                </label>
                {posterImage && (
                  <button
                    type="button"
                    onClick={() => setPosterImage('')}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {/* Upload Drop Area */}
              <div className="flex items-center gap-3">
                <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white rounded-xl p-3 text-center cursor-pointer transition-colors group">
                  <Upload className="w-4 h-4 mx-auto text-slate-400 group-hover:text-indigo-600 mb-1" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    Upload Custom Poster
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    JPG, PNG, or WebP up to 5MB
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, false)}
                  />
                </label>
              </div>

              {/* Preset Chips */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Or pick a curated demo poster:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(EVENT_POSTER_PRESETS).map(([name, url]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setPosterImage(url)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        posterImage === url
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Poster Thumbnail */}
              {posterImage && (
                <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                  <img
                    src={posterImage}
                    alt="Poster Preview"
                    className="w-16 h-12 object-cover rounded-lg shadow-2xs"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      Custom Poster Attached
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready for upload
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Event Description *</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Outline the schedule, speaker details, prerequisites, and prizes for attendees..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-900"
              />
            </div>

            {/* Tags Input */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Event Tags (Comma Separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. AI, Coding, Cash Prizes, Certificates"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-900"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || Boolean(isDateBooked)}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  <span>Submit Booking Request for Approval</span>
                </>
              )}
            </button>
          </form>

          {/* Live Card Preview Accordion */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowLivePreview(!showLivePreview)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Live Feed Card Preview ({title ? 'Active' : 'Empty'})</span>
              </span>
              <span className="text-slate-400 font-normal">
                {showLivePreview ? 'Collapse ▲' : 'Expand ▼'}
              </span>
            </button>

            {showLivePreview && (
              <div className="mt-3 p-4 bg-slate-100 rounded-2xl">
                <span className="text-[11px] font-semibold text-slate-500 block mb-2 text-center">
                  ✨ How your event card will appear to students on the public feed:
                </span>

                <div className="max-w-xs mx-auto bg-white rounded-2xl overflow-hidden shadow-md border border-slate-200">
                  <div className="aspect-16/10 relative overflow-hidden bg-slate-900">
                    <img
                      src={previewPoster}
                      alt={title || 'Preview'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-slate-900 shadow-sm">
                      {category}
                    </div>
                  </div>
                  <div className="p-3.5 space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs truncate">
                      {title || 'Your Event Title Here'}
                    </h4>
                    <div className="text-[11px] text-slate-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{eventDate || todayStr}</span>
                        {eventTime && <span>· {eventTime}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{selectedVenue?.venue_name || 'Selected Campus Venue'}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-emerald-600">Free Registration</span>
                      <span className="font-bold text-slate-900">
                        0 / {selectedVenue?.max_capacity || 100} Seats
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: My Submitted Events & Attendees Management (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">My Programs & Registered Users</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Check user registration numbers, edit event posters, and view attendee rosters.
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
            <div className="space-y-4">
              {myEvents.map((event) => {
                const venue =
                  typeof event.venue_id === 'object' ? event.venue_id : null;
                const maxCap = venue ? venue.max_capacity : 0;
                const registered = event.registered_count || 0;
                const percent =
                  maxCap > 0 ? Math.min(100, Math.round((registered / maxCap) * 100)) : 0;
                const poster = getEventPoster(event);

                return (
                  <div
                    key={event._id}
                    className="border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-all bg-white shadow-2xs"
                  >
                    {/* Top Section with Poster Thumbnail & Details */}
                    <div className="p-4 flex items-start gap-4">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-slate-900 relative shadow-xs">
                        <img
                          src={poster}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {event.category}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {event.title}
                          </h4>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {event.status === 'Approved' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Live
                              </span>
                            )}
                            {event.status === 'Pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Review
                              </span>
                            )}
                            {event.status === 'Rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3" />
                                Rejected
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                          <span className="font-mono tabular-nums font-medium text-slate-700">
                            {event.event_date}
                          </span>
                          {event.event_time && <span>· {event.event_time}</span>}
                          <span>·</span>
                          <span className="truncate">{venue?.venue_name || 'Campus Venue'}</span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>

                        {/* Edit Button */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(event)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Details / Poster</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Bar: Attendance & Roster Action */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 flex-1 max-w-xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Attendees:
                          </span>
                          <span className="font-mono tabular-nums font-bold text-slate-900">
                            {registered} / {maxCap} Seats ({percent}%)
                          </span>
                        </div>

                        {/* Capacity meter */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
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
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-2xs cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>View Attendees ({registered})</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Registrations open after Admin approval
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

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Edit Event Details & Poster
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="Standup Comedy">Standup Comedy</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Cultural Show">Cultural Show</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Timing</label>
                  <input
                    type="text"
                    value={editEventTime}
                    onChange={(e) => setEditEventTime(e.target.value)}
                    placeholder="e.g. 10:00 AM - 01:00 PM"
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Poster editor */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Event Poster</span>
                  {editPosterImage && (
                    <button
                      type="button"
                      onClick={() => setEditPosterImage('')}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white rounded-xl p-2.5 text-center cursor-pointer transition-colors group">
                    <Upload className="w-4 h-4 mx-auto text-slate-400 group-hover:text-indigo-600 mb-1" />
                    <span className="text-[11px] font-semibold text-slate-700 block">
                      Upload New File
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, true)}
                    />
                  </label>

                  {editPosterImage && (
                    <img
                      src={editPosterImage}
                      alt="Edit Poster"
                      className="w-16 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(EVENT_POSTER_PRESETS).map(([name, url]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setEditPosterImage(url)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        editPosterImage === url
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tags (Comma Separated)</label>
                <input
                  type="text"
                  value={editTagsInput}
                  onChange={(e) => setEditTagsInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingEvent}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {updatingEvent ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendee Roster Modal */}
      {selectedRosterEvent && (
        <AttendeeModal
          event={selectedRosterEvent}
          onClose={() => setSelectedRosterEvent(null)}
        />
      )}

      {/* Inspect Venue Details Modal */}
      {inspectingVenue && (
        <VenueDetailModal
          venue={inspectingVenue}
          isOpen={Boolean(inspectingVenue)}
          onClose={() => setInspectingVenue(null)}
          onRequestBooking={(v) => {
            setInspectingVenue(null);
            setVenueId(v._id);
          }}
        />
      )}
    </div>
  );
};
