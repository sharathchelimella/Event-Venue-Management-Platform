import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { IEvent, IVenue } from '../types/index.ts';
import {
  Check,
  X,
  Shield,
  Building2,
  Plus,
  Edit2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCw,
  Lock,
  ListFilter,
} from 'lucide-react';

interface AdminPortalProps {
  pendingEvents: IEvent[];
  venues: IVenue[];
  onRefreshPending: () => Promise<void>;
  onRefreshVenues: () => Promise<void>;
  onRefreshFeed: () => Promise<void>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  pendingEvents,
  venues,
  onRefreshPending,
  onRefreshVenues,
  onRefreshFeed,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'venues' | 'rls'>('pending');

  // Venue creation state
  const [venueName, setVenueName] = useState('');
  const [locationType, setLocationType] = useState<'in_campus' | 'out_campus'>('in_campus');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [addingVenue, setAddingVenue] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [venueSuccess, setVenueSuccess] = useState<string | null>(null);

  // Venue editing state
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [editCapacity, setEditCapacity] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Approval actions state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // RLS State
  const [rlsPolicies, setRlsPolicies] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingRLS, setLoadingRLS] = useState(false);

  // Simulator State
  const [simActor, setSimActor] = useState<'Student' | 'Organizer' | 'Admin' | 'Guest'>('Student');
  const [simAction, setSimAction] = useState<string>('APPROVE_REJECT_EVENT');
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Load RLS Data
  const loadRLSData = async () => {
    setLoadingRLS(true);
    try {
      const [policies, logs] = await Promise.all([
        api.getRLSPolicies(),
        api.getRLSAuditLogs(),
      ]);
      setRlsPolicies(policies);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to load RLS policies or audit logs', err);
    } finally {
      setLoadingRLS(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'rls') {
      loadRLSData();
    }
  }, [activeSubTab]);

  const handleApprove = async (event: IEvent) => {
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
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Approval failed.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (event: IEvent) => {
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
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Rejection failed.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddVenue = async (e: React.FormEvent) => {
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
      await api.createVenue(venueName.trim(), locationType, capNum);
      setVenueSuccess(`Venue "${venueName.trim()}" created successfully with capacity of ${capNum} seats.`);
      setVenueName('');
      setMaxCapacity('');
      await onRefreshVenues();
      if (activeSubTab === 'rls') loadRLSData();
    } catch (err: any) {
      setVenueError(err.message || 'Failed to create venue.');
    } finally {
      setAddingVenue(false);
    }
  };

  const startEditCapacity = (venue: IVenue) => {
    setEditingVenueId(venue._id);
    setEditCapacity(String(venue.max_capacity));
  };

  const handleSaveCapacity = async (venueId: string) => {
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
    } catch (err: any) {
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
    } catch (err: any) {
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

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
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
          {/* Left: Add Venue Form (4 cols) */}
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
                  onChange={(e) => setLocationType(e.target.value as 'in_campus' | 'out_campus')}
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

              <button
                type="submit"
                disabled={addingVenue}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {addingVenue ? 'Adding Venue...' : 'Register Venue'}
              </button>
            </form>
          </div>

          {/* Right: Existing Venues & Capacity Control Table (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Campus Venues Registry</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current facilities, capacities, and active booking dates.
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
                    <th className="py-2.5 px-3">Venue Name</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Max Capacity</th>
                    <th className="py-2.5 px-3">Reserved Dates</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venues.map((venue) => {
                    const isEditing = editingVenueId === venue._id;

                    return (
                      <tr key={venue._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {venue.venue_name}
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
                          {!isEditing && (
                            <button
                              onClick={() => startEditCapacity(venue)}
                              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit Limit</span>
                            </button>
                          )}
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
                  onChange={(e) => setSimActor(e.target.value as any)}
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

            {/* Simulation Evaluation Result Card */}
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
    </div>
  );
};
