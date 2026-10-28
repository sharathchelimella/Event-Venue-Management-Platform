import React, { useEffect, useState } from 'react';
import { api } from '../services/api.ts';
import { IEvent } from '../types/index.ts';
import { X, Users, Mail, Calendar, Download } from 'lucide-react';

interface AttendeeModalProps {
  event: IEvent | null;
  onClose: () => void;
}

interface Attendee {
  name: string;
  email: string;
  registeredAt: string;
}

export const AttendeeModal: React.FC<AttendeeModalProps> = ({ event, onClose }) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!event) return;
    setLoading(true);
    api.getAttendees(event._id)
      .then((data) => setAttendees(data))
      .catch((err) => console.error('Failed to load attendees', err))
      .finally(() => setLoading(false));
  }, [event]);

  if (!event) return null;

  const downloadCSV = () => {
    if (attendees.length === 0) return;
    const headers = ['Full Name,Email Address,Registration Date'];
    const rows = attendees.map(
      (a) => `"${a.name}","${a.email}","${new Date(a.registeredAt).toLocaleString()}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}_Attendees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Registered Attendees Roster</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
              {event.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {attendees.length > 0 && (
              <button
                onClick={downloadCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-2 border-b border-slate-100">
            <span>
              Total Attendees: <strong className="text-slate-900 font-mono tabular-nums">{attendees.length}</strong> / {typeof event.venue_id === 'object' ? event.venue_id.max_capacity : 100} Max Capacity
            </span>
            <span className="font-mono tabular-nums">Event Date: {event.event_date}</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading attendee roster...</div>
          ) : attendees.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No attendees have registered for this event yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-3 font-semibold">#</th>
                    <th className="py-2.5 px-3 font-semibold">Attendee Name</th>
                    <th className="py-2.5 px-3 font-semibold">Campus Email</th>
                    <th className="py-2.5 px-3 font-semibold">Registered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendees.map((attendee, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{attendee.name}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">{attendee.email}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono tabular-nums">
                        {new Date(attendee.registeredAt).toLocaleDateString()} {new Date(attendee.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
