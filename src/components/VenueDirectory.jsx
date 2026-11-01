import React, { useState } from 'react';
import { Users, Calendar, Search } from 'lucide-react';

export const VenueDirectory = ({
  venues = [],
  onRequestBooking,
  canBook = false,
}) => {
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  const filteredVenues = venues.filter((venue) => {
    const matchesType =
      filterType === 'all' || venue.location_type === filterType;
    const matchesSearch = (venue.venue_name || '')
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Campus Venues Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore auditoriums, grounds, and seminar halls with seating capacities and booked schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Venues
            </button>
            <button
              onClick={() => setFilterType('in_campus')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'in_campus' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              In-Campus
            </button>
            <button
              onClick={() => setFilterType('out_campus')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterType === 'out_campus' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Off-Campus
            </button>
          </div>

          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVenues.map((venue) => {
          const bookedCount = venue.booked_dates ? venue.booked_dates.length : 0;

          return (
            <div
              key={venue._id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-xs"
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
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Seating Capacity:
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {(venue.max_capacity || 0).toLocaleString()} Seats
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
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
                  className="w-full mt-2 py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors text-center"
                >
                  Request This Venue
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
