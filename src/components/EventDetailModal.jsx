import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  ExternalLink,
  Tag,
  Copy,
  Check,
} from 'lucide-react';
import { getEventPoster, CATEGORY_THEMES } from '../utils/imagePlaceholders.js';

export const EventDetailModal = ({
  event,
  isOpen,
  onClose,
  currentUser,
  isRegistered,
  onRegister,
  onCancelRegistration,
  onOpenAuth,
  allEvents = [],
  onSelectEvent,
}) => {
  if (!isOpen || !event) return null;

  const [registering, setRegistering] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const venue = typeof event.venue_id === 'object' ? event.venue_id : null;
  const organizer = typeof event.organizer_id === 'object' ? event.organizer_id : null;
  const maxCap = venue ? venue.max_capacity : 100;
  const registered = event.registered_count || 0;
  const seatsLeft = Math.max(0, maxCap - registered);
  const isFull = registered >= maxCap;
  const percentFilled = Math.min(100, Math.round((registered / maxCap) * 100));

  const poster = getEventPoster(event);
  const theme = CATEGORY_THEMES[event.category] || CATEGORY_THEMES.Other;

  // Filter related upcoming events (excluding current)
  const relatedEvents = (allEvents || [])
    .filter((e) => e._id !== event._id && (e.category === event.category || e.venue_id?._id === venue?._id))
    .slice(0, 3);

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `Check out ${event.title} at ${venue?.venue_name || 'EventSphere'}!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(
        `${event.title} - ${event.event_date} at ${venue?.venue_name || 'EventSphere'}: ${window.location.origin}`
      );
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignore
    }
  };

  const handleAction = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setRegistering(true);
    try {
      if (isRegistered) {
        await onCancelRegistration(event._id);
      } else {
        await onRegister(event);
      }
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-scaleIn max-h-[92vh] flex flex-col">
        {/* Top Floating Close & Share Buttons */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            title="Share Event"
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Hero Banner / Poster Stage */}
          <div className="relative aspect-16/9 sm:aspect-21/9 w-full bg-slate-950 overflow-hidden">
            <img
              src={poster}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

            <div className="absolute bottom-5 left-5 right-5 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-md ${theme.badgeBg}`}
                >
                  <span>{theme.symbol}</span>
                  <span>{event.category}</span>
                </span>
                <span className="bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                  {venue?.location_type === 'out_campus' ? 'Off-Campus Venue' : 'In-Campus Facility'}
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-snug">
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200 mt-2">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-semibold">{event.event_date}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{event.event_time || '10:00 AM - 01:00 PM'}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{venue?.venue_name || 'Campus Venue'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Copy link notification */}
            {copiedLink && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Event link copied to clipboard! Share it with your friends.
              </div>
            )}

            {/* Live Seating Capacity Meter */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Seating Availability & Capacity
                  </span>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    isFull
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : percentFilled > 80
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isFull ? 'Housefull' : `${seatsLeft} Seats Remaining`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isFull ? 'bg-rose-600' : percentFilled > 80 ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${percentFilled}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>{registered} Reserved</span>
                <span>{maxCap} Total Seats ({percentFilled}%)</span>
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                About The Event
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                {event.description}
              </p>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Venue & Organizer Dual Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Venue Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Venue Details
                </div>
                <div className="font-bold text-slate-900 text-sm">{venue?.venue_name || 'Campus Venue'}</div>
                <div className="text-slate-500 text-[11px] leading-tight">
                  {venue?.location_type === 'out_campus' ? 'Off-Campus Facility' : 'In-Campus Auditorium'}
                  {' · '}
                  {maxCap} Maximum Capacity
                </div>
                {venue?.facilities && venue.facilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {venue.facilities.slice(0, 3).map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 font-medium">
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Organizer Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400">Organized By</div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                    {organizer?.name ? organizer.name.charAt(0) : 'O'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{organizer?.name || 'Campus Organizer'}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{organizer?.email}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  Role: <span className="font-semibold text-slate-700">{organizer?.role || 'Organizer'}</span>
                </div>
              </div>
            </div>

            {/* Related Events Section */}
            {relatedEvents.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  You Might Also Like
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {relatedEvents.map((rel) => {
                    const relPoster = getEventPoster(rel);
                    return (
                      <button
                        key={rel._id}
                        type="button"
                        onClick={() => {
                          if (onSelectEvent) onSelectEvent(rel);
                        }}
                        className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl overflow-hidden transition-all group cursor-pointer"
                      >
                        <div className="aspect-16/10 w-full overflow-hidden bg-slate-900">
                          <img
                            src={relPoster}
                            alt={rel.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="p-2.5 space-y-1">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase">
                            {rel.category}
                          </span>
                          <div className="text-xs font-bold text-slate-900 truncate">{rel.title}</div>
                          <div className="text-[11px] text-slate-500">{rel.event_date}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            {isRegistered ? (
              <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                You hold a verified pass for this event
              </span>
            ) : isFull ? (
              <span className="font-semibold text-rose-700">All seats have been reserved</span>
            ) : (
              <span>
                Free seat entry · <span className="font-semibold text-slate-900">{seatsLeft} seats left</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAction}
              disabled={registering || (isFull && !isRegistered)}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isRegistered
                  ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
              }`}
            >
              {registering ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : isRegistered ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Pass</span>
                </>
              ) : isFull ? (
                <span>Sold Out</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentUser ? 'Reserve Seat Now' : 'Sign In to Reserve'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
