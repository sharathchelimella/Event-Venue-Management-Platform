import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import {
  Check,
  X,
  Shield,
  Plus,
  Edit2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Play,
  RotateCw,
  Building2,
  MapPin,
  Users,
  Phone,
  Mail,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Clock,
  DollarSign,
  History,
  Eye,
  Camera,
  Sparkles,
  Calendar,
  Send,
  UserCheck,
} from 'lucide-react';
import { VenueDetailModal } from './VenueDetailModal.jsx';
import { getVenueCover, EVENT_POSTER_PRESETS } from '../utils/imagePlaceholders.js';

export const AdminPortal = ({
  pendingEvents = [],
  venues = [],
  onRefreshPending,
  onRefreshVenues,
  onRefreshFeed,
}) => {
  const [activeSubTab, setActiveSubTab] = useState('pending');

  // Venue creation state
  const [venueName, setVenueName] = useState('');
  const [locationType, setLocationType] = useState('in_campus');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [venueDescription, setVenueDescription] = useState('');
  const [venueCoverImage, setVenueCoverImage] = useState('');
  const [venueFacilities, setVenueFacilities] = useState([
    'Air Conditioning',
    'Projector & Screen',
    'Stage & Sound System',
    'High-Speed Wi-Fi',
  ]);
  const [adminPreviewVenue, setAdminPreviewVenue] = useState(null);
  const [addingVenue, setAddingVenue] = useState(false);
  const [venueError, setVenueError] = useState(null);
  const [venueSuccess, setVenueSuccess] = useState(null);

  // Venue editing state
  const [editingVenueId, setEditingVenueId] = useState(null);
  const [editCapacity, setEditCapacity] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Approval actions state
  const [processingId, setProcessingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // RLS State
  const [rlsPolicies, setRlsPolicies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingRLS, setLoadingRLS] = useState(false);

  // Simulator State
  const [simActor, setSimActor] = useState('Student');
  const [simAction, setSimAction] = useState('APPROVE_REJECT_EVENT');
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Listing & Contact Requests State (Private Admin Inquiries)
  const [contactRequests, setContactRequests] = useState([]);
  const [loadingContactRequests, setLoadingContactRequests] = useState(false);
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');

  // Admin Publish New Event State
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [organizers, setOrganizers] = useState([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState('Hackathon');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventVenueId, setNewEventVenueId] = useState(venues[0]?._id || '');
  const [newEventOrganizerId, setNewEventOrganizerId] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('10:00 AM - 01:00 PM');
  const [newEventPoster, setNewEventPoster] = useState('');
  const [newEventTags, setNewEventTags] = useState('');
  const [publishingEvent, setPublishingEvent] = useState(false);
  const [addEventError, setAddEventError] = useState(null);

  // Load Contact Requests
  const loadContactRequests = async () => {
    setLoadingContactRequests(true);
    try {
      const data = await api.getAdminContactRequests({
        requestType: requestTypeFilter,
        status: requestStatusFilter,
      });
      setContactRequests(data || []);
    } catch (err) {
      console.error('Failed to load contact requests', err);
    } finally {
      setLoadingContactRequests(false);
    }
  };

  // Load Registered Organizers for Event Assignment
  const loadOrganizers = async () => {
    try {
      const data = await api.getAdminOrganizers();
      setOrganizers(data || []);
      if (data && data.length > 0 && !newEventOrganizerId) {
        setNewEventOrganizerId(data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load organizers', err);
    }
  };

  // Venue Listings Submissions State
  const [venueListings, setVenueListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingFilter, setListingFilter] = useState('all');
  const [processingListingId, setProcessingListingId] = useState(null);
  const [moderationModal, setModerationModal] = useState({
    isOpen: false,
    listing: null,
    targetStatus: 'Approved',
    remarks: '',
  });

  // Load Venue Submissions
  const loadVenueListings = async () => {
    setLoadingListings(true);
    try {
      const data = await api.getAdminListings();
      setVenueListings(data || []);
    } catch (err) {
      console.error('Failed to load admin venue listings', err);
    } finally {
      setLoadingListings(false);
    }
  };

  // Load RLS Data
  const loadRLSData = async () => {
    setLoadingRLS(true);
    try {
      const [policies, logs] = await Promise.all([
        api.getRLSPolicies(),
        api.getRLSAuditLogs(),
      ]);
      setRlsPolicies(policies || []);
      setAuditLogs(logs || []);
    } catch (err) {
      console.error('Failed to load RLS policies or audit logs', err);
    } finally {
      setLoadingRLS(false);
    }
  };

  useEffect(() => {
    loadVenueListings();
    loadContactRequests();
    loadOrganizers();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'rls') {
      loadRLSData();
    } else if (activeSubTab === 'venue-requests') {
      loadVenueListings();
    } else if (activeSubTab === 'contact-requests') {
      loadContactRequests();
    }
  }, [activeSubTab, requestTypeFilter, requestStatusFilter]);

  // Update Contact Request Status
  const handleUpdateContactStatus = async (id, status) => {
    setUpdatingRequestId(id);
    try {
      const updated = await api.updateAdminContactRequest(id, { status });
      setContactRequests((prev) => prev.map((r) => (r._id === id ? { ...r, ...updated } : r)));
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingRequestId(null);
    }
  };

  // Save Internal Notes on Contact Request
  const handleSaveNotes = async (id) => {
    try {
      const updated = await api.updateAdminContactRequest(id, { internalNotes: notesDraft });
      setContactRequests((prev) => prev.map((r) => (r._id === id ? { ...r, ...updated } : r)));
      setEditingNotesId(null);
    } catch (err) {
      alert(err.message || 'Failed to save notes');
    }
  };

  // Convert Contact Request into Venue Registration Form
  const handleCreateVenueFromRequest = (req) => {
    setVenueName(req.itemName || '');
    setLocationType(req.location?.toLowerCase().includes('off') ? 'out_campus' : 'in_campus');
    setVenueDescription(req.message || '');
    setActiveSubTab('venues');
  };

  // Convert Contact Request into Event Creation Modal
  const handleCreateEventFromRequest = (req) => {
    setNewEventTitle(req.itemName || '');
    setNewEventDescription(req.message || '');
    setNewEventDate(new Date().toISOString().split('T')[0]);
    setShowAddEventModal(true);
  };

  // Admin Directly Publishes New Event
  const handlePublishAdminEvent = async (e) => {
    e.preventDefault();
    setAddEventError(null);
    if (!newEventTitle.trim() || !newEventDescription.trim() || !newEventVenueId || !newEventDate) {
      setAddEventError('Please fill in title, description, venue, and date.');
      return;
    }
    setPublishingEvent(true);
    try {
      const tags = newEventTags
        ? newEventTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      await api.adminCreateEvent({
        title: newEventTitle.trim(),
        category: newEventCategory,
        description: newEventDescription.trim(),
        venue_id: newEventVenueId,
        organizer_id: newEventOrganizerId || undefined,
        event_date: newEventDate,
        event_time: newEventTime.trim() || undefined,
        posterImage: newEventPoster || undefined,
        tags,
      });
      setShowAddEventModal(false);
      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventPoster('');
      setNewEventTags('');
      setActionMessage({
        type: 'success',
        text: `Event "${newEventTitle.trim()}" published successfully! It is now live on Explore Events and visible in the organizer's dashboard.`,
      });
      await onRefreshPending();
      await onRefreshFeed();
      await onRefreshVenues();
    } catch (err) {
      setAddEventError(err.message || 'Failed to publish event.');
    } finally {
      setPublishingEvent(false);
    }
  };

  const handleUpdateListingStatus = async (listingId, status, remarks = '') => {
    setProcessingListingId(listingId);
    setActionMessage(null);
    try {
      const updated = await api.updateListingStatus(listingId, status, remarks);
      setActionMessage({
        type: 'success',
        text: `Venue "${updated.venueName}" has been updated to "${status}".`,
      });
      setVenueListings((prev) =>
        prev.map((l) => (l._id === listingId ? { ...l, ...updated } : l))
      );
      setModerationModal({ isOpen: false, listing: null, targetStatus: 'Approved', remarks: '' });
      await onRefreshVenues();
      await onRefreshFeed();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to update venue listing status.',
      });
    } finally {
      setProcessingListingId(null);
    }
  };

  const handleApprove = async (event) => {
    setProcessingId(event._id);
    setActionMessage(null);
    try {
      await api.updateEventStatus(event._id, 'Approved');
      setActionMessage({
        type: 'success',
        text: `Approved "${event.title}". It has been published to the student feed!`,
      });
      await onRefreshPending();
      await onRefreshFeed();
      await onRefreshVenues();
      if (activeSubTab === 'rls') loadRLSData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Approval failed.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (event) => {
    setProcessingId(event._id);
    setActionMessage(null);
    try {
      await api.updateEventStatus(event._id, 'Rejected');
      setActionMessage({
        type: 'success',
        text: `Rejected "${event.title}". The venue slot is now freed up for other bookings.`,
      });
      await onRefreshPending();
      await onRefreshFeed();
      await onRefreshVenues();
      if (activeSubTab === 'rls') loadRLSData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Rejection failed.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddVenue = async (e) => {
    e.preventDefault();
    setVenueError(null);
    setVenueSuccess(null);

    const capNum = parseInt(maxCapacity, 10);
    if (!venueName.trim() || isNaN(capNum) || capNum <= 0) {
      setVenueError('Please enter a valid venue name and a positive seating capacity.');
      return;
    }

    setAddingVenue(true);
    try {
      await api.createVenue({
        venue_name: venueName.trim(),
        location_type: locationType,
        max_capacity: capNum,
        description: venueDescription.trim() || undefined,
        coverImage: venueCoverImage.trim() || undefined,
        facilities: venueFacilities,
      });
      setVenueSuccess(`Venue "${venueName.trim()}" created successfully with capacity of ${capNum} seats.`);
      setVenueName('');
      setMaxCapacity('');
      setVenueDescription('');
      setVenueCoverImage('');
      await onRefreshVenues();
      if (activeSubTab === 'rls') loadRLSData();
    } catch (err) {
      setVenueError(err.message || 'Failed to create venue.');
    } finally {
      setAddingVenue(false);
    }
  };

  const startEditCapacity = (venue) => {
    setEditingVenueId(venue._id);
    setEditCapacity(String(venue.max_capacity));
  };

  const handleSaveCapacity = async (venueId) => {
    const capNum = parseInt(editCapacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      alert('Capacity must be a positive integer.');
      return;
    }

    setSavingEdit(true);
    try {
      await api.updateVenue(venueId, { max_capacity: capNum });
      setEditingVenueId(null);
      await onRefreshVenues();
      if (activeSubTab === 'rls') loadRLSData();
    } catch (err) {
      alert(err.message || 'Failed to update capacity.');
    } finally {
      setSavingEdit(false);
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const result = await api.simulateRLS({
        role: simActor,
        action: simAction,
      });
      setSimResult(result);
    } catch (err) {
      alert(err.message || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Campus Administration Console</h2>
            <span className="text-[11px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded font-semibold">
              RLS ENFORCED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Adjudicate event booking requests, manage auditorium capacities, and audit row-level security policies and access logs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Quick Action: Publish New Event */}
          <button
            type="button"
            onClick={() => setShowAddEventModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Publish New Event</span>
          </button>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('pending')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeSubTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Approvals Queue</span>
              {pendingEvents.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-1.5 rounded">
                  {pendingEvents.length}
                </span>
              )}
            </button>

            {/* NEW SUB-TAB: Listing & Contact Requests */}
            <button
              onClick={() => setActiveSubTab('contact-requests')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeSubTab === 'contact-requests'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Listing & Contact Requests</span>
              {contactRequests.filter((r) => r.status === 'New').length > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] font-mono font-bold px-1.5 rounded-full">
                  {contactRequests.filter((r) => r.status === 'New').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('venues')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSubTab === 'venues'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Venues & Capacities
            </button>

            <button
              onClick={() => setActiveSubTab('venue-requests')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeSubTab === 'venue-requests'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Community Spaces</span>
              {venueListings.filter((l) => l.approvalStatus === 'Pending Approval').length > 0 && (
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold px-1.5 rounded">
                  {venueListings.filter((l) => l.approvalStatus === 'Pending Approval').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('rls')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeSubTab === 'rls'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>RLS Security & Audit</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SUB-TAB: VENUE LISTING REQUESTS */}
      {activeSubTab === 'venue-requests' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Venue Listing Requests & Moderation</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {venueListings.length} Submissions
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Review community and partner venue submissions, verify owner identities and safety compliance, and approve or request corrections.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadVenueListings}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title="Refresh Submissions"
              >
                <RotateCw className={`w-4 h-4 ${loadingListings ? 'animate-spin' : ''}`} />
              </button>

              <select
                value={listingFilter}
                onChange={(e) => setListingFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600"
              >
                <option value="all">All Submissions ({venueListings.length})</option>
                <option value="Pending Approval">
                  Pending Approval ({venueListings.filter((l) => l.approvalStatus === 'Pending Approval').length})
                </option>
                <option value="Changes Requested">
                  Changes Requested ({venueListings.filter((l) => l.approvalStatus === 'Changes Requested').length})
                </option>
                <option value="Approved">
                  Approved ({venueListings.filter((l) => l.approvalStatus === 'Approved').length})
                </option>
                <option value="Rejected">
                  Rejected ({venueListings.filter((l) => l.approvalStatus === 'Rejected').length})
                </option>
              </select>
            </div>
          </div>

          {loadingListings ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-44 bg-white border border-slate-200 rounded-2xl" />
              <div className="h-44 bg-white border border-slate-200 rounded-2xl" />
            </div>
          ) : venueListings.filter((l) => listingFilter === 'all' || l.approvalStatus === listingFilter).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-500">
              No venue listing submissions found for the selected filter.
            </div>
          ) : (
            <div className="space-y-6">
              {venueListings
                .filter((l) => listingFilter === 'all' || l.approvalStatus === listingFilter)
                .map((listing) => {
                  const cover =
                    listing.images?.find((img) => img.isCover)?.url ||
                    listing.images?.[0]?.url ||
                    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80';
                  const owner =
                    typeof listing.ownerId === 'object' ? listing.ownerId : null;

                  return (
                    <div
                      key={listing._id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
                        {/* Cover Image & Category */}
                        <div className="lg:col-span-4 space-y-3">
                          <div className="aspect-16/10 rounded-xl overflow-hidden bg-slate-100 relative border border-slate-200">
                            <img
                              src={cover}
                              alt={listing.venueName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                              {listing.category}
                            </div>
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                              {listing.images?.length || 0} photos
                            </div>
                          </div>

                          {/* Owner Profile Badge */}
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">
                              Submitted By / Manager
                            </div>
                            <div className="font-bold text-slate-900">{listing.contactName}</div>
                            <div className="text-[11px] text-slate-600 flex items-center gap-1.5 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <a href={`mailto:${listing.contactEmail}`} className="hover:underline truncate">
                                {listing.contactEmail}
                              </a>
                            </div>
                            <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <a href={`tel:${listing.contactPhone}`} className="hover:underline">
                                {listing.contactPhone}
                              </a>
                            </div>
                            {listing.organizationName && (
                              <div className="text-[10px] text-slate-500 pt-0.5">
                                Org: <span className="font-semibold text-slate-700">{listing.organizationName}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Middle: Venue Details */}
                        <div className="lg:col-span-8 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <h4 className="text-lg font-bold text-slate-900">{listing.venueName}</h4>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                <span>
                                  {listing.city}, {listing.state} ({listing.pinCode})
                                </span>
                                <span>•</span>
                                <span>ID: {(listing._id || '').slice(-6)}</span>
                              </div>
                            </div>

                            <div>
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                  listing.approvalStatus === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : listing.approvalStatus === 'Changes Requested'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : listing.approvalStatus === 'Rejected'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {listing.approvalStatus}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed font-normal">
                            {listing.description}
                          </p>

                          {/* Specifications Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Capacity</div>
                              <div className="font-extrabold text-slate-900 mt-0.5">
                                {listing.capacity} Guests
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Pricing Model</div>
                              <div className="font-extrabold text-slate-900 mt-0.5">
                                {listing.pricing?.pricingType === 'Free' ? (
                                  <span className="text-emerald-600">Free</span>
                                ) : listing.pricing?.pricingType === 'Custom Quote' ? (
                                  <span className="text-indigo-600">Custom</span>
                                ) : (
                                  `₹${Number(listing.pricing?.price || 0).toLocaleString()} / ${listing.pricing?.pricingType?.replace('Per ', '')}`
                                )}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Hours</div>
                              <div className="font-semibold text-slate-800 mt-0.5">
                                {listing.operatingHours?.openingTime} - {listing.operatingHours?.closingTime}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Street Address</div>
                              <div className="font-semibold text-slate-800 mt-0.5 truncate" title={listing.address}>
                                {listing.address}
                              </div>
                            </div>
                          </div>

                          {/* Facilities */}
                          <div className="space-y-1">
                            <div className="text-[11px] font-bold text-slate-500 uppercase">
                              Amenities Provided
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(listing.facilities || []).map((f) => (
                                <span
                                  key={f}
                                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Admin Remarks Callout if existing */}
                          {listing.adminRemarks && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                Current Admin Remarks:
                              </div>
                              <div className="italic text-amber-800">{listing.adminRemarks}</div>
                            </div>
                          )}

                          {/* Change History Log Accordion */}
                          {listing.changeHistory && listing.changeHistory.length > 0 && (
                            <div className="text-xs pt-1">
                              <details className="cursor-pointer group">
                                <summary className="font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
                                  <History className="w-3.5 h-3.5" />
                                  <span>Audit & Change History ({listing.changeHistory.length})</span>
                                </summary>
                                <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-slate-200">
                                  {listing.changeHistory.map((item, idx) => (
                                    <div key={idx} className="text-[11px] text-slate-600">
                                      <span className="font-mono text-slate-400">
                                        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>{' '}
                                      — <span className="font-semibold text-slate-800">{item.action}</span> ({item.performedBy}):{' '}
                                      <span className="text-slate-500">{item.details}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin Action Bar */}
                      <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-slate-500 font-mono">
                          Submitted: {new Date(listing.createdAt).toLocaleDateString()}
                        </div>

                        <div className="flex items-center gap-2">
                          {listing.approvalStatus !== 'Approved' && (
                            <button
                              type="button"
                              disabled={processingListingId === listing._id}
                              onClick={() => handleUpdateListingStatus(listing._id, 'Approved', 'Approved by administrator')}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve Listing</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={processingListingId === listing._id}
                            onClick={() =>
                              setModerationModal({
                                isOpen: true,
                                listing,
                                targetStatus: 'Changes Requested',
                                remarks: listing.adminRemarks || '',
                              })
                            }
                            className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Request Corrections</span>
                          </button>

                          {listing.approvalStatus !== 'Rejected' && (
                            <button
                              type="button"
                              disabled={processingListingId === listing._id}
                              onClick={() =>
                                setModerationModal({
                                  isOpen: true,
                                  listing,
                                  targetStatus: 'Rejected',
                                  remarks: listing.adminRemarks || '',
                                })
                              }
                              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject Submission</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Admin Moderation Remarks Modal */}
          {moderationModal.isOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    {moderationModal.targetStatus === 'Changes Requested'
                      ? 'Request Corrections from Venue Owner'
                      : 'Reject Venue Listing'}
                  </h4>
                  <button
                    onClick={() =>
                      setModerationModal({ isOpen: false, listing: null, targetStatus: 'Approved', remarks: '' })
                    }
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed">
                  Provide detailed feedback or instructions for the venue owner of{' '}
                  <span className="font-bold text-slate-900">{moderationModal.listing?.venueName}</span>. This message will be displayed prominently on their listing dashboard.
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Administrator Remarks / Required Changes <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Please update your pricing policy to reflect per-day rates, or upload higher quality photos of the stage layout."
                    value={moderationModal.remarks}
                    onChange={(e) =>
                      setModerationModal((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 resize-y"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setModerationModal({ isOpen: false, listing: null, targetStatus: 'Approved', remarks: '' })
                    }
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={!moderationModal.remarks.trim()}
                    onClick={() =>
                      handleUpdateListingStatus(
                        moderationModal.listing._id,
                        moderationModal.targetStatus,
                        moderationModal.remarks
                      )
                    }
                    className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 ${
                      moderationModal.targetStatus === 'Changes Requested'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    Submit {moderationModal.targetStatus}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: LISTING & CONTACT REQUESTS (PRIVATE ADMIN INQUIRIES) */}
      {activeSubTab === 'contact-requests' && (
        <div className="space-y-6">
          {/* Header & KPI Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>Private Listing & Contact Requests</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct requests submitted by users wishing to list a venue, submit event details, or general inquiries. Review details and convert them into official venues or events.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadContactRequests}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Refresh Requests</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 font-medium block">Total Inquiries</span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  {contactRequests.length}
                </span>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-indigo-700 font-medium block">New / Unread</span>
                <span className="text-xl font-bold font-mono text-indigo-950 mt-1 block">
                  {contactRequests.filter((r) => r.status === 'New').length}
                </span>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <span className="text-purple-700 font-medium block">Under Review</span>
                <span className="text-xl font-bold font-mono text-purple-950 mt-1 block">
                  {contactRequests.filter((r) => r.status === 'Under Review').length}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-emerald-700 font-medium block">Contacted / Handled</span>
                <span className="text-xl font-bold font-mono text-emerald-950 mt-1 block">
                  {contactRequests.filter((r) => r.status === 'Completed' || r.status === 'Contacted').length}
                </span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider shrink-0">
                  Filter:
                </span>
                {['all', 'List a Property', 'Submit Event Details', 'General Inquiry'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setRequestTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      requestTypeFilter === t
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t === 'all' ? 'All Types' : t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider shrink-0">
                  Status:
                </span>
                <select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-indigo-600"
                >
                  <option value="all">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* List of Requests */}
          {loadingContactRequests ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading requests...
            </div>
          ) : contactRequests.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
              No private listing or contact requests found for this filter.
            </div>
          ) : (
            <div className="space-y-4">
              {contactRequests.map((req) => (
                <div
                  key={req._id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                >
                  {/* Top Bar: Sender identity, type badge, status dropdown, date */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {req.name ? req.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{req.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              req.requestType === 'List a Property'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : req.requestType === 'Submit Event Details'
                                ? 'bg-violet-50 text-violet-700 border border-violet-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {req.requestType}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Submitted: {new Date(req.createdAt).toLocaleString()}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">ID: {(req._id || '').slice(-6)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Changer */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">Status:</span>
                      <select
                        value={req.status}
                        disabled={updatingRequestId === req._id}
                        onChange={(e) => handleUpdateContactStatus(req._id, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl border transition-colors cursor-pointer ${
                          req.status === 'New'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : req.status === 'Under Review'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : req.status === 'Contacted'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : req.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <option value="New">New</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Completed">Completed</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {/* Property / Event Title & Location Banner */}
                  {(req.itemName || req.location) && (
                    <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      {req.itemName && (
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{req.itemName}</span>
                        </div>
                      )}
                      {req.location && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.location}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message body */}
                  <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                    <p className="font-medium text-slate-500 text-[10px] uppercase mb-1">
                      User Message / Description:
                    </p>
                    <p className="whitespace-pre-wrap">{req.message}</p>
                  </div>

                  {/* Contact channels & Conversion actions */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 text-xs">
                    {/* Direct Contact Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`mailto:${req.email}?subject=Regarding your EventSphere Request (${req.itemName || req.requestType})`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Email: {req.email}</span>
                      </a>

                      <a
                        href={`tel:${req.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Call: {req.phone}</span>
                      </a>

                      {req.phone && (
                        <a
                          href={`https://wa.me/${req.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-xl transition-colors border border-emerald-200"
                        >
                          <span>WhatsApp</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* One-click conversion action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {req.requestType === 'List a Property' && (
                        <button
                          type="button"
                          onClick={() => handleCreateVenueFromRequest(req)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Create Venue from Request</span>
                        </button>
                      )}

                      {req.requestType === 'Submit Event Details' && (
                        <button
                          type="button"
                          onClick={() => handleCreateEventFromRequest(req)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Publish Event from Request</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Internal Notes Row */}
                  <div className="pt-2 border-t border-slate-100">
                    {editingNotesId === req._id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="Add internal notes visible only to administrators..."
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="px-2.5 py-1 text-[11px] text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(req._id)}
                            className="px-3 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="text-slate-500">
                          <span className="font-semibold text-slate-700">Internal Notes: </span>
                          <span>{req.internalNotes || 'No notes added yet.'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNotesId(req._id);
                            setNotesDraft(req.internalNotes || '');
                          }}
                          className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                        >
                          {req.internalNotes ? 'Edit Note' : '+ Add Note'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 1: PENDING APPROVALS QUEUE */}
      {activeSubTab === 'pending' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pending Event Booking Requests</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Approve to publish to the public student feed, or reject to immediately release the venue slot.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {pendingEvents.length} awaiting review
            </span>
          </div>

          {pendingEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              All caught up! There are no pending venue booking requests requiring review.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Event Title & Details</th>
                    <th className="py-2.5 px-3">Organizer</th>
                    <th className="py-2.5 px-3">Venue Requested</th>
                    <th className="py-2.5 px-3">Scheduled Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingEvents.map((event) => {
                    const venue =
                      typeof event.venue_id === 'object' ? event.venue_id : null;
                    const organizer =
                      typeof event.organizer_id === 'object' ? event.organizer_id : null;

                    return (
                      <tr key={event._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 max-w-sm">{event.title}</div>
                          <div className="text-[11px] text-slate-500">
                            {event.category} · {event.description.slice(0, 70)}...
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900">{organizer?.name || 'Organizer'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{organizer?.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900">{venue?.venue_name || 'Venue'}</div>
                          <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                            {venue?.max_capacity} Max Seats ({venue?.location_type === 'out_campus' ? 'Off-Campus' : 'In-Campus'})
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 tabular-nums font-medium">
                          {event.event_date}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(event)}
                              disabled={processingId === event._id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(event)}
                              disabled={processingId === event._id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md transition-colors disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: VENUES & CAPACITIES */}
      {activeSubTab === 'venues' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Add Venue Form */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Plus className="w-4 h-4 text-slate-900" />
              <h3 className="text-sm font-bold text-slate-900">Add New Campus Venue</h3>
            </div>

            {venueError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{venueError}</span>
              </div>
            )}

            {venueSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{venueSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddVenue} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Venue Name *</label>
                <input
                  type="text"
                  required
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. Science Complex Lecture Hall"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location Type *</label>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-slate-900"
                >
                  <option value="in_campus">In-Campus Facility</option>
                  <option value="out_campus">Out-of-Campus Facility</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Maximum Seating Capacity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  placeholder="e.g. 450"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-900 font-mono"
                />
              </div>

              {/* Cover Image URL / Preset */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">Cover Image URL</label>
                <input
                  type="url"
                  value={venueCoverImage}
                  onChange={(e) => setVenueCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-900 font-mono"
                />
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-slate-400 block w-full">Quick Preset Images:</span>
                  {[
                    { label: 'Auditorium', url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80' },
                    { label: 'Seminar Hall', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80' },
                    { label: 'Outdoor Ground', url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setVenueCoverImage(p.url)}
                      className={`px-2 py-0.5 rounded text-[10px] border ${
                        venueCoverImage === p.url
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Venue Description</label>
                <textarea
                  rows={2}
                  value={venueDescription}
                  onChange={(e) => setVenueDescription(e.target.value)}
                  placeholder="Features, audio-visual infrastructure, climate control..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-900"
                />
              </div>

              {/* Facilities checkboxes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Facilities Provided</label>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {[
                    'Air Conditioning',
                    'Projector & Screen',
                    'Stage & Sound System',
                    'High-Speed Wi-Fi',
                    'Tiered Seating',
                    'Podium & Wireless Mics',
                  ].map((fac) => (
                    <label key={fac} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={venueFacilities.includes(fac)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVenueFacilities((prev) => [...prev, fac]);
                          } else {
                            setVenueFacilities((prev) => prev.filter((f) => f !== fac));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-slate-700 truncate">{fac}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={addingVenue}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {addingVenue ? 'Adding Venue...' : 'Register Venue'}
              </button>
            </form>
          </div>

          {/* Right: Existing Venues */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Campus Venues Registry</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current facilities, capacities, cover photos, and active booking dates.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {venues.length} venues configured
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Venue & Photo</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Max Capacity</th>
                    <th className="py-2.5 px-3">Reserved Dates</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venues.map((venue) => {
                    const isEditing = editingVenueId === venue._id;
                    const cover =
                      venue.coverImage ||
                      (venue.images && venue.images[0]?.url) ||
                      getVenueCover(venue);

                    return (
                      <tr key={venue._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={cover}
                              alt={venue.venue_name}
                              className="w-12 h-9 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">
                                {venue.venue_name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                ID: {(venue._id || '').slice(-6)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 capitalize">
                          {venue.location_type === 'out_campus' ? 'Off-Campus' : 'In-Campus'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-800 tabular-nums">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                value={editCapacity}
                                onChange={(e) => setEditCapacity(e.target.value)}
                                className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                              />
                              <button
                                onClick={() => handleSaveCapacity(venue._id)}
                                disabled={savingEdit}
                                className="px-2 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingVenueId(null)}
                                className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span>{venue.max_capacity} Seats</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {venue.booked_dates && venue.booked_dates.length > 0 ? (
                            <span className="font-mono text-[11px] text-slate-600">
                              {venue.booked_dates.length} date{venue.booked_dates.length === 1 ? '' : 's'} scheduled
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No active bookings</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setAdminPreviewVenue(venue)}
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Details</span>
                            </button>
                            {!isEditing && (
                              <button
                                onClick={() => startEditCapacity(venue)}
                                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: ROW-LEVEL SECURITY (RLS) & AUDIT CONSOLE */}
      {activeSubTab === 'rls' && (
        <div className="space-y-8">
          {/* Section A: Policy Simulator */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">Interactive RLS Policy Simulator</h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Test row-level permission outcomes across user personas and actions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Persona / Role</label>
                <select
                  value={simActor}
                  onChange={(e) => setSimActor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Student">Student (Alex Rivera)</option>
                  <option value="Organizer">Event Organizer (Priya Sharma)</option>
                  <option value="Admin">Campus Administrator (Dean Office)</option>
                  <option value="Guest">Anonymous Guest</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Target Operation / Action</label>
                <div className="flex gap-2">
                  <select
                    value={simAction}
                    onChange={(e) => setSimAction(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="APPROVE_REJECT_EVENT">Approve / Reject Event Booking</option>
                    <option value="VIEW_ATTENDEE_ROSTER">View Private Attendee Contact Roster</option>
                    <option value="SUBMIT_EVENT_REQUEST">Submit Venue Booking Request</option>
                    <option value="CREATE_VENUE">Create New Campus Venue</option>
                    <option value="EDIT_VENUE_CAPACITY">Modify Venue Max Capacity</option>
                    <option value="CANCEL_ANOTHER_STUDENT_PASS">Cancel Another Student's Reserved Pass</option>
                    <option value="VIEW_APPROVED_EVENTS">Browse Approved Campus Events Feed</option>
                  </select>
                  <button
                    onClick={runSimulation}
                    disabled={simulating}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg flex items-center gap-1.5 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Evaluate</span>
                  </button>
                </div>
              </div>
            </div>

            {simResult && (
              <div
                className={`p-4 rounded-xl border mt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                  simResult.outcome === 'ALLOWED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        simResult.outcome === 'ALLOWED'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-rose-700 text-white'
                      }`}
                    >
                      {simResult.outcome}
                    </span>
                    <span className="font-semibold text-slate-900">
                      Rule: {simResult.ruleId}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{simResult.reason}</p>
                </div>
                <div className="font-mono text-[11px] bg-white/80 p-2 rounded border border-slate-200 shrink-0 text-slate-600">
                  Predicate: {simResult.predicate}
                </div>
              </div>
            )}
          </div>

          {/* Section B: Active RLS Policies Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Row-Level Security Policies</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-configured predicates executed on all database queries and mutations.
                </p>
              </div>
              <button
                onClick={loadRLSData}
                disabled={loadingRLS}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingRLS ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Policy ID</th>
                    <th className="py-2.5 px-3">Collection</th>
                    <th className="py-2.5 px-3">Operation</th>
                    <th className="py-2.5 px-3">Permitted Roles</th>
                    <th className="py-2.5 px-3">Enforced Predicate</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rlsPolicies.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">{p.id}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{p.collection}</td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
                          {p.operation}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {p.permittedRoles.join(', ')}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 max-w-xs">
                        {p.predicateDescription}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section C: Real-Time Security Audit Log */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Security Audit Logs</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recent access evaluations, permission grants, and intercepted unauthorized attempts.
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {auditLogs.length} events logged
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No security audit records logged yet. Operations will appear here in real time.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-white shadow-xs">
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Actor & Role</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Collection</th>
                      <th className="py-2.5 px-3">Outcome</th>
                      <th className="py-2.5 px-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500 text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{log.actor}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{log.actorRole}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">{log.action}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{log.collection}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              log.outcome === 'ALLOWED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {log.outcome}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-sm truncate text-[11px]">
                          {log.reason || log.predicate}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Venue Detail Inspection Modal */}
      {adminPreviewVenue && (
        <VenueDetailModal
          venue={adminPreviewVenue}
          isOpen={Boolean(adminPreviewVenue)}
          onClose={() => setAdminPreviewVenue(null)}
        />
      )}

      {/* Admin Publish New Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-scaleIn space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Publish New Event (Administrator)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Directly publish an event to public event discovery and automatically assign it to an organizer club account.
            </p>

            {addEventError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{addEventError}</span>
              </div>
            )}

            <form onSubmit={handlePublishAdminEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Annual Campus Technology Expo 2026"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value)}
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
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    placeholder="e.g. 10:00 AM - 01:00 PM"
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Venue *</label>
                  <select
                    value={newEventVenueId}
                    onChange={(e) => setNewEventVenueId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    {venues.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.venue_name} ({v.max_capacity} Seats)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign Organizer *</label>
                  <select
                    value={newEventOrganizerId}
                    onChange={(e) => setNewEventOrganizerId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                  >
                    {organizers.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.name} ({o.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Date *</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                />
              </div>

              {/* Poster Presets & URL */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="block font-semibold text-slate-700">Poster Image URL or Preset</label>
                <input
                  type="url"
                  value={newEventPoster}
                  onChange={(e) => setNewEventPoster(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono"
                />
                <div className="flex flex-wrap gap-1">
                  {Object.entries(EVENT_POSTER_PRESETS).map(([name, url]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setNewEventPoster(url)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        newEventPoster === url
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  placeholder="Outline program schedule, speakers, and instructions..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tags (Comma Separated)</label>
                <input
                  type="text"
                  value={newEventTags}
                  onChange={(e) => setNewEventTags(e.target.value)}
                  placeholder="e.g. AI, Exhibition, Free Passes"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishingEvent}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {publishingEvent ? 'Publishing...' : 'Publish & Broadcast Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
