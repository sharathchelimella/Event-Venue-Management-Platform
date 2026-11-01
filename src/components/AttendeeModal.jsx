import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { X, Users, Download, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export const AttendeeModal = ({ event, onClose }) => {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!event) return;
    setLoading(true);
    setError(null);
    api.getAttendees(event._id)
      .then((data) => {
        setAttendees(data || []);
      })
      .catch((err) => {
        console.error('Failed to load attendees', err);
        setError(err.message || 'Failed to retrieve attendee roster.');
      })
      .finally(() => setLoading(false));
  }, [event]);

  if (!event) return null;

  const venue = typeof event.venue_id === 'object' ? event.venue_id : null;
  const maxCap = venue ? venue.max_capacity : 100;

  const filteredAttendees = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  const downloadCSV = () => {
    if (attendees.length === 0) return;
    const headers = ['Full Name,Email Address,Registration Date,Status'];
    const rows = attendees.map(
      (a) => `"${a.name}","${a.email}","${new Date(a.registeredAt).toLocaleString()}","Confirmed Seat"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}_Attendees_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-800" />
              <h3 className="text-base font-bold text-slate-900">Program Attendee Roster</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">
              {event.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {attendees.length > 0 && (
              <button
                onClick={downloadCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV ({attendees.length})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Summary Stat Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 block">Total Registered Users</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {attendees.length} <span className="text-xs font-normal text-slate-500">students</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 block">Venue Seating Capacity</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {maxCap.toLocaleString()} <span className="text-xs font-normal text-slate-500">max seats</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 block">Remaining Seats Open</span>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
                {Math.max(0, maxCap - attendees.length).toLocaleString()} <span className="text-xs font-normal text-slate-500">available</span>
              </div>
            </div>
          </div>

          {/* Search Filter Strip */}
          {attendees.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search registered users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-slate-900"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading registered attendee list...</div>
          ) : attendees.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-semibold text-slate-800">No users have registered yet</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                As students discover and register for your program in the public feed, their details will appear here.
              </p>
            </div>
          ) : filteredAttendees.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No attendees found matching "{search}".
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold shadow-2xs">
                    <tr>
                      <th className="py-2.5 px-3 w-12">#</th>
                      <th className="py-2.5 px-3">Attendee Name</th>
                      <th className="py-2.5 px-3">Campus Email</th>
                      <th className="py-2.5 px-3">Registration Timestamp</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendees.map((attendee, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400 tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {attendee.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">
                          {attendee.email}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono tabular-nums">
                          {new Date(attendee.registeredAt).toLocaleDateString()} at{' '}
                          {new Date(attendee.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Confirmed Seat
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
