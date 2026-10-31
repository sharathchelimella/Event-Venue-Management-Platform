import React, { useEffect, useState, useCallback } from 'react';
import { api, storage } from './services/api.ts';
import { IUser, IVenue, IEvent, UserRole } from './types/index.ts';
import { Header } from './components/Header.tsx';
import { StudentFeed } from './components/StudentFeed.tsx';
import { MyRegistrations } from './components/MyRegistrations.tsx';
import { OrganizerPortal } from './components/OrganizerPortal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { VenueDirectory } from './components/VenueDirectory.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [venues, setVenues] = useState<IVenue[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<IEvent[]>([]);
  const [pendingEvents, setPendingEvents] = useState<IEvent[]>([]);
  const [myEvents, setMyEvents] = useState<IEvent[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<{ _id: string; createdAt: string; event: IEvent }[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Load Approved Events
  const refreshFeed = useCallback(async () => {
    try {
      const events = await api.getApprovedEvents();
      setApprovedEvents(events);
    } catch (err: any) {
      console.error('Failed to load approved events', err);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  // Load Venues
  const refreshVenues = useCallback(async () => {
    try {
      const data = await api.getVenues();
      setVenues(data);
    } catch (err: any) {
      console.error('Failed to load venues', err);
    }
  }, []);

  // Load Student Registrations
  const refreshRegistrations = useCallback(async (userId?: string) => {
    if (!userId) {
      setMyRegistrations([]);
      setRegisteredEventIds(new Set());
      return;
    }
    setLoadingRegistrations(true);
    try {
      const data = await api.getMyRegistrations(userId);
      setMyRegistrations(data);
      const ids = new Set(data.map((r) => (typeof r.event === 'object' ? r.event._id : (r.event as string))));
      setRegisteredEventIds(ids);
    } catch {
      setMyRegistrations([]);
      setRegisteredEventIds(new Set());
    } finally {
      setLoadingRegistrations(false);
    }
  }, []);

  // Load Organizer Submissions
  const refreshMyEvents = useCallback(async () => {
    try {
      const data = await api.getMyEvents();
      setMyEvents(data);
    } catch {
      setMyEvents([]);
    }
  }, []);

  // Load Admin Pending Requests
  const refreshPendingEvents = useCallback(async () => {
    try {
      const data = await api.getPendingEvents();
      setPendingEvents(data);
    } catch {
      setPendingEvents([]);
    }
  }, []);

  // Initial App Startup
  useEffect(() => {
    const initApp = async () => {
      await refreshVenues();
      await refreshFeed();

      // Check existing session or default to Student demo
      let user = storage.getUser();
      if (user) {
        // Validate with server that this user ID exists
        const verified = await api.getMe();
        if (!verified) {
          user = null;
        } else {
          user = verified;
        }
      }

      if (!user) {
        try {
          user = await api.demoSwitch('Student');
        } catch {
          // If demo switch is not ready yet, continue
        }
      }

      if (user) {
        setCurrentUser(user);
        await refreshRegistrations(user._id);
        if (user.role === 'Organizer' || user.role === 'Admin') {
          refreshMyEvents();
        }
        if (user.role === 'Admin') {
          refreshPendingEvents();
        }
      }
    };

    initApp();
  }, [refreshVenues, refreshFeed, refreshRegistrations, refreshMyEvents, refreshPendingEvents]);

  // Demo Switch Handler
  const handleDemoSwitch = async (role: UserRole) => {
    try {
      const user = await api.demoSwitch(role);
      setCurrentUser(user);
      addToast('info', `Switched active persona to ${user.name} (${user.role})`);

      await refreshVenues();
      await refreshFeed();
      await refreshRegistrations(user._id);

      if (role === 'Student') {
        setActiveTab('feed');
      } else if (role === 'Organizer') {
        await refreshMyEvents();
        setActiveTab('organizer');
      } else if (role === 'Admin') {
        await refreshPendingEvents();
        setActiveTab('admin');
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to switch demo persona.');
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setMyRegistrations([]);
    setRegisteredEventIds(new Set());
    setActiveTab('feed');
    addToast('info', 'You have been signed out.');
  };

  // Student Seat Registration Handler
  const handleRegister = async (event: IEvent) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    try {
      await api.registerForEvent(event._id);
      addToast('success', `Seat reserved successfully for "${event.title}"!`);
      await refreshFeed();
      await refreshRegistrations(currentUser._id);
    } catch (err: any) {
      addToast('error', err.message || 'Registration failed.');
      throw err;
    }
  };

  // Student Cancel Registration Handler
  const handleCancelRegistration = async (eventId: string) => {
    if (!currentUser) return;

    try {
      await api.cancelRegistration(eventId);
      addToast('info', 'Your seat reservation has been cancelled.');
      await refreshFeed();
      await refreshRegistrations(currentUser._id);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to cancel reservation.');
      throw err;
    }
  };

  const handleSelectTab = (tab: string) => {
    if (tab === 'organizer' && currentUser?.role !== 'Organizer' && currentUser?.role !== 'Admin') {
      setActiveTab('feed');
      return;
    }
    if (tab === 'admin' && currentUser?.role !== 'Admin') {
      setActiveTab('feed');
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg flex items-start gap-2.5 text-xs transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
                : toast.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-800'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />}
            <span className="leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onDemoSwitch={handleDemoSwitch}
        pendingCount={pendingEvents.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'feed' && (
          <StudentFeed
            events={approvedEvents}
            currentUser={currentUser}
            registeredEventIds={registeredEventIds}
            onRegister={handleRegister}
            onCancelRegistration={handleCancelRegistration}
            onOpenAuth={() => setAuthModalOpen(true)}
            loading={loadingFeed}
          />
        )}

        {activeTab === 'venues' && (
          <VenueDirectory
            venues={venues}
            onRequestBooking={() => {
              if (currentUser?.role === 'Organizer' || currentUser?.role === 'Admin') {
                setActiveTab('organizer');
              }
            }}
            canBook={currentUser?.role === 'Organizer' || currentUser?.role === 'Admin'}
          />
        )}

        {activeTab === 'my-registrations' && currentUser?.role === 'Student' && (
          <MyRegistrations
            registrations={myRegistrations}
            onCancelRegistration={handleCancelRegistration}
            onExploreEvents={() => setActiveTab('feed')}
            loading={loadingRegistrations}
          />
        )}

        {activeTab === 'organizer' && (currentUser?.role === 'Organizer' || currentUser?.role === 'Admin') && (
          <OrganizerPortal
            venues={venues}
            myEvents={myEvents}
            onRefreshEvents={refreshMyEvents}
            onRefreshVenues={refreshVenues}
          />
        )}

        {activeTab === 'admin' && currentUser?.role === 'Admin' && (
          <AdminPortal
            pendingEvents={pendingEvents}
            venues={venues}
            onRefreshPending={refreshPendingEvents}
            onRefreshVenues={refreshVenues}
            onRefreshFeed={refreshFeed}
          />
        )}
      </main>

      {/* Clean Anti-Slop Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">CampusEventHub</span>
            <span>—</span>
            <span>Campus Venue Booking & Event Management System</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Ashok Mittal Auditorium · Shanti Devi Mittal Auditorium · Seminar Halls</span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          addToast('success', `Welcome back, ${user.name}!`);
          refreshRegistrations(user._id);
          if (user.role === 'Organizer') refreshMyEvents();
          if (user.role === 'Admin') refreshPendingEvents();
        }}
        onDemoSwitch={handleDemoSwitch}
      />
    </div>
  );
}
