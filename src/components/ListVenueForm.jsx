import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Trash2,
  Star,
  ExternalLink,
  Shield,
  Clock,
  DollarSign,
  Users,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.js';

const VENUE_CATEGORIES = [
  'Auditorium',
  'Banquet Hall',
  'Conference Hall',
  'Seminar Hall',
  'Outdoor Space',
  'Other',
];

const AVAILABLE_FACILITIES = [
  { id: 'Parking', label: 'Dedicated Parking', icon: '🚗' },
  { id: 'Wi-Fi', label: 'High-Speed Wi-Fi', icon: '📶' },
  { id: 'Air conditioning', label: 'Central Air Conditioning', icon: '❄️' },
  { id: 'Projector', label: 'HD Projector & Screen', icon: '📽️' },
  { id: 'Sound system', label: 'Surround Sound System & Mics', icon: '🔊' },
  { id: 'Stage', label: 'Elevated Stage & Podium', icon: '🎭' },
  { id: 'Seating arrangements', label: 'Flexible Seating Setup', icon: '🪑' },
  { id: 'Catering availability', label: 'In-house / Allowed Catering', icon: '🍽️' },
  { id: 'Wheelchair accessibility', label: 'Wheelchair Accessible Ramps & Lifts', icon: '♿' },
  { id: 'Washrooms', label: 'Hygienic Modern Washrooms', icon: '🚻' },
  { id: 'Power backup', label: '24/7 Generator Power Backup', icon: '⚡' },
  { id: 'Green room', label: 'VIP / Artist Green Room', icon: '🚪' },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SUITABLE_EVENT_SUGGESTIONS = [
  'Conferences',
  'Hackathons',
  'Seminars & Talks',
  'Cultural Fests',
  'Music Concerts',
  'Weddings & Banquets',
  'Workshops',
  'Networking Meetups',
  'Corporate Offsites',
];

// Curated high quality presets for quick photo population if desired
const SAMPLE_PRESETS = [
  {
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
    caption: 'Main Auditorium Hall with tiered acoustic seating',
    isCover: true,
  },
  {
    url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
    caption: 'Conference Stage with digital presentation wall',
    isCover: false,
  },
  {
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    caption: 'Spacious banquet reception area with ambient lighting',
    isCover: false,
  },
];

export const ListVenueForm = ({
  currentUser,
  initialData = null,
  isEditing = false,
  onSuccess,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [tagInput, setTagInput] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    venueName: initialData?.venueName || '',
    category: initialData?.category || 'Auditorium',
    description: initialData?.description || '',
    detailedInfo: initialData?.detailedInfo || '',
    capacity: initialData?.capacity || '',
    suitableEvents: initialData?.suitableEvents || ['Conferences', 'Seminars & Talks'],
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    pinCode: initialData?.pinCode || '',
    landmark: initialData?.landmark || '',
    mapLocation: initialData?.mapLocation || '',
    contactName: initialData?.contactName || currentUser?.name || '',
    contactEmail: initialData?.contactEmail || currentUser?.email || '',
    contactPhone: initialData?.contactPhone || '',
    altContactPhone: initialData?.altContactPhone || '',
    whatsappNumber: initialData?.whatsappNumber || '',
    organizationName: initialData?.organizationName || '',
    preferredContactMethod: initialData?.preferredContactMethod || 'Email',
    publicContactPreferences: {
      showEmail: initialData?.publicContactPreferences?.showEmail ?? true,
      showPhone: initialData?.publicContactPreferences?.showPhone ?? true,
      showWhatsapp: initialData?.publicContactPreferences?.showWhatsapp ?? false,
    },
    facilities: initialData?.facilities || ['Parking', 'Wi-Fi', 'Air conditioning', 'Projector'],
    pricing: {
      pricingType: initialData?.pricing?.pricingType || 'Per Day',
      price: initialData?.pricing?.price || '',
      currency: initialData?.pricing?.currency || 'INR',
    },
    operatingHours: {
      openingTime: initialData?.operatingHours?.openingTime || '09:00',
      closingTime: initialData?.operatingHours?.closingTime || '21:00',
      availableDays: initialData?.operatingHours?.availableDays || [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      venueRules:
        initialData?.operatingHours?.venueRules ||
        'No smoking inside premises. Security clearance required for amplified sound after 10:00 PM.',
    },
    images: initialData?.images?.length ? initialData.images : [SAMPLE_PRESETS[0]],
  });

  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Field change helper
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  // Facility toggle
  const toggleFacility = (facilityId) => {
    setFormData((prev) => {
      const exists = prev.facilities.includes(facilityId);
      return {
        ...prev,
        facilities: exists
          ? prev.facilities.filter((f) => f !== facilityId)
          : [...prev.facilities, facilityId],
      };
    });
  };

  // Available days toggle
  const toggleDay = (day) => {
    setFormData((prev) => {
      const days = prev.operatingHours.availableDays;
      const exists = days.includes(day);
      return {
        ...prev,
        operatingHours: {
          ...prev.operatingHours,
          availableDays: exists ? days.filter((d) => d !== day) : [...days, day],
        },
      };
    });
  };

  // Suitable events tag helper
  const addEventTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !formData.suitableEvents.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        suitableEvents: [...prev.suitableEvents, trimmed],
      }));
      setTagInput('');
    }
  };

  const removeEventTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      suitableEvents: prev.suitableEvents.filter((t) => t !== tagToRemove),
    }));
  };

  // Image Upload Handlers
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (formData.images.length + files.length > 10) {
      alert('You can upload a maximum of 10 photos.');
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not a valid image file.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} exceeds the 5MB size limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result;
        if (url) {
          setFormData((prev) => ({
            ...prev,
            images: [
              ...prev.images,
              {
                url,
                caption: file.name.replace(/\.[^/.]+$/, ''),
                isCover: prev.images.length === 0,
              },
            ],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (indexToRemove) => {
    setFormData((prev) => {
      const filtered = prev.images.filter((_, idx) => idx !== indexToRemove);
      if (filtered.length > 0 && !filtered.some((img) => img.isCover)) {
        filtered[0].isCover = true;
      }
      return { ...prev, images: filtered };
    });
  };

  const setCoverImage = (coverIndex) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, idx) => ({
        ...img,
        isCover: idx === coverIndex,
      })),
    }));
  };

  const updateImageCaption = (index, caption) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, idx) => (idx === index ? { ...img, caption } : img)),
    }));
  };

  // Step validation
  const validateStep = (step) => {
    setFormError(null);

    if (step === 1) {
      if (!formData.venueName.trim()) {
        setFormError('Please enter the venue name.');
        return false;
      }
      if (!formData.description.trim()) {
        setFormError('Please provide a short description for your venue.');
        return false;
      }
      if (!formData.capacity || Number(formData.capacity) <= 0) {
        setFormError('Please enter a valid guest seating capacity greater than 0.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!formData.address.trim()) {
        setFormError('Please enter the street address.');
        return false;
      }
      if (!formData.city.trim()) {
        setFormError('Please enter the city.');
        return false;
      }
      if (!formData.state.trim()) {
        setFormError('Please enter the state or province.');
        return false;
      }
      if (!formData.pinCode.trim()) {
        setFormError('Please enter the PIN / Postal code.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!formData.contactName.trim()) {
        setFormError('Please provide a contact person name.');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.contactEmail.trim() || !emailRegex.test(formData.contactEmail.trim())) {
        setFormError('Please enter a valid contact email address.');
        return false;
      }
      const phoneClean = formData.contactPhone.replace(/[\s\-()]/g, '');
      if (!phoneClean || phoneClean.length < 8) {
        setFormError('Please enter a valid primary contact phone number.');
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (
        formData.pricing.pricingType !== 'Free' &&
        formData.pricing.pricingType !== 'Custom Quote' &&
        (!formData.pricing.price || Number(formData.pricing.price) < 0)
      ) {
        setFormError('Please provide a valid price amount.');
        return false;
      }
      if (formData.operatingHours.availableDays.length === 0) {
        setFormError('Please select at least one available operating day.');
        return false;
      }
      return true;
    }

    if (step === 5) {
      if (formData.images.length === 0) {
        setFormError('Please upload or select at least one photo of the venue.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, 6));
    }
  };

  const handleBack = () => {
    setFormError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    for (let s = 1; s <= 5; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    if (!declarationAccepted && !isEditing) {
      setFormError('You must check the declaration confirming you own or are authorized to list this venue.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && initialData?._id) {
        const updated = await api.updateListing(initialData._id, formData);
        if (onSuccess) onSuccess(updated, 'Venue listing updated successfully.');
      } else {
        const created = await api.createListing(formData);
        if (onSuccess) onSuccess(created, 'Venue listing submitted for administrative approval!');
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit venue listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepsMeta = [
    { num: 1, title: 'Basic Details', icon: Building2 },
    { num: 2, title: 'Location', icon: MapPin },
    { num: 3, title: 'Contact Info', icon: Phone },
    { num: 4, title: 'Facilities & Rates', icon: Layers },
    { num: 5, title: 'Venue Photos', icon: ImageIcon },
    { num: 6, title: 'Review & Submit', icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>EventSphere Venue Partners</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isEditing ? 'Edit Venue Listing' : 'List Your Venue on EventSphere'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Showcase your auditorium, banquet hall, seminar space, or outdoor ground to thousands of student organizers, corporate planners, and campus communities.
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="self-start sm:self-center px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel & Exit
            </button>
          )}
        </div>

        {/* Multi-Step Stepper Header */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="hidden sm:grid grid-cols-6 gap-2">
            {stepsMeta.map((s) => {
              const Icon = s.icon;
              const isPassed = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < currentStep) setCurrentStep(s.num);
                  }}
                  className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-indigo-50/80 text-indigo-700 font-bold border border-indigo-200/80 shadow-xs'
                      : isPassed
                      ? 'text-emerald-700 font-medium hover:bg-slate-50 cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed opacity-70'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs mb-1.5 transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 text-white font-bold ring-4 ring-indigo-100'
                        : isPassed
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-500 font-semibold'
                    }`}
                  >
                    {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                  </div>
                  <span className="text-[11px] leading-tight truncate w-full">{s.title}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Step Bar */}
          <div className="sm:hidden flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>
              Step {currentStep} of 6: <span className="text-indigo-600">{stepsMeta[currentStep - 1].title}</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {Math.round((currentStep / 6) * 100)}%
            </span>
          </div>
          <div className="sm:hidden w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error Callout */}
      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs sm:text-sm animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="leading-snug">{formError}</div>
        </div>
      )}

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* STEP 1: Basic Venue Details */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Step 1: Basic Venue Details
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tell us the primary identity and audience capacity of your venue or hall.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Venue or Place Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grand Apex Convention Center, Ramanujan Seminar Hall"
                  value={formData.venueName}
                  onChange={(e) => updateField('venueName', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Venue Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all bg-white"
                >
                  {VENUE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Maximum Seating / Guest Capacity <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={formData.capacity}
                    onChange={(e) => updateField('capacity', e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Short Tagline / Catchy Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. A premier acoustics-engineered auditorium equipped with 4K projection and green rooms."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  maxLength={180}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                  required
                />
                <div className="text-[11px] text-slate-400 text-right font-mono">
                  {formData.description.length}/180 characters
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Detailed Venue Overview & Features (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your venue's architectural layout, stage dimensions, soundproofing, past landmark events hosted, and setup flexibility..."
                  value={formData.detailedInfo}
                  onChange={(e) => updateField('detailedInfo', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all resize-y"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Suitable Event Types (Tags)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.suitableEvents.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeEventTag(tag)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type custom event tag and press Add..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEventTag(tagInput);
                      }
                    }}
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => addEventTag(tagInput)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Add Tag
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-600">Quick suggestions:</span>
                  {SUITABLE_EVENT_SUGGESTIONS.filter((s) => !formData.suitableEvents.includes(s))
                    .slice(0, 5)
                    .map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => addEventTag(sug)}
                        className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] transition-colors"
                      >
                        + {sug}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Location Details */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Step 2: Location & Address
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Provide accurate address details so organizers and attendees can easily navigate to the venue.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Complete Street Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot No. 42, Knowledge Park III, Near Gate 4"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  City <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabad, Bengaluru, Delhi NCR"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  State / Province <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Telangana, Karnataka, Punjab"
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  PIN / Postal Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 500081"
                  value={formData.pinCode}
                  onChange={(e) => updateField('pinCode', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nearby Landmark (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Opp. Metro Pillar 142, Next to Central Library"
                  value={formData.landmark}
                  onChange={(e) => updateField('landmark', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Google Maps Location Link (Optional)
                </label>
                <div className="relative">
                  <ExternalLink className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    placeholder="https://maps.google.com/?q=..."
                    value={formData.mapLocation}
                    onChange={(e) => updateField('mapLocation', e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              {/* Map Preview Card */}
              <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {formData.venueName || 'Venue'} Location Preview
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formData.address ? `${formData.address}, ` : ''}
                      {formData.city ? `${formData.city}, ` : ''}
                      {formData.state} {formData.pinCode}
                    </div>
                  </div>
                </div>

                {formData.mapLocation ? (
                  <a
                    href={formData.mapLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 shadow-xs transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Verify Map Link
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">No external URL linked</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Venue Contact Information */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-indigo-600" />
                Step 3: Venue Contact Information & Privacy
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Designate the manager or owner responsible for inquiries, and choose which details are publicly shown.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Manager / Owner Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sravan Reddy"
                  value={formData.contactName}
                  onChange={(e) => updateField('contactName', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Business / Organization Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Conventions Ltd., Campus Facilities Board"
                  value={formData.organizationName}
                  onChange={(e) => updateField('organizationName', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Contact Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. venues@eventsphere.com"
                  value={formData.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Primary Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.contactPhone}
                  onChange={(e) => updateField('contactPhone', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Alternative Phone (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. 040-23456789"
                  value={formData.altContactPhone}
                  onChange={(e) => updateField('altContactPhone', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">WhatsApp Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.whatsappNumber}
                  onChange={(e) => updateField('whatsappNumber', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">Preferred Contact Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Email', 'Phone', 'WhatsApp', 'Any'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateField('preferredContactMethod', m)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        formData.preferredContactMethod === m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Public Visibility Privacy Shield Box */}
              <div className="md:col-span-2 p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-700" />
                  <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Privacy Controls: Public Contact Visibility
                  </h3>
                </div>
                <p className="text-[11px] text-indigo-900 leading-relaxed">
                  Choose which contact details can be seen by general visitors on the public venue page. Private details remain accessible only to platform administrators and verified event organizers after explicit inquiries.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-indigo-200/70 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.publicContactPreferences.showEmail}
                      onChange={(e) =>
                        updateNestedField('publicContactPreferences', 'showEmail', e.target.checked)
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-900">Show Email Publicly</div>
                      <div className="text-[10px] text-slate-500">
                        {formData.publicContactPreferences.showEmail ? 'Visible on venue page' : 'Hidden from public'}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-indigo-200/70 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.publicContactPreferences.showPhone}
                      onChange={(e) =>
                        updateNestedField('publicContactPreferences', 'showPhone', e.target.checked)
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-900">Show Phone Publicly</div>
                      <div className="text-[10px] text-slate-500">
                        {formData.publicContactPreferences.showPhone ? 'Visible on venue page' : 'Hidden from public'}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-indigo-200/70 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.publicContactPreferences.showWhatsapp}
                      onChange={(e) =>
                        updateNestedField('publicContactPreferences', 'showWhatsapp', e.target.checked)
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-900">Show WhatsApp Publicly</div>
                      <div className="text-[10px] text-slate-500">
                        {formData.publicContactPreferences.showWhatsapp ? 'Visible on venue page' : 'Hidden from public'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Facilities and Pricing */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Step 4: Facilities, Operating Schedule & Pricing
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select amenities provided with the space and state your standard tariff or booking model.
              </p>
            </div>

            {/* Facilities Checkbox Grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700">
                Venue Amenities & Facilities (Select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_FACILITIES.map((f) => {
                  const isChecked = formData.facilities.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFacility(f.id)}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        isChecked
                          ? 'bg-indigo-50/80 border-indigo-400/80 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                      <div className="flex-1">
                        <div className={`text-xs font-bold ${isChecked ? 'text-indigo-900' : 'text-slate-800'}`}>
                          {f.id}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-tight">{f.label}</div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pricing Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pricing & Booking Rates
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pricing Model</label>
                  <select
                    value={formData.pricing.pricingType}
                    onChange={(e) => updateNestedField('pricing', 'pricingType', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-white"
                  >
                    <option value="Free">Free / Academic Sponsored</option>
                    <option value="Per Hour">Hourly Rate (Per Hour)</option>
                    <option value="Per Day">Daily Rate (Per Day)</option>
                    <option value="Custom Quote">Custom Quote Upon Inquiry</option>
                  </select>
                </div>

                {formData.pricing.pricingType !== 'Free' &&
                  formData.pricing.pricingType !== 'Custom Quote' && (
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-700">
                        Price (in INR ₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          placeholder="e.g. 15000"
                          value={formData.pricing.price}
                          onChange={(e) => updateNestedField('pricing', 'price', e.target.value)}
                          className="w-full pl-8 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 bg-white"
                          required
                        />
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Indicate base rent excluding optional vendor electricity/cleaning surcharge.
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Operating Hours and Rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Opening Time
                </label>
                <input
                  type="time"
                  value={formData.operatingHours.openingTime}
                  onChange={(e) => updateNestedField('operatingHours', 'openingTime', e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Closing Time
                </label>
                <input
                  type="time"
                  value={formData.operatingHours.closingTime}
                  onChange={(e) => updateNestedField('operatingHours', 'closingTime', e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">Available Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isAvailable = formData.operatingHours.availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isAvailable
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700">Venue Rules & Policy</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prior clearance needed for high-wattage sound systems; catering waste must be cleared by organizer; strictly alcohol-free campus."
                  value={formData.operatingHours.venueRules}
                  onChange={(e) => updateNestedField('operatingHours', 'venueRules', e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 resize-y"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Upload Venue Images */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                Step 5: Upload Venue Photos
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload clear, well-lit photos showcasing the stage, seating view, entrance, and facilities.
              </p>
            </div>

            {/* Upload Dropzone */}
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50 hover:bg-indigo-50/20 transition-all cursor-pointer relative group">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">
                  Click to select photos or drag and drop
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Supported formats: JPG, PNG, WEBP (Max 5MB per image, up to 10 images)
                </div>
              </div>
            </div>

            {/* Quick Sample Presets Adder */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Want quick sample photos?</span>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    images: [...prev.images, ...SAMPLE_PRESETS.filter((p) => !prev.images.some((img) => img.url === p.url))],
                  }))
                }
                className="text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                + Add Curated Demo Photos
              </button>
            </div>

            {/* Image Previews Grid */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Uploaded Photos ({formData.images.length}/10)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Star an image to mark as the main listing cover
                </span>
              </div>

              {formData.images.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-xl bg-slate-50">
                  No photos uploaded yet. Please add at least one photo.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`relative border rounded-2xl overflow-hidden bg-white shadow-xs group transition-all ${
                        img.isCover ? 'ring-2 ring-indigo-600 border-indigo-600' : 'border-slate-200'
                      }`}
                    >
                      <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
                        <img
                          src={img.url}
                          alt={img.caption || `Venue Photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {img.isCover && (
                          <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                            <Star className="w-3 h-3 fill-white" />
                            COVER PHOTO
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          {!img.isCover && (
                            <button
                              type="button"
                              onClick={() => setCoverImage(idx)}
                              title="Set as Cover Image"
                              className="p-1.5 rounded-lg bg-black/60 hover:bg-indigo-600 text-white transition-colors"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            title="Remove Photo"
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5">
                        <input
                          type="text"
                          placeholder="Add description/caption..."
                          value={img.caption || ''}
                          onChange={(e) => updateImageCaption(idx, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Review and Submit */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                Step 6: Review Summary & Submit for Approval
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Verify all listing specifications below before dispatching to the administration review queue.
              </p>
            </div>

            {/* Complete Venue Preview Card */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
              {/* Cover Header Banner */}
              {formData.images.length > 0 && (
                <div className="aspect-21/9 w-full relative overflow-hidden bg-slate-900">
                  <img
                    src={(formData.images.find((i) => i.isCover) || formData.images[0]).url}
                    alt={formData.venueName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-600/90 mb-1.5">
                      {formData.category}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black">{formData.venueName || 'Venue Name'}</h3>
                    <div className="text-xs text-slate-200 flex items-center gap-2 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        {formData.city}, {formData.state}
                      </span>
                      <span>•</span>
                      <span>{formData.capacity} Guests Max Capacity</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-6">
                {/* Section 1 Review */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Basic Details
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{formData.description}</p>
                  {formData.detailedInfo && (
                    <p className="text-xs text-slate-500 italic">{formData.detailedInfo}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formData.suitableEvents.map((ev) => (
                      <span key={ev} className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Section 2 Review */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Location & Directions
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-xs text-slate-700">
                    <div>{formData.address}</div>
                    <div>
                      {formData.city}, {formData.state} - {formData.pinCode}
                    </div>
                    {formData.landmark && (
                      <div className="text-slate-500 mt-1">Landmark: {formData.landmark}</div>
                    )}
                  </div>
                </div>

                {/* Section 3 Review */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Contact & Privacy Rules
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                    <div>
                      <span className="text-slate-400">Manager:</span> {formData.contactName}
                    </div>
                    <div>
                      <span className="text-slate-400">Organization:</span>{' '}
                      {formData.organizationName || 'Individual'}
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span> {formData.contactEmail}{' '}
                      <span className="text-[10px] text-slate-400">
                        ({formData.publicContactPreferences.showEmail ? 'Public' : 'Private'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Phone:</span> {formData.contactPhone}{' '}
                      <span className="text-[10px] text-slate-400">
                        ({formData.publicContactPreferences.showPhone ? 'Public' : 'Private'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 4 Review */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Facilities & Rates
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.facilities.map((fac) => (
                      <span key={fac} className="px-2 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-700 font-medium">
                        ✓ {fac}
                      </span>
                    ))}
                  </div>
                  <div className="pt-2 text-xs text-slate-800">
                    <span className="font-bold">Tariff: </span>
                    {formData.pricing.pricingType === 'Free' ? (
                      <span className="text-emerald-600 font-semibold">Free / Community Sponsored</span>
                    ) : formData.pricing.pricingType === 'Custom Quote' ? (
                      <span className="text-indigo-600 font-semibold">Custom Quote Upon Inquiry</span>
                    ) : (
                      <span className="text-slate-900 font-bold">
                        ₹{Number(formData.pricing.price).toLocaleString()} / {formData.pricing.pricingType.replace('Per ', '')}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Operating {formData.operatingHours.openingTime} - {formData.operatingHours.closingTime} on{' '}
                    {formData.operatingHours.availableDays.join(', ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Ownership Declaration */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5 shrink-0"
                />
                <div className="text-xs text-slate-700 leading-snug">
                  <span className="font-bold text-slate-900">Ownership & Authorization Declaration: </span>
                  I solemnly declare that I am the authorized owner or designated venue manager of this property. All information, photographs, capacities, and pricing provided are accurate and compliant with local university and municipal guidelines.
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Navigation & Action Footer */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous Step
            </button>
          ) : (
            <div />
          )}

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              Continue to Step {currentStep + 1}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting || (!declarationAccepted && !isEditing)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Venue for Review...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Save Changes' : 'Submit Venue for Approval'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
