import React, { useState } from 'react';
import { IEvent, IUser, EventCategory } from '../types/index.ts';
import { Search, MapPin, Calendar, CheckCircle2, AlertOctagon, User } from 'lucide-react';

interface StudentFeedProps {
  events: IEvent[];
  currentUser: IUser | null;
  registeredEventIds: Set<string>;
  onRegister: (event: IEvent) => Promise<void>;
  onCancelRegistration: (eventId: string) => Promise<void>;
  onOpenAuth: () => void;
  loading: boolean;
}

const CATEGORIES: ('All' | EventCategory)[] = [
  'All',
  'Hackathon',
  'Standup Comedy',
  'Seminar',
  'Cultural Show',
  'Other',
];

export const StudentFeed: React.FC<StudentFeedProps> = ({
  events,
  currentUser,
  registeredEventIds,
  onRegister,
  onCancelRegistration,
  onOpenAuth,
  loading,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | EventCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filter events
  const filteredEvents = events.filter((event) => {
    const matchesCategory =
      selectedCategory === 'All' || event.category === selectedCategory;
    const venueName =
      typeof event.venue_id === 'object' ? event.venue_id.venue_name : '';
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleRegisterClick = async (event: IEvent) => {
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

  const handleCancelClick = async (eventId: string) => {
    setActionLoadingId(eventId);
    try {
      await onCancelRegistration(eventId);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Category Filter Strip */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search events or venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-slate-900"
          />
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-6 bg-slate-200 rounded w-4/5"></div>
              <div className="h-12 bg-slate-100 rounded"></div>
              <div className="h-3 bg-slate-200 rounded w-full"></div>
              <div className="h-9 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto">
          <AlertOctagon className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">No events found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery
              ? `No events matching "${searchQuery}". Try adjusting your filters.`
              : 'There are currently no upcoming events in this category. Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((event) => {
            const venue =
              typeof event.venue_id === 'object' ? event.venue_id : null;
            const organizer =
              typeof event.organizer_id === 'object' ? event.organizer_id : null;
            const maxCap = venue ? venue.max_capacity : 100;
            const registered = event.registered_count || 0;
            const isFull = registered >= maxCap;
            const isRegistered = registeredEventIds.has(event._id);
            const percentFilled = Math.min(100, Math.round((registered / maxCap) * 100));

            return (
              <div
                key={event._id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-xs"
              >
                <div>
                  {/* Unboxed Metadata Strip (Zero-Pill Discipline) */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-slate-900">{event.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{venue?.location_type === 'out_campus' ? 'Off-Campus' : 'In-Campus'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{event.event_date}</span>
                  </div>

                  {/* Event Title */}
                  <h3 className="text-base font-bold text-slate-900 leading-snug tracking-tight mb-2">
                    {event.title}
                  </h3>

                  {/* Venue and Organizer Details */}
                  <div className="space-y-1 mb-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800">
                        {venue?.venue_name || 'Campus Venue'}
                      </span>
                    </div>
                    {organizer && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>By {organizer.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                    {event.description}
                  </p>
                </div>

                <div>
                  {/* Live Seat Capacity Counter */}
                  <div className="pt-3 border-t border-slate-100 mb-3.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Seating Capacity</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-900">
                        {registered} / {maxCap} Seats Filled
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
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

                  {/* Action Button & Registration State */}
                  {isRegistered ? (
                    <div className="space-y-1.5 text-center">
                      <div className="w-full py-2 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>You are Registered</span>
                      </div>
                      <button
                        onClick={() => handleCancelClick(event._id)}
                        disabled={actionLoadingId === event._id}
                        className="text-[11px] text-slate-500 hover:text-rose-600 transition-colors font-medium underline"
                      >
                        {actionLoadingId === event._id ? 'Cancelling...' : 'Cancel registration'}
                      </button>
                    </div>
                  ) : isFull ? (
                    <button
                      disabled
                      className="w-full py-2 px-3 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed text-center"
                    >
                      Housefull / Sold Out
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegisterClick(event)}
                      disabled={actionLoadingId === event._id}
                      className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {actionLoadingId === event._id ? (
                        <span>Reserving Seat...</span>
                      ) : (
                        <span>Register Now (Free)</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
