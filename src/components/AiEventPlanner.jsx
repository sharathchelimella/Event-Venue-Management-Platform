import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  Sparkles,
  Calendar,
  Clock,
  Users,
  DollarSign,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Copy,
  Save,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  ChevronRight,
  ExternalLink,
  Layers,
  Wand2,
  Bookmark,
  Share2,
  Sliders,
  CheckSquare,
  Square,
  Building2,
  Compass,
  FileText,
  HelpCircle,
  X,
} from 'lucide-react';
import { getVenueCover } from '../utils/imagePlaceholders.js';

const CATEGORIES = [
  'Hackathons',
  'Technical workshops',
  'Cultural festivals',
  'College fests',
  'Seminars',
  'Conferences',
  'Sports events',
  'Networking events',
  'Other',
];

const AUDIENCES = [
  'Open to All Students',
  'Engineering & Tech Undergrads',
  'Management & Business Scholars',
  'First-Year Freshers',
  'Final-Year Graduating Batch',
  'Inter-College Delegations',
  'Faculty & Alumni Members',
];

const BUDGET_PRESETS = [15000, 30000, 60000, 120000, 250000];

export const AiEventPlanner = ({
  venues = [],
  myEvents = [],
  onSelectVenueForBooking,
  onSubmitAsBookingRequest,
  onRefreshEvents,
}) => {
  // Mode Selection: 'modeA' (Plan Existing Event) vs 'modeB' (Discover New Ideas)
  const [plannerMode, setPlannerMode] = useState('modeB');
  const [selectedExistingEventId, setSelectedExistingEventId] = useState('');

  // Preference Form States
  const [category, setCategory] = useState('Hackathons');
  const [eventName, setEventName] = useState('');
  const [theme, setTheme] = useState('');
  const [participants, setParticipants] = useState(150);
  const [budget, setBudget] = useState(30000);
  const [duration, setDuration] = useState('4 Hours');
  const [preferredDate, setPreferredDate] = useState('');
  const [audience, setAudience] = useState('Open to All Students');
  const [indoorOutdoor, setIndoorOutdoor] = useState('Indoor');
  const [specialRequirements, setSpecialRequirements] = useState('');

  // Planner Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  // Active Sub-Tab in Plan View: 'ideas' | 'venues' | 'schedule' | 'budget' | 'equipment' | 'promo'
  const [activePlanTab, setActivePlanTab] = useState('ideas');

  // Interactive Schedule Editor State
  const [editableSchedule, setEditableSchedule] = useState([]);
  const [newSlotTime, setNewSlotTime] = useState('');
  const [newSlotTitle, setNewSlotTitle] = useState('');

  // Interactive Checklist State
  const [equipmentChecks, setEquipmentChecks] = useState({});
  const [newEquipItem, setNewEquipItem] = useState('');

  // Saved Plans Drawer & State
  const [savedPlans, setSavedPlans] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  // Load Saved Plans on mount
  useEffect(() => {
    loadSavedPlans();
  }, []);

  // When Mode A selected event changes, auto-fill form
  useEffect(() => {
    if (plannerMode === 'modeA' && selectedExistingEventId) {
      const ev = myEvents.find((e) => (e._id || e.id) === selectedExistingEventId);
      if (ev) {
        setEventName(ev.title || '');
        setTheme(ev.description || '');
        if (ev.category) {
          const matched = CATEGORIES.find(
            (c) => c.toLowerCase() === ev.category.toLowerCase()
          );
          if (matched) setCategory(matched);
        }
        if (ev.event_date) setPreferredDate(ev.event_date);
        if (ev.registered_count) {
          setParticipants(Math.max(50, ev.registered_count * 2));
        }
      }
    }
  }, [plannerMode, selectedExistingEventId, myEvents]);

  // Sync plan schedule and equipment when a plan is loaded/generated
  useEffect(() => {
    if (planResult) {
      setEditableSchedule(planResult.schedule || []);
      const checks = {};
      (planResult.requiredEquipment || []).forEach((item, idx) => {
        checks[idx] = false;
      });
      setEquipmentChecks(checks);
    }
  }, [planResult]);

  const loadSavedPlans = async () => {
    try {
      setLoadingSaved(true);
      const list = await api.getSavedAiPlans();
      setSavedPlans(list || []);
    } catch (err) {
      console.warn('Failed to fetch saved plans:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setSaveSuccessMsg(null);

    try {
      const preferences = {
        category,
        eventName: eventName.trim() || undefined,
        theme: theme.trim() || undefined,
        participants: Number(participants) || 100,
        budget: Number(budget) || 20000,
        duration,
        date: preferredDate,
        audience,
        indoorOutdoor,
        specialRequirements: specialRequirements.trim() || undefined,
      };

      const existingEventId =
        plannerMode === 'modeA' && selectedExistingEventId ? selectedExistingEventId : null;

      const plan = await api.generateAiEventPlan(preferences, existingEventId);
      setPlanResult(plan);
      setActivePlanTab('ideas');
    } catch (err) {
      setGenerationError(err.message || 'Failed to generate event plan. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = async () => {
    if (!planResult) return;
    setIsSavingPlan(true);
    setSaveSuccessMsg(null);
    try {
      const planPayload = {
        ...planResult,
        schedule: editableSchedule,
        requiredEquipment: Object.keys(equipmentChecks).length > 0
          ? planResult.requiredEquipment
          : planResult.requiredEquipment,
        linkedEventId: plannerMode === 'modeA' ? selectedExistingEventId || null : null,
      };

      const saved = await api.saveAiEventPlan(planPayload);
      setSaveSuccessMsg(`Plan "${saved.title}" saved successfully to your dashboard!`);
      await loadSavedPlans();
      setTimeout(() => setSaveSuccessMsg(null), 4500);
    } catch (err) {
      setGenerationError(err.message || 'Failed to save plan.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeleteSavedPlan = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this saved AI event plan?')) return;
    try {
      await api.deleteSavedAiPlan(id);
      setSavedPlans((prev) => prev.filter((p) => p._id !== id));
      if (planResult && planResult._id === id) {
        setPlanResult(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to delete plan.');
    }
  };

  const handleLoadSavedPlan = (plan) => {
    setPlanResult(plan);
    setCategory(plan.category || 'Hackathons');
    setEventName(plan.title || '');
    if (plan.preferences) {
      setParticipants(plan.preferences.participants || 100);
      setBudget(plan.preferences.budget || 20000);
      setDuration(plan.preferences.duration || '4 Hours');
      setPreferredDate(plan.preferences.date || '');
      setAudience(plan.preferences.audience || 'Open to All Students');
      setIndoorOutdoor(plan.preferences.indoorOutdoor || 'Indoor');
      setSpecialRequirements(plan.preferences.specialRequirements || '');
    }
    setShowSavedDrawer(false);
    setActivePlanTab('ideas');
  };

  const handleAddScheduleSlot = (e) => {
    e.preventDefault();
    if (!newSlotTime.trim() || !newSlotTitle.trim()) return;
    setEditableSchedule((prev) => [
      ...prev,
      {
        time: newSlotTime.trim(),
        title: newSlotTitle.trim(),
        description: 'Organizer scheduled session',
      },
    ]);
    setNewSlotTime('');
    setNewSlotTitle('');
  };

  const handleRemoveScheduleSlot = (index) => {
    setEditableSchedule((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleToggleEquip = (idx) => {
    setEquipmentChecks((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleAddCustomEquip = (e) => {
    e.preventDefault();
    if (!newEquipItem.trim() || !planResult) return;
    const updated = [...(planResult.requiredEquipment || []), newEquipItem.trim()];
    setPlanResult({ ...planResult, requiredEquipment: updated });
    setNewEquipItem('');
  };

  const handleCopyText = (text, sectionKey) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleExportSummary = () => {
    if (!planResult) return;
    const lines = [
      `=====================================================`,
      `EVENTSPHERE AI EVENT PLAN: ${planResult.title}`,
      `Category: ${planResult.category}`,
      `Target Audience: ${planResult.preferences?.audience}`,
      `Expected Attendance: ${planResult.preferences?.participants} guests`,
      `Estimated Budget: INR ₹${Number(planResult.preferences?.budget || 0).toLocaleString('en-IN')}`,
      `Setting: ${planResult.preferences?.indoorOutdoor} | Duration: ${planResult.preferences?.duration}`,
      `Preferred Date: ${planResult.preferences?.date || 'Flexible'}`,
      `=====================================================`,
      ``,
      `--- RECOMMENDED CAMPUS VENUES ---`,
      ...(planResult.recommendedVenues || []).map(
        (v, i) => `${i + 1}. ${v.venueName} (Capacity: ${v.capacity}, Match: ${v.matchScore}%)\n   ${v.suitabilityReason}`
      ),
      ``,
      `--- SUGGESTED SCHEDULE ---`,
      ...editableSchedule.map((s) => `• [${s.time}] ${s.title}: ${s.description}`),
      ``,
      `--- BUDGET ALLOCATION ---`,
      ...(planResult.budgetBreakdown || []).map(
        (b) => `• ${b.category}: ₹${Number(b.estimatedAmount).toLocaleString('en-IN')} (${b.notes})`
      ),
      ``,
      `--- REQUIRED EQUIPMENT ---`,
      ...(planResult.requiredEquipment || []).map((eq) => `[ ] ${eq}`),
      ``,
      `--- PROMOTIONAL PITCH ---`,
      planResult.promotionalCopy?.promotionalPitch || '',
      `=====================================================`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${planResult.title.replace(/[^a-zA-Z0-9]/g, '_')}_Plan.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBridgeToBooking = (venueRecommendation = null) => {
    if (!planResult) return;

    const chosenVenue =
      venueRecommendation ||
      (planResult.recommendedVenues && planResult.recommendedVenues[0]) ||
      null;

    const bookingPayload = {
      title: planResult.title,
      category: planResult.category,
      description:
        planResult.eventIdeas?.[0]?.description ||
        planResult.promotionalCopy?.promotionalPitch ||
        `Planned event via EventSphere AI Assistant.`,
      venueId: chosenVenue?.venueId || '',
      eventDate: planResult.preferences?.date || preferredDate || '',
      eventTime: editableSchedule[0]?.time
        ? `${editableSchedule[0].time} to ${editableSchedule[editableSchedule.length - 1]?.time}`
        : '10:00 AM - 01:00 PM',
      tags: [planResult.category, 'AI-Planned', planResult.preferences?.indoorOutdoor],
    };

    if (typeof onSubmitAsBookingRequest === 'function') {
      onSubmitAsBookingRequest(bookingPayload);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner & Control Deck */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>EventSphere Intelligent Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              AI Event Suggestion & Planning Assistant
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Design comprehensive campus experiences with AI. Receive tailored event themes, real venue matches with verified capacity & availability, interactive schedules, equipment checklists, and social promo copy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSavedDrawer(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-102 active:scale-98"
            >
              <Bookmark className="w-4 h-4 text-indigo-300" />
              <span>Saved Plans ({savedPlans.length})</span>
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 mr-2">Select Planning Mode:</span>
          <button
            type="button"
            onClick={() => setPlannerMode('modeB')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              plannerMode === 'modeB'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Mode B — Discover New Event Ideas</span>
          </button>

          <button
            type="button"
            onClick={() => setPlannerMode('modeA')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              plannerMode === 'modeA'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mode A — Plan an Existing Assigned Event</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Input Preferences Card (Left) vs Output / Active Plan (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Configuration (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Event Preferences & Constraints</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Step 1: Configure</span>
          </div>

          {/* Mode A: Existing Event Selector */}
          {plannerMode === 'modeA' && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-3">
              <label className="block text-xs font-bold text-indigo-950">
                Select One of Your Assigned Events *
              </label>
              {myEvents.length === 0 ? (
                <p className="text-xs text-indigo-700 italic">
                  No events found assigned to your account. Switch to Mode B to ideate a new concept from scratch.
                </p>
              ) : (
                <select
                  value={selectedExistingEventId}
                  onChange={(e) => setSelectedExistingEventId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose an Event to Plan --</option>
                  {myEvents.map((ev) => (
                    <option key={ev._id || ev.id} value={ev._id || ev.id}>
                      {ev.title} ({ev.category || 'General'}) • {ev.event_date || 'No Date'}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-indigo-600">
                Mode A pre-loads your event’s title, registered attendees, and category to build a tailored run-of-show.
              </p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4 text-xs">
            {/* Category */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Event Category *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-2 rounded-xl text-left font-medium transition-all text-[11px] border cursor-pointer ${
                      category === cat
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Name or Theme */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Event Name or Core Theme (Optional)
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. NextGen Web3 & AI Builders Summit"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            {/* Expected Participants & Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Expected Participants: <span className="text-indigo-600 font-bold">{participants}</span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  step="10"
                  value={participants}
                  onChange={(e) => setParticipants(Math.max(10, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Budget (INR ₹): <span className="text-indigo-600 font-bold">₹{Number(budget).toLocaleString('en-IN')}</span>
                </label>
                <input
                  type="number"
                  min="1000"
                  step="5000"
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Quick Budget Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400 font-medium mr-1">Budget presets:</span>
              {BUDGET_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBudget(amt)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                    budget === amt
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  ₹{(amt / 1000).toFixed(0)}k
                </button>
              ))}
            </div>

            {/* Duration & Preferred Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="2 Hours">2 Hours (Sprint / Keynote)</option>
                  <option value="4 Hours">4 Hours (Half Day Masterclass)</option>
                  <option value="Full Day (8 Hours)">Full Day (8 Hours Intensive)</option>
                  <option value="2-Day Flagship">2-Day Flagship Experience</option>
                  <option value="36-Hour Hackathon">36-Hour Round-the-Clock</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preferred Date</label>
                <input
                  type="date"
                  min={todayStr}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {AUDIENCES.map((aud) => (
                  <option key={aud} value={aud}>
                    {aud}
                  </option>
                ))}
              </select>
            </div>

            {/* Indoor or Outdoor Preference */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Setting Environment</label>
              <div className="grid grid-cols-2 gap-2">
                {['Indoor', 'Outdoor'].map((setting) => (
                  <button
                    key={setting}
                    type="button"
                    onClick={() => setIndoorOutdoor(setting)}
                    className={`py-2 px-3 rounded-xl font-semibold text-center border cursor-pointer transition-all ${
                      indoorOutdoor === setting
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {setting}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Requirements */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Special Requirements & Facilities (Optional)
              </label>
              <textarea
                rows={2}
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                placeholder="e.g. Needs high-wattage power lines, VIP stage couches, and high-gain live broadcast cameras."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
              />
            </div>
          </div>

          {generationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGeneratePlan}
            className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer hover:scale-101 active:scale-99"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Synthesizing Plan & Evaluating Campus Venues...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-indigo-200" />
                <span>Generate Personalized AI Event Plan</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: AI Recommendations Output Display (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {!planResult && !isGenerating && (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-800">Your AI Strategy Workspace</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Configure your event preferences on the left and click <strong>"Generate Personalized AI Event Plan"</strong>. You will receive tailored themes, real campus venue rankings with capacity checks, a customizable agenda, budget breakdowns, and social promotional copy.
                </p>
              </div>

              {savedPlans.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-3">Or continue with one of your saved plans:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {savedPlans.slice(0, 3).map((sp) => (
                      <button
                        key={sp._id}
                        onClick={() => handleLoadSavedPlan(sp)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Bookmark className="w-3 h-3 text-indigo-600" />
                        <span>{sp.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isGenerating && (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-6 shadow-sm">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping opacity-75" />
                <div className="relative w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
                  <Wand2 className="w-8 h-8 animate-spin" />
                </div>
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <h4 className="text-base font-bold text-slate-900">Crafting Your Event Blueprint...</h4>
                <p className="text-xs text-slate-500">
                  Evaluating campus venue capacities, querying date availability, tailoring agendas, and structuring budget allocations.
                </p>
              </div>
            </div>
          )}

          {planResult && !isGenerating && (
            <div className="space-y-6 animate-fade-in">
              {/* Plan Header Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold">
                        {planResult.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                        {planResult.preferences?.duration || duration}
                      </span>
                      {planResult.preferences?.date && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{planResult.preferences.date}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                      {planResult.title}
                    </h3>
                  </div>

                  {/* Top Action Deck */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isSavingPlan}
                      onClick={handleSavePlan}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingPlan ? 'Saving...' : 'Save Plan'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportSummary}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Export Text</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGeneratePlan}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-all cursor-pointer"
                      title="Regenerate with current preferences"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* Primary Booking Conversion Callout */}
                <div className="p-4 bg-linear-to-r from-indigo-50 to-violet-50 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ready to organize this event?</span>
                    </p>
                    <p className="text-[11px] text-indigo-700">
                      Submit as a formal booking request for Administrator approval. Pre-fills title, venue, and date.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBridgeToBooking()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <span>Submit as Booking Request</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Navigation Tabs for Plan Details */}
                <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 gap-1 pt-2">
                  {[
                    { id: 'ideas', label: '1. Concepts & Ideas' },
                    { id: 'venues', label: '2. Campus Venues' },
                    { id: 'schedule', label: '3. Schedule & Agenda' },
                    { id: 'budget', label: '4. Budget Planning' },
                    { id: 'equipment', label: '5. Equipment' },
                    { id: 'promo', label: '6. Social & Promo' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActivePlanTab(tab.id)}
                      className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                        activePlanTab === tab.id
                          ? 'border-indigo-600 text-indigo-600 font-extrabold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB 1: Event Concepts & Ideas */}
                {activePlanTab === 'ideas' && (
                  <div className="space-y-4 pt-2">
                    {(planResult.eventIdeas || []).map((idea, idx) => (
                      <div
                        key={idx}
                        className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600">
                              Concept #{idx + 1}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{idea.title}</h4>
                            {idea.theme && (
                              <p className="text-xs font-medium text-slate-600 italic">
                                Theme: "{idea.theme}"
                              </p>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">{idea.description}</p>

                        {/* Activities */}
                        {idea.activities && idea.activities.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                            <span className="text-[11px] font-bold text-slate-800">
                              Core Event Activities:
                            </span>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {idea.activities.map((act, i) => (
                                <li
                                  key={i}
                                  className="flex items-center gap-2 text-[11px] text-slate-600"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                  <span>{act}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Engagement Tips */}
                        {idea.engagementTips && idea.engagementTips.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>Audience Engagement Pro-Tips:</span>
                            </span>
                            <ul className="space-y-1">
                              {idea.engagementTips.map((tip, i) => (
                                <li key={i} className="text-[11px] text-slate-600 pl-3 border-l-2 border-emerald-400">
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 2: Grounded Real Campus Venues */}
                {activePlanTab === 'venues' && (
                  <div className="space-y-4 pt-2">
                    <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                      <div>
                        <strong>Grounded Real Campus Venues:</strong> Recommended based on your expected attendance ({planResult.preferences?.participants} guests), indoor/outdoor fit, and live date availability.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {(planResult.recommendedVenues || []).map((vrec, idx) => (
                        <div
                          key={vrec.venueId || idx}
                          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start transition-all hover:border-indigo-300 hover:shadow-md"
                        >
                          <img
                            src={vrec.coverImage || getVenueCover(vrec.venueName, vrec.venueId)}
                            alt={vrec.venueName}
                            className="w-full md:w-44 h-32 rounded-xl object-cover shrink-0 border border-slate-100"
                          />

                          <div className="flex-1 space-y-2 w-full">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{vrec.venueName}</span>
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    <span>Max Capacity: {vrec.capacity} seats</span>
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[11px] text-slate-500 capitalize">
                                    {vrec.location_type || 'In Campus'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                    vrec.isAvailable
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {vrec.isAvailable ? '✓ Available on Preferred Date' : '⚠️ Booked on Date'}
                                </span>

                                <div className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold font-mono">
                                  {vrec.matchScore}% Match
                                </div>
                              </div>
                            </div>

                            <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                              <strong>Why this venue fits:</strong> {vrec.suitabilityReason}
                            </p>

                            {vrec.facilities && vrec.facilities.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {vrec.facilities.slice(0, 4).map((f, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px]"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="pt-2 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => handleBridgeToBooking(vrec)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <span>Request This Venue</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: Interactive Event Schedule */}
                {activePlanTab === 'schedule' && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Proposed Timeline & Run of Show:
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {editableSchedule.length} session blocks
                      </span>
                    </div>

                    <div className="space-y-2">
                      {editableSchedule.map((slot, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono font-bold text-[11px] whitespace-nowrap">
                              {slot.time}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{slot.title}</div>
                              {slot.description && (
                                <div className="text-[11px] text-slate-500">{slot.description}</div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveScheduleSlot(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove timeline slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Slot Form */}
                    <form
                      onSubmit={handleAddScheduleSlot}
                      className="p-3.5 bg-slate-100/70 border border-slate-200 rounded-2xl flex flex-col sm:flex-row gap-2 items-center"
                    >
                      <input
                        type="text"
                        placeholder="e.g. 02:00 PM - 03:00 PM"
                        value={newSlotTime}
                        onChange={(e) => setNewSlotTime(e.target.value)}
                        className="w-full sm:w-44 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Session title (e.g. Lightning Pitch Demos)"
                        value={newSlotTitle}
                        onChange={(e) => setNewSlotTitle(e.target.value)}
                        className="w-full flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Slot</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 4: Budget Breakdown */}
                {activePlanTab === 'budget' && (
                  <div className="space-y-4 pt-2">
                    <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          Total Estimated Budget
                        </span>
                        <div className="text-2xl font-bold font-mono text-indigo-300">
                          ₹{Number(planResult.preferences?.budget || budget).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        Tailored for {planResult.preferences?.participants} participants
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(planResult.budgetBreakdown || []).map((item, idx) => {
                        const totalB = Number(planResult.preferences?.budget || budget) || 1;
                        const pct = Math.round((Number(item.estimatedAmount) / totalB) * 100);
                        return (
                          <div
                            key={idx}
                            className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">{item.category}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-800">
                                  ₹{Number(item.estimatedAmount).toLocaleString('en-IN')}
                                </span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  ({pct}%)
                                </span>
                              </div>
                            </div>

                            {/* Visual Progress Bar */}
                            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                              />
                            </div>

                            {item.notes && (
                              <p className="text-[11px] text-slate-500 italic">{item.notes}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 5: Equipment Checklist */}
                {activePlanTab === 'equipment' && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Required Equipment & Facilities Checklist:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Check off items as secured on campus
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(planResult.requiredEquipment || []).map((item, idx) => {
                        const isChecked = Boolean(equipmentChecks[idx]);
                        return (
                          <div
                            key={idx}
                            onClick={() => handleToggleEquip(idx)}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 line-through opacity-80'
                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span className="font-medium">{item}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Custom Equipment Item */}
                    <form
                      onSubmit={handleAddCustomEquip}
                      className="flex gap-2 items-center pt-2"
                    >
                      <input
                        type="text"
                        placeholder="Add another equipment item (e.g. 5x Wireless Presentation Remotes)..."
                        value={newEquipItem}
                        onChange={(e) => setNewEquipItem(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Add Item
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 6: Social & Promotion Studio */}
                {activePlanTab === 'promo' && (
                  <div className="space-y-5 pt-2">
                    {/* Social Captions */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Ready-to-Post Social Media Captions:</span>
                      </span>

                      {(planResult.promotionalCopy?.socialCaptions || []).map((caption, i) => (
                        <div
                          key={i}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              {i === 0 ? 'Instagram & WhatsApp Promo' : i === 1 ? 'Urgency & Ticket Drop' : 'LinkedIn Professional Update'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(caption, `caption_${i}`)}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedSection === `caption_${i}` ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                            {caption}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Poster Content */}
                    {planResult.promotionalCopy?.posterContent && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            Suggested Poster Copy & Highlights:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(planResult.promotionalCopy.posterContent, 'poster')
                            }
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedSection === 'poster' ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="p-3.5 bg-slate-900 text-indigo-200 font-mono text-xs rounded-xl whitespace-pre-line leading-relaxed">
                          {planResult.promotionalCopy.posterContent}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Drawer: My Saved AI Plans */}
      {showSavedDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-left p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">My Saved AI Plans</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingSaved ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Loading saved AI plans...
              </div>
            ) : savedPlans.length === 0 ? (
              <div className="py-16 text-center space-y-2 text-slate-500 text-xs">
                <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No saved AI plans yet.</p>
                <p className="text-[11px] text-slate-400">
                  Generate a plan and click "Save Plan" to store it securely here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {savedPlans.map((sp) => (
                  <div
                    key={sp._id}
                    onClick={() => handleLoadSavedPlan(sp)}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                          {sp.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {sp.title}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedPlan(sp._id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Delete saved plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>{sp.preferences?.participants || 100} guests</span>
                      <span>•</span>
                      <span>₹{Number(sp.preferences?.budget || 20000).toLocaleString('en-IN')}</span>
                      <span>•</span>
                      <span>{sp.preferences?.duration || '4 Hours'}</span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] font-semibold text-indigo-600">
                      <span>Click to load blueprint</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
