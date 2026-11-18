import React, { useState, useEffect } from 'react';
import {
  Send,
  Building2,
  Calendar,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  Copy,
  Check,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.js';

export const ContactListingSection = ({ currentUser }) => {
  const [adminConfig, setAdminConfig] = useState({
    adminEmail: '',
    supportHours: 'Mon - Fri, 9:00 AM - 5:00 PM',
    organization: 'EventSphere Administration Desk',
  });

  // Form state
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [requestType, setRequestType] = useState('List a Property');
  const [itemName, setItemName] = useState('');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text, requestId }
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Sync user details if user signs in later
  useEffect(() => {
    if (currentUser) {
      if (!name) setName(currentUser.name || '');
      if (!email) setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Load verified admin contact configuration from backend API
  useEffect(() => {
    let isMounted = true;
    api
      .getContactConfig()
      .then((cfg) => {
        if (isMounted && cfg) {
          setAdminConfig((prev) => ({
            ...prev,
            adminEmail: cfg.adminEmail || prev.adminEmail,
            supportHours: cfg.supportHours || prev.supportHours,
            organization: cfg.organization || prev.organization,
          }));
        }
      })
      .catch((err) => {
        console.warn('Failed to load admin contact configuration', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyEmail = () => {
    if (!adminConfig.adminEmail) return;
    navigator.clipboard.writeText(adminConfig.adminEmail).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!name.trim() || !email.trim() || !phone.trim() || !message.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please fill in your name, email, phone number, and description.',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitContactRequest({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        requestType,
        itemName: itemName.trim(),
        location: location.trim(),
        message: message.trim(),
      });

      setStatusMessage({
        type: 'success',
        text:
          res.message ||
          'Your inquiry has been privately delivered to the EventSphere Administration team.',
        requestId: res.requestId,
      });

      // Clear non-contact inputs on success
      setItemName('');
      setLocation('');
      setMessage('');
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to submit inquiry. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderItem = () => {
    if (requestType === 'List a Property') {
      return 'e.g. Royal Crystal Banquet Hall or Campus Studio A';
    }
    if (requestType === 'Submit Event Details') {
      return 'e.g. National Robotics Championship 2026';
    }
    return 'e.g. General Partnership or Venue Question';
  };

  return (
    <section
      id="contact-listing-section"
      className="relative py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-indigo-50/20 to-white border-t border-slate-200 scroll-mt-20 overflow-hidden"
    >
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Column: Welcome message & Verified Admin Contact (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Official Listing & Administration Desk</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Have a Venue or Event to List?
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed font-normal">
                Skip long, tedious forms. Simply send us your property or event details, and our verified campus administration team will review, approve, and professionally publish it for you.
              </p>
            </div>

            {/* Turnaround Guarantee & Benefits */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Private & Verified Admin Review</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your request is securely transmitted to authorized administrators only. It will never appear publicly without validation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Rapid 24-Hour Review</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Our team reviews submissions within 24 business hours to set up your venue specs or publish your event poster.
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Admin Contact Box */}
            <div className="p-5 rounded-2xl bg-white border border-indigo-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Direct Administrator Channel
                </span>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                  Verified Contact
                </span>
              </div>

              {adminConfig.adminEmail ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5 truncate">
                    <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                    <a
                      href={`mailto:${adminConfig.adminEmail}`}
                      className="text-xs sm:text-sm font-bold text-slate-900 hover:text-indigo-600 truncate transition-colors"
                      title="Send email to administrator"
                    >
                      {adminConfig.adminEmail}
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Email</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  Contact via the inquiry form below for official administrator assistance.
                </div>
              )}

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span>Office Hours: {adminConfig.supportHours}</span>
                <span>Campus Admin Desk</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Submit Listing / Event Inquiry
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Our administrators will contact you using your phone or email.
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                Quick Submission
              </span>
            </div>

            {/* Status alerts */}
            {statusMessage && (
              <div
                className={`mt-4 p-4 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold">{statusMessage.text}</div>
                  {statusMessage.requestId && (
                    <div className="text-[11px] font-mono text-emerald-700 opacity-90">
                      Tracking Reference ID: #{statusMessage.requestId.slice(-8).toUpperCase()}
                    </div>
                  )}
                  {statusMessage.type === 'success' && (
                    <button
                      type="button"
                      onClick={() => setStatusMessage(null)}
                      className="text-[11px] text-emerald-700 underline font-semibold mt-1 block cursor-pointer"
                    >
                      Submit another inquiry
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-5 text-xs">
              {/* Request Type Selector (3 options) */}
              <div>
                <label className="block font-bold text-slate-900 mb-2">
                  What would you like to do? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'List a Property', label: 'List a Property', icon: Building2 },
                    { id: 'Submit Event Details', label: 'Submit Event Details', icon: Calendar },
                    { id: 'General Inquiry', label: 'General Inquiry', icon: MessageSquare },
                  ].map((type) => {
                    const Icon = type.icon;
                    const isSelected = requestType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setRequestType(type.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-indigo-600'}`} />
                        <span className="font-semibold truncate">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              {/* Optional Property/Event Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {requestType === 'List a Property'
                      ? 'Property / Venue Name (Optional)'
                      : requestType === 'Submit Event Details'
                      ? 'Event Title / Name (Optional)'
                      : 'Subject / Topic (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder={getPlaceholderItem()}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location / City (Optional)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Cyber City Campus or Bangalore"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>

              {/* Message / Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {requestType === 'List a Property'
                    ? 'Property Description, Capacity & Amenities *'
                    : requestType === 'Submit Event Details'
                    ? 'Event Description, Dates, Schedule & Requirements *'
                    : 'Message / Inquiry Details *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide any key details such as capacity, expected dates, facilities, or questions for our administrator..."
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 transition-colors resize-y leading-relaxed"
                />
              </div>

              {/* Send Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  🔒 Information sent privately to verified administrators.
                </span>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
