import React, { useState } from 'react';
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
} from 'lucide-react';
import { api } from '../services/api.js';

export const VenueDetailModal = ({
  venue,
  isOpen,
  onClose,
  currentUser,
  onInquirySent,
}) => {
  if (!isOpen || !venue) return null;

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [inquiryName, setInquiryName] = useState(currentUser?.name || '');
  const [inquiryEmail, setInquiryEmail] = useState(currentUser?.email || '');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryDate, setInquiryDate] = useState('');
  const [inquiryGuests, setInquiryGuests] = useState(venue.capacity ? Math.min(100, venue.capacity) : 50);
  const [inquiryMessage, setInquiryMessage] = useState(
    `Hello, I would like to inquire about booking ${venue.venueName} for our upcoming event.`
  );
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [inquiryStatus, setInquiryStatus] = useState(null); // { type: 'success'|'error', text: string }

  const photos = venue.images && venue.images.length > 0
    ? venue.images
    : [
        {
          url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
          caption: 'Main Auditorium Hall',
        },
      ];

  const activePhoto = photos[activePhotoIndex] || photos[0];

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
        onInquirySent(`Inquiry dispatched to ${venue.venueName} owner.`);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-scaleIn max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1">
          {/* Main Photo Stage */}
          <div className="relative aspect-16/9 sm:aspect-21/9 w-full bg-slate-950 overflow-hidden">
            <img
              src={activePhoto.url}
              alt={activePhoto.caption || venue.venueName}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-600/90 mb-1.5 shadow-sm">
                {venue.category}
              </div>
              <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                {venue.venueName}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  {venue.city}, {venue.state}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Max Capacity: {venue.capacity} guests
                </span>
                <span>•</span>
                <span className="font-bold text-white">
                  {venue.pricing?.pricingType === 'Free' ? (
                    <span className="text-emerald-400">Free / Sponsored</span>
                  ) : venue.pricing?.pricingType === 'Custom Quote' ? (
                    <span className="text-indigo-300">Custom Quote</span>
                  ) : (
                    `₹${Number(venue.pricing?.price || 0).toLocaleString()} / ${venue.pricing?.pricingType?.replace('Per ', '')}`
                  )}
                </span>
              </div>
              {activePhoto.caption && (
                <div className="text-[11px] text-slate-300 italic mt-1 truncate">
                  Photo: {activePhoto.caption}
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
                {venue.description}
              </p>
              {venue.detailedInfo && (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {venue.detailedInfo}
                </p>
              )}
            </div>

            {/* Suitable Events */}
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
                <div className="font-semibold text-slate-900">{venue.address}</div>
                <div>
                  {venue.city}, {venue.state} - {venue.pinCode}
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
                {(venue.facilities || []).map((fac) => (
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

            {/* Operating Times and Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Operating Hours & Days
                </div>
                <div className="text-slate-600">
                  {venue.operatingHours?.openingTime || '09:00'} to{' '}
                  {venue.operatingHours?.closingTime || '21:00'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Available:{' '}
                  {(venue.operatingHours?.availableDays || ['All Days']).join(', ')}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Venue Policies & Guidelines
                </div>
                <div className="text-slate-600 line-clamp-3">
                  {venue.operatingHours?.venueRules || 'Standard campus conduct guidelines apply.'}
                </div>
              </div>
            </div>

            {/* Owner Public Contacts Section */}
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

            {/* Contact Venue Owner / Send Inquiry Form */}
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
                      max={venue.capacity || 1000}
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
          </div>
        </div>
      </div>
    </div>
  );
};
