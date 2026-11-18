import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Users,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../services/api.js';

export const MyListings = ({
  currentUser,
  onAddNewVenue,
  onEditVenue,
  onViewVenueDetails,
}) => {
  const [activeTab, setActiveTab] = useState('venues'); // 'venues' | 'inquiries'
  const [listings, setListings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [userListings, userInquiries] = await Promise.all([
        api.getMyListings(),
        api.getMyInquiries(),
      ]);
      setListings(userListings || []);
      setInquiries(userInquiries || []);
    } catch (err) {
      console.error('Failed to load listings/inquiries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (listingId, venueName) => {
    if (!window.confirm(`Are you sure you want to delete "${venueName}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(listingId);
    try {
      await api.deleteListing(listingId);
      setListings((prev) => prev.filter((l) => l._id !== listingId));
    } catch (err) {
      alert(err.message || 'Failed to delete listing.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleInquiryStatusChange = async (inquiryId, newStatus) => {
    try {
      const updated = await api.updateInquiryStatus(inquiryId, newStatus);
      setInquiries((prev) =>
        prev.map((i) => (i._id === inquiryId ? { ...i, status: updated.status } : i))
      );
    } catch (err) {
      alert(err.message || 'Failed to update inquiry status.');
    }
  };

  const filteredListings = listings.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.approvalStatus === statusFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved & Live
          </span>
        );
      case 'Changes Requested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
            Changes Requested
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      case 'Pending Approval':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Approval
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              My Venue Listings
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {listings.length} {listings.length === 1 ? 'Venue' : 'Venues'} Listed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor administrative approvals, update your property details, and handle incoming booking inquiries from campus organizers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh Listings"
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onAddNewVenue}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            List Another Venue
          </button>
        </div>
      </div>

      {/* Tabs Row: My Venues vs Inquiries */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('venues')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'venues'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            My Venues ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'inquiries'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Inquiries Received</span>
            {inquiries.filter((i) => i.status === 'New').length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-mono px-1.5 rounded-full">
                {inquiries.filter((i) => i.status === 'New').length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'venues' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600"
            >
              <option value="all">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Changes Requested">Changes Requested</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {/* VENUES LIST TAB */}
      {activeTab === 'venues' && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
              <div className="h-64 bg-slate-200 rounded-2xl" />
              <div className="h-64 bg-slate-200 rounded-2xl" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No venue listings found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {statusFilter !== 'all'
                    ? `You don't have any venues with "${statusFilter}" status.`
                    : "You haven't listed any venues yet. Submit your first space to connect with organizers!"}
                </p>
              </div>
              <button
                onClick={onAddNewVenue}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                List Your First Venue
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredListings.map((listing) => {
                const cover =
                  listing.images?.find((img) => img.isCover)?.url ||
                  listing.images?.[0]?.url ||
                  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80';

                return (
                  <div
                    key={listing._id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Photo Banner with Badges */}
                      <div className="aspect-16/9 w-full relative overflow-hidden bg-slate-100">
                        <img
                          src={cover}
                          alt={listing.venueName}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3">{getStatusBadge(listing.approvalStatus)}</div>
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                          {listing.category}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 space-y-4">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-slate-900 truncate">
                              {listing.venueName}
                            </h3>
                            <span className="text-xs font-bold text-slate-900 shrink-0">
                              {listing.pricing?.pricingType === 'Free' ? (
                                <span className="text-emerald-600">Free</span>
                              ) : listing.pricing?.pricingType === 'Custom Quote' ? (
                                <span className="text-indigo-600">Custom Quote</span>
                              ) : (
                                `₹${Number(listing.pricing?.price || 0).toLocaleString()} / ${listing.pricing?.pricingType?.replace('Per ', '')}`
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {listing.description}
                          </p>
                        </div>

                        {/* Specs Bar */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                          <div className="flex items-center gap-1.5 truncate">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{listing.capacity} Seats</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {listing.operatingHours?.openingTime} - {listing.operatingHours?.closingTime}
                            </span>
                          </div>
                        </div>

                        {/* Admin Remarks Notice if rejected or changes requested */}
                        {listing.adminRemarks &&
                          (listing.approvalStatus === 'Changes Requested' ||
                            listing.approvalStatus === 'Rejected') && (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                Administrator Feedback / Required Changes:
                              </div>
                              <div className="italic text-amber-800 leading-snug">
                                "{listing.adminRemarks}"
                              </div>
                            </div>
                          )}

                        {/* Facilities summary */}
                        <div className="flex flex-wrap gap-1">
                          {(listing.facilities || []).slice(0, 4).map((f) => (
                            <span
                              key={f}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700"
                            >
                              {f}
                            </span>
                          ))}
                          {(listing.facilities || []).length > 4 && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                              +{listing.facilities.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditVenue(listing)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 shadow-2xs transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Listing
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === listing._id}
                          onClick={() => handleDelete(listing._id, listing.venueName)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onViewVenueDetails(listing)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        <span>View Page</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* INQUIRIES TAB */}
      {activeTab === 'inquiries' && (
        <div className="space-y-4">
          {inquiries.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Inquiries Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When campus students, organizers, or external planners send booking inquiries through your venue page, they will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inq) => {
                const venueName =
                  typeof inq.listingId === 'object' ? inq.listingId?.venueName : 'Venue';

                return (
                  <div
                    key={inq._id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                          Inquiry for: {venueName}
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-0.5">
                          {inq.senderName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {new Date(inq.createdAt).toLocaleDateString()}
                        </span>
                        <select
                          value={inq.status}
                          onChange={(e) => handleInquiryStatusChange(inq._id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            inq.status === 'New'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : inq.status === 'Contacted'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : inq.status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="New">🟡 New Inquiry</option>
                          <option value="Contacted">🔵 Contacted</option>
                          <option value="Resolved">🟢 Resolved / Booked</option>
                          <option value="Archived">⚪ Archived</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <a
                          href={`mailto:${inq.senderEmail}`}
                          className="text-indigo-600 hover:underline truncate"
                        >
                          {inq.senderEmail}
                        </a>
                      </div>
                      {inq.senderPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <a href={`tel:${inq.senderPhone}`} className="text-slate-800">
                            {inq.senderPhone}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Date: {inq.eventDate}</span>
                        <span>({inq.guestCount} guests)</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                      <div className="font-semibold text-slate-900 mb-1">Inquiry Message:</div>
                      <div className="leading-relaxed whitespace-pre-line">{inq.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
