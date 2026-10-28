import React, { useState } from 'react';
import { IEvent } from '../types/index.ts';
import { Calendar, MapPin, Ticket, AlertCircle, ArrowRight } from 'lucide-react';

interface RegistrationItem {
  _id: string;
  createdAt: string;
  event: IEvent;
}

interface MyRegistrationsProps {
  registrations: RegistrationItem[];
  onCancelRegistration: (eventId: string) => Promise<void>;
  onExploreEvents: () => void;
  loading: boolean;
}

export const MyRegistrations: React.FC<MyRegistrationsProps> = ({
  registrations,
  onCancelRegistration,
  onExploreEvents,
  loading,
}) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (eventId: string) => {
    setCancellingId(eventId);
    try {
      await onCancelRegistration(eventId);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4"></div>
        <div className="h-20 bg-slate-100 rounded"></div>
        <div className="h-20 bg-slate-100 rounded"></div>
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto">
        <Ticket className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">No event registrations found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          You haven't reserved seats for any campus events yet. Explore upcoming hackathons, seminars, and comedy nights.
        </p>
        <button
          onClick={onExploreEvents}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <span>Explore Campus Events</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">My Registered Passes</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirmed seat reservations for upcoming campus activities.
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-500">
          Total: <strong className="text-slate-900">{registrations.length}</strong> event{registrations.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {registrations.map(({ _id, createdAt, event }) => {
          if (!event) return null;
          const venue = typeof event.venue_id === 'object' ? event.venue_id : null;

          return (
            <div
              key={_id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-semibold text-slate-900">{event.category}</span>
                  <span className="font-mono tabular-nums">Booked {new Date(createdAt).toLocaleDateString()}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {event.title}
                </h3>

                <div className="space-y-1 text-xs text-slate-600 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono font-medium text-slate-800">{event.event_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{venue ? venue.venue_name : 'Campus Venue'}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                  {event.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                  Confirmed (Seat Reserved)
                </span>
                <button
                  onClick={() => handleCancel(event._id)}
                  disabled={cancellingId === event._id}
                  className="text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors disabled:opacity-50"
                >
                  {cancellingId === event._id ? 'Cancelling...' : 'Cancel Reservation'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
