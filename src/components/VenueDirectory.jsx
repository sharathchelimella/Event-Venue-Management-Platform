import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Search,
  Building2,
  MapPin,
  ExternalLink,
  Sparkles,
  Layers,
  DollarSign,
  Plus,
} from 'lucide-react';
import { api } from '../services/api.js';
import { VenueDetailModal } from './VenueDetailModal.jsx';

export const VenueDirectory = ({
  venues = [],
  onRequestBooking,
  canBook = false,
  currentUser = null,
  onOpenListVenue,
}) => {
  const [activeDirectoryTab, setActiveDirectoryTab] = useState('all'); // 'all' | 'campus' | 'community'
  const [filterType, setFilterType] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [communityListings, setCommunityListings] = useState([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [selectedVenueModal, setSelectedVenueModal] = useState(null);

  // Load Approved Community Venue Listings
  const loadCommunityListings = async () => {
    setLoadingCommunity(true);
    try {
      const data = await api.getApprovedListings();
      setCommunityListings(data || []);
    } catch (err) {
      console.error('Failed to load community listings', err);
    } finally {
      setLoadingCommunity(false);
    }
  };

  useEffect(() => {
    loadCommunityListings();
  }, []);

  // Filter Campus Venues
  const filteredCampusVenues = venues.filter((venue) => {
    const matchesType =
      filterType === 'all' || venue.location_type === filterType;
    const matchesSearch = (venue.venue_name || '')
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Filter Community Listings
  const filteredCommunityVenues = communityListings.filter((listing) => {
    const matchesCategory =
      categoryFilter === 'all' || listing.category === categoryFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      (listing.venueName || '').toLowerCase().includes(q) ||
      (listing.city || '').toLowerCase().includes(q) ||
      (listing.description || '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Directory Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              EventSphere Venues Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {venues.length + communityListings.length} Total Spaces
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Explore university auditoriums, modern seminar halls, banquet centers, and open outdoor grounds for college fests, hackathons, and corporate conventions.
          </p>
        </div>

        {onOpenListVenue && (
          <button
            onClick={onOpenListVenue}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>List Your Venue</span>
          </button>
        )}
      </div>

      {/* Directory Sub-tabs: All vs Campus vs Community Listed */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveDirectoryTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeDirectoryTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            All Spaces ({venues.length + communityListings.length})
          </button>
          <button
            onClick={() => setActiveDirectoryTab('community')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeDirectoryTab === 'community'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Community & Partner Spaces ({communityListings.length})</span>
          </button>
          <button
            onClick={() => setActiveDirectoryTab('campus')}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeDirectoryTab === 'campus'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            Campus Auditoriums ({venues.length})
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-3">
          {activeDirectoryTab === 'community' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600"
            >
              <option value="all">All Categories</option>
              <option value="Auditorium">Auditorium</option>
              <option value="Banquet Hall">Banquet Hall</option>
              <option value="Conference Hall">Conference Hall</option>
              <option value="Seminar Hall">Seminar Hall</option>
              <option value="Outdoor Space">Outdoor Space</option>
              <option value="Other">Other</option>
            </select>
          )}

          {activeDirectoryTab === 'campus' && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                  filterType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('in_campus')}
                className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                  filterType === 'in_campus' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                In-Campus
              </button>
              <button
                onClick={() => setFilterType('out_campus')}
                className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                  filterType === 'out_campus' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Off-Campus
              </button>
            </div>
          )}

          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by venue or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:border-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: COMMUNITY & PARTNER SPACES */}
      {(activeDirectoryTab === 'all' || activeDirectoryTab === 'community') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Community & Partner Venues
              </h2>
              <span className="text-xs text-slate-400">({filteredCommunityVenues.length})</span>
            </div>
            {communityListings.length > 0 && activeDirectoryTab === 'all' && (
              <button
                onClick={() => setActiveDirectoryTab('community')}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                View all community spaces →
              </button>
            )}
          </div>

          {filteredCommunityVenues.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500">
              No community venues found matching your criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCommunityVenues.map((listing) => {
                const cover =
                  listing.images?.find((img) => img.isCover)?.url ||
                  listing.images?.[0]?.url ||
                  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80';

                return (
                  <div
                    key={listing._id}
                    onClick={() => setSelectedVenueModal(listing)}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-16/10 w-full relative overflow-hidden bg-slate-950">
                        <img
                          src={cover}
                          alt={listing.venueName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3 h-3" />
                          PARTNER LISTED
                        </div>
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                          {listing.category}
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                              {listing.venueName}
                            </h3>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {listing.city}, {listing.state}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {listing.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800">
                              {listing.capacity} Guests
                            </span>
                          </div>
                          <div className="text-right truncate font-bold text-slate-900">
                            {listing.pricing?.pricingType === 'Free' ? (
                              <span className="text-emerald-600">Free</span>
                            ) : listing.pricing?.pricingType === 'Custom Quote' ? (
                              <span className="text-indigo-600">Custom Quote</span>
                            ) : (
                              `₹${Number(listing.pricing?.price || 0).toLocaleString()} / ${listing.pricing?.pricingType?.replace('Per ', '')}`
                            )}
                          </div>
                        </div>

                        {/* Facilities tags */}
                        <div className="flex flex-wrap gap-1">
                          {(listing.facilities || []).slice(0, 3).map((f) => (
                            <span
                              key={f}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700"
                            >
                              {f}
                            </span>
                          ))}
                          {(listing.facilities || []).length > 3 && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                              +{listing.facilities.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Click for details & booking</span>
                      <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
                        Inquire Now →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: CAMPUS MANAGED VENUES */}
      {(activeDirectoryTab === 'all' || activeDirectoryTab === 'campus') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700" />
                Campus Auditoriums & Seminar Halls
              </h2>
              <span className="text-xs text-slate-400">({filteredCampusVenues.length})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampusVenues.map((venue) => {
              const bookedCount = venue.booked_dates ? venue.booked_dates.length : 0;

              return (
                <div
                  key={venue._id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span className="font-semibold text-slate-900 capitalize">
                        {venue.location_type === 'out_campus' ? 'Off-Campus Facility' : 'In-Campus Facility'}
                      </span>
                      <span className="font-mono tabular-nums text-slate-400">ID: {(venue._id || '').slice(-6)}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-3">
                      {venue.venue_name}
                    </h3>

                    <div className="space-y-2 text-xs mb-4">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-slate-600 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Seating Capacity:
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {(venue.max_capacity || 0).toLocaleString()} Seats
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div className="flex items-center justify-between mb-1 text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Upcoming Booked Dates:
                          </span>
                          <span className="font-mono tabular-nums font-semibold text-slate-900">
                            {bookedCount}
                          </span>
                        </div>

                        {venue.booked_dates && venue.booked_dates.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {venue.booked_dates.map((d) => (
                              <span
                                key={d}
                                className="font-mono text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                            Open availability across all upcoming dates
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {canBook && onRequestBooking && (
                    <button
                      onClick={onRequestBooking}
                      className="w-full mt-2 py-2 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors text-center"
                    >
                      Book Auditorium
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Public Venue Detail Modal */}
      {selectedVenueModal && (
        <VenueDetailModal
          venue={selectedVenueModal}
          isOpen={Boolean(selectedVenueModal)}
          onClose={() => setSelectedVenueModal(null)}
          currentUser={currentUser}
          onInquirySent={(msg) => {
            // Optional feedback
          }}
        />
      )}
    </div>
  );
};
