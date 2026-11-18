import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Users,
  Clock,
  DollarSign,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  Shield,
  CheckCircle2,
  Calendar,
  Send,
  AlertCircle,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Camera,
} from 'lucide-react';
import { api } from '../services/api.js';
import { getVenueCover } from '../utils/imagePlaceholders.js';

export const VenueDetailModal = ({
  venue,
  isOpen,
  onClose,
  currentUser,
  onInquirySent,
  onRequestBooking,
}) => {
  if (!isOpen || !venue) return null;

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Normalize fields between campus venues and community listings
  const isCampusVenue = Boolean(
    venue.location_type !== undefined ||
    venue.venue_name !== undefined ||
    venue.max_capacity !== undefined
  );

  const venueName = venue.venue_name || venue.venueName || 'Event Venue';
  const capacity = venue.max_capacity ?? venue.capacity ?? 0;
  const category =
    venue.category ||
    (venue.location_type === 'out_campus' ? 'Off-Campus Complex' : 'Campus Auditorium');
  const city =
    venue.city ||
    (venue.location_type === 'out_campus' ? 'Off-Campus Tech Hub' : 'Main University Campus');
  const state = venue.state || 'Academic Block';
  const address =
    venue.address ||
    (venue.location_type === 'out_campus'
      ? 'Off-Campus University Grounds & Convention Center'
      : 'Main Campus Academic Complex, Central Quad');
  const pricing = venue.pricing || {
    pricingType: isCampusVenue ? 'Free' : 'Custom Quote',
    price: 0,
  };
  const description =
    venue.description ||
    'High-capacity campus venue equipped with advanced audio-visual systems, climate control, and tiered seating suitable for symposiums, tech hackathons, and cultural festivals.';
  const facilities =
    venue.facilities && venue.facilities.length > 0
      ? venue.facilities
      : [
          'Air Conditioning',
          'Projector & Screen',
          'Stage & Sound System',
          'High-Speed Wi-Fi',
          'Tiered Seating',
          'Podium & Wireless Mics',
        ];

  // Resolve photos array with graceful fallbacks
  let photos = [];
  if (Array.isArray(venue.images) && venue.images.length > 0) {
    photos = venue.images.map((img, i) =>
      typeof img === 'string'
        ? { url: img, caption: `${venueName} — Photo ${i + 1}` }
        : {
            url: img.url || getVenueCover(venue),
            caption: img.caption || `${venueName} — Photo ${i + 1}`,
          }
    );
  } else if (venue.coverImage) {
    photos = [{ url: venue.coverImage, caption: `${venueName} — Primary View` }];
  } else {
    photos = [
      {
        url: getVenueCover(venue),
        caption: 'Photo not available',
        isPlaceholder: true,
      },
    ];
  }

  const activePhoto = photos[activePhotoIndex] || photos[0];

  // Keyboard navigation for photo gallery and closing modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((curr) => (curr > 0 ? curr - 1 : photos.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setActivePhotoIndex((curr) => (curr < photos.length - 1 ? curr + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos.length, onClose]);

  // Inquiry Form State (for community venues)
  const [inquiryName, setInquiryName] = useState(currentUser?.name || '');
  const [inquiryEmail, setInquiryEmail] = useState(currentUser?.email || '');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryDate, setInquiryDate] = useState('');
  const [inquiryGuests, setInquiryGuests] = useState(capacity ? Math.min(100, capacity) : 50);
  const [inquiryMessage, setInquiryMessage] = useState(
    `Hello, I would like to inquire about booking ${venueName} for our upcoming event.`
  );
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState(null);

  const handleSendInquiry = async (e) => {
    e.preventDefault();
    setInquiryStatus(null);

    if (!inquiryName.trim() || !inquiryEmail.trim() || !inquiryDate || !inquiryMessage.trim()) {
      setInquiryStatus({
        type: 'error',
        text: 'Please provide your full name, email, event date, and message.',
      });
      return;
    }

    setSendingInquiry(true);
    try {
      await api.sendVenueInquiry(venue._id, {
        senderName: inquiryName,
        senderEmail: inquiryEmail,
        senderPhone: inquiryPhone,
        eventDate: inquiryDate,
        guestCount: Number(inquiryGuests) || 1,
        message: inquiryMessage,
      });

      setInquiryStatus({
        type: 'success',
        text: 'Your booking inquiry was successfully delivered to the venue owner!',
      });

      if (onInquirySent) {
        onInquirySent(`Inquiry dispatched to ${venueName} owner.`);
      }
    } catch (err) {
      setInquiryStatus({
        type: 'error',
        text: err.message || 'Failed to send inquiry. Please try again.',
      });
    } finally {
      setSendingInquiry(false);
    }
  };

  const bookedDates = venue.booked_dates || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-scaleIn max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1">
          {/* Main Photo Stage */}
          <div className="relative aspect-16/9 sm:aspect-21/9 w-full bg-slate-950 overflow-hidden group">
            <img
              src={activePhoto.url}
              alt={activePhoto.caption || venueName}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            {/* Previous / Next Arrow Controls */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIndex((curr) => (curr > 0 ? curr - 1 : photos.length - 1));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/85 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIndex((curr) => (curr < photos.length - 1 ? curr + 1 : 0));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/85 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer shadow-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Counter Pill */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Photo {activePhotoIndex + 1} of {photos.length}
                  </span>
                </div>
              </>
            )}

            {/* Placeholder Indicator Badge if photo is fallback */}
            {activePhoto.isPlaceholder && (
              <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-xs text-slate-300 text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-slate-700">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <span>Photo not available · Category placeholder</span>
              </div>
            )}

            {/* Caption & Title Bar */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-600 shadow-sm">
                  {category}
                </span>
                {isCampusVenue ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-600/90 shadow-sm">
                    Campus Managed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-600/90 shadow-sm">
                    Partner Listed
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight drop-shadow-sm">
                {venueName}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200 mt-1.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  {city}, {state}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Capacity: {capacity.toLocaleString()} guests
                </span>
                <span>•</span>
                <span className="font-bold text-white">
                  {pricing.pricingType === 'Free' ? (
                    <span className="text-emerald-400">Free / University Sponsored</span>
                  ) : pricing.pricingType === 'Custom Quote' ? (
                    <span className="text-indigo-300">Custom Quote</span>
                  ) : (
                    `₹${Number(pricing.price || 0).toLocaleString()} / ${(pricing.pricingType || '').replace('Per ', '')}`
                  )}
                </span>
              </div>

              {activePhoto.caption && !activePhoto.isPlaceholder && (
                <div className="text-[11px] text-slate-300 italic mt-1 truncate">
                  {activePhoto.caption}
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Strip */}
          {photos.length > 1 && (
            <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
              {photos.map((photo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`w-16 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    idx === activePhotoIndex
                      ? 'border-indigo-500 scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || `Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Details Body */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* Overview & Description */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                About This Space
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed font-normal">
                {description}
              </p>
              {venue.detailedInfo && (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {venue.detailedInfo}
                </p>
              )}
            </div>

            {/* Suitable Events (if available) */}
            {venue.suitableEvents && venue.suitableEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recommended For
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {venue.suitableEvents.map((ev) => (
                    <span
                      key={ev}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location & Directions */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Address & Navigation
                </h3>
                {venue.mapLocation && (
                  <a
                    href={venue.mapLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                <div className="font-semibold text-slate-900">{address}</div>
                <div>
                  {city}, {state} {venue.pinCode ? `- ${venue.pinCode}` : ''}
                </div>
                {venue.landmark && (
                  <div className="text-xs text-slate-500 mt-1">Landmark: {venue.landmark}</div>
                )}
              </div>
            </div>

            {/* Facilities & Amenities */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Amenities & Facilities Provided
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {facilities.map((fac) => (
                  <div
                    key={fac}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{fac}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Campus Venue: Availability Schedule & Instant Booking */}
            {isCampusVenue && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Schedule & Booking Availability
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {bookedDates.length} Reserved Date{bookedDates.length === 1 ? '' : 's'}
                  </span>
                </div>

                {bookedDates.length > 0 ? (
                  <div>
                    <span className="text-xs text-slate-500 block mb-2">
                      The following dates have pending or confirmed reservations:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {bookedDates.map((date) => (
                        <span
                          key={date}
                          className="font-mono text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold"
                        >
                          🔒 {date} (Reserved)
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-emerald-700 font-medium bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    ✨ Full open availability across all upcoming calendar dates.
                  </div>
                )}

                {/* Organizer Booking Action Button */}
                {onRequestBooking && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onRequestBooking(venue)}
                      className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      <span>Book This Auditorium for Your Event</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Operating Times and Rules (Community Venue) */}
            {!isCampusVenue && venue.operatingHours && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Operating Hours & Days
                  </div>
                  <div className="text-slate-600">
                    {venue.operatingHours.openingTime || '09:00'} to{' '}
                    {venue.operatingHours.closingTime || '21:00'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Available:{' '}
                    {(venue.operatingHours.availableDays || ['All Days']).join(', ')}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Venue Policies & Guidelines
                  </div>
                  <div className="text-slate-600 line-clamp-3">
                    {venue.operatingHours.venueRules || 'Standard campus conduct guidelines apply.'}
                  </div>
                </div>
              </div>
            )}

            {/* Owner Public Contacts Section (Community Venue) */}
            {!isCampusVenue && venue.contactName && (
              <div className="p-5 rounded-2xl bg-indigo-50/80 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-700" />
                    <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      Venue Management Contacts
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                    Verified Owner
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-indigo-200/70">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Manager</div>
                    <div className="font-bold text-slate-900 mt-0.5">{venue.contactName}</div>
                    {venue.organizationName && (
                      <div className="text-[11px] text-slate-500">{venue.organizationName}</div>
                    )}
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-indigo-200/70">
                    <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5 truncate">
                      {venue.contactEmail ? (
                        <a href={`mailto:${venue.contactEmail}`} className="text-indigo-600 hover:underline">
                          {venue.contactEmail}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Available via form below</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-indigo-200/70">
                    <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Mobile / Phone
                    </div>
                    <div className="font-semibold text-slate-900 mt-0.5">
                      {venue.contactPhone ? (
                        <a href={`tel:${venue.contactPhone}`} className="text-slate-900 hover:underline">
                          {venue.contactPhone}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Available via form below</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Venue Owner / Send Inquiry Form (Community Venue) */}
            {!isCampusVenue && (
              <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Send className="w-4 h-4 text-indigo-600" />
                    Contact Venue Owner / Send Inquiry
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submit your desired event date and requirements. The venue manager will review your request and get in touch directly.
                  </p>
                </div>

                {inquiryStatus && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      inquiryStatus.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {inquiryStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{inquiryStatus.text}</span>
                  </div>
                )}

                <form onSubmit={handleSendInquiry} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Your Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        value={inquiryName}
                        onChange={(e) => setInquiryName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Your Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. priya@campus.edu"
                        value={inquiryEmail}
                        onChange={(e) => setInquiryEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Contact Phone (Optional)</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={inquiryPhone}
                        onChange={(e) => setInquiryPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Desired Event Date</label>
                      <input
                        type="date"
                        value={inquiryDate}
                        onChange={(e) => setInquiryDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                        required
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">
                        Expected Guest Count: <span className="text-indigo-600 font-extrabold">{inquiryGuests}</span> guests
                      </label>
                      <input
                        type="range"
                        min="10"
                        max={capacity || 1000}
                        step="10"
                        value={inquiryGuests}
                        onChange={(e) => setInquiryGuests(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Inquiry Message</label>
                      <textarea
                        rows={3}
                        placeholder="Describe the nature of your event, required stage setup, timing, or questions..."
                        value={inquiryMessage}
                        onChange={(e) => setInquiryMessage(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 resize-y"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={sendingInquiry}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {sendingInquiry ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Sending Inquiry...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Booking Inquiry</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
