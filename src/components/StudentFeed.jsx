import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertOctagon,
  User,
  Sparkles,
  ArrowRight,
  Building2,
  Plus,
  Compass,
  Check,
} from 'lucide-react';
import { getEventPoster, CATEGORY_THEMES } from '../utils/imagePlaceholders.js';
import { EventDetailModal } from './EventDetailModal.jsx';

const CATEGORIES = [
  { id: 'All', label: 'All Categories', icon: '🌟' },
  { id: 'Hackathon', label: 'Hackathons', icon: '💻' },
  { id: 'Standup Comedy', label: 'Standup Comedy', icon: '🎭' },
  { id: 'Seminar', label: 'Seminars & Talks', icon: '🎙️' },
  { id: 'Cultural Show', label: 'Cultural Shows', icon: '🎪' },
  { id: 'Other', label: 'Workshops & Other', icon: '✨' },
];

export const StudentFeed = ({
  events = [],
  currentUser,
  registeredEventIds = new Set(),
  onRegister,
  onCancelRegistration,
  onOpenAuth,
  onNavigateToVenues,
  onNavigateToListVenue,
  loading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedEventModal, setSelectedEventModal] = useState(null);

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesCategory =
      selectedCategory === 'All' || event.category === selectedCategory;
    const venueName =
      typeof event.venue_id === 'object' ? event.venue_id.venue_name : '';
    const matchesSearch =
      (event.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleRegisterClick = async (e, event) => {
    e.stopPropagation();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setActionLoadingId(event._id);
    try {
      await onRegister(event);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelClick = async (e, eventId) => {
    e.stopPropagation();
    setActionLoadingId(eventId);
    try {
      await onCancelRegistration(eventId);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 border border-indigo-900/40 shadow-2xl">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Campus Event & Venue Management Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Discover What's Happening on Campus & Book Premier Venues
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
            From 36-hour national hackathons and robotics symposiums to standup comedy and campus cultural fests — browse upcoming events with live seat meters, or reserve auditoriums for your next flagship event.
          </p>

          {/* Quick CTA Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                const el = document.getElementById('events-grid-anchor');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Events</span>
            </button>

            {onNavigateToVenues && (
              <button
                onClick={onNavigateToVenues}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-indigo-300" />
                <span>Find Venues</span>
              </button>
            )}

            {onNavigateToListVenue && (
              <button
                onClick={onNavigateToListVenue}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>List Your Venue</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Category Mini Cards on Hero */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-8 mt-6 border-t border-white/10 text-xs">
          {CATEGORIES.filter((c) => c.id !== 'All').map((cat) => {
            const count = events.filter((e) => e.category === cat.id).length;
            const theme = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES.Other;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-white/20 border-white/40 shadow-sm'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <span className="text-xl block mb-1">{cat.icon}</span>
                <div className="font-bold text-white text-xs truncate">{cat.label}</div>
                <div className="text-[11px] text-slate-400 font-mono">{count} events</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SEARCH AND FILTER CONTROLS */}
      <div id="events-grid-anchor" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Upcoming Campus Events</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {filteredEvents.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an event to view full schedules, speaker rosters, venue details, and reserve your ticket.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by event title, venue, or speaker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white shadow-2xs focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
            />
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. POSTER-STYLE EVENTS GRID */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs space-y-4">
              <div className="aspect-16/10 bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-4/5" />
                <div className="h-10 bg-slate-100 rounded" />
                <div className="h-8 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No events found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No events matching "${searchQuery}". Try clearing search or choosing another category.`
              : 'There are currently no upcoming events scheduled in this category. Check back soon or create your own event!'}
          </p>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const venue = typeof event.venue_id === 'object' ? event.venue_id : null;
            const organizer = typeof event.organizer_id === 'object' ? event.organizer_id : null;
            const maxCap = venue ? venue.max_capacity : 100;
            const registered = event.registered_count || 0;
            const seatsLeft = Math.max(0, maxCap - registered);
            const isFull = registered >= maxCap;
            const isRegistered = registeredEventIds.has(event._id);
            const percentFilled = Math.min(100, Math.round((registered / maxCap) * 100));

            const poster = getEventPoster(event);
            const theme = CATEGORY_THEMES[event.category] || CATEGORY_THEMES.Other;

            return (
              <div
                key={event._id}
                onClick={() => setSelectedEventModal(event)}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Event Poster Area with subtle hover zoom */}
                  <div className="aspect-16/10 w-full relative overflow-hidden bg-slate-950">
                    <img
                      src={poster}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-sm ${theme.badgeBg}`}
                      >
                        <span>{theme.symbol}</span>
                        <span>{event.category}</span>
                      </span>

                      {isRegistered ? (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          PASS BOOKED
                        </span>
                      ) : isFull ? (
                        <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          HOUSEFULL
                        </span>
                      ) : (
                        <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-full">
                          {seatsLeft} SEATS LEFT
                        </span>
                      )}
                    </div>

                    {/* Bottom Metadata on Image */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {event.event_date}
                        </span>
                        {event.event_time && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-400" />
                              {event.event_time.split(' - ')[0]}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 space-y-3.5">
                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 leading-snug tracking-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {event.title}
                    </h3>

                    {/* Venue & Organizer Subtitles */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">
                          {venue?.venue_name || 'Campus Venue'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({venue?.location_type === 'out_campus' ? 'Off-Campus' : 'In-Campus'})
                        </span>
                      </div>

                      {organizer && (
                        <div className="flex items-center gap-1.5 text-slate-500 truncate">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Organized by {organizer.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Description preview */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>

                    {/* Live Seat Progress Meter */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Capacity</span>
                        <span className="font-mono text-[11px] font-bold text-slate-900">
                          {registered} / {maxCap} Seats ({percentFilled}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isFull
                              ? 'bg-rose-600'
                              : percentFilled > 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${percentFilled}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEventModal(event);
                    }}
                    className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-1"
                  >
                    <span>View Event</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {isRegistered ? (
                    <button
                      type="button"
                      disabled={actionLoadingId === event._id}
                      onClick={(e) => handleCancelClick(e, event._id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {actionLoadingId === event._id ? 'Cancelling...' : 'Cancel Pass'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isFull || actionLoadingId === event._id}
                      onClick={(e) => handleRegisterClick(e, event)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFull
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                      }`}
                    >
                      {actionLoadingId === event._id ? (
                        'Booking...'
                      ) : isFull ? (
                        'Sold Out'
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Register Now</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global Interactive Event Detail Modal */}
      {selectedEventModal && (
        <EventDetailModal
          event={selectedEventModal}
          isOpen={Boolean(selectedEventModal)}
          onClose={() => setSelectedEventModal(null)}
          currentUser={currentUser}
          isRegistered={registeredEventIds.has(selectedEventModal._id)}
          onRegister={(ev) => onRegister(ev)}
          onCancelRegistration={(id) => onCancelRegistration(id)}
          onOpenAuth={onOpenAuth}
          allEvents={events}
          onSelectEvent={(ev) => setSelectedEventModal(ev)}
        />
      )}
    </div>
  );
};
