import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { api, storage } from './services/api.js';
import { webVitals } from './services/webVitals.js';
import { Header } from './components/Header.jsx';
import { StudentFeed } from './components/StudentFeed.jsx';
import { MyRegistrations } from './components/MyRegistrations.jsx';
import { VenueDirectory } from './components/VenueDirectory.jsx';
import { LoginPage } from './components/LoginPage.jsx';
import { CheckCircle2, AlertCircle, Info, Activity } from 'lucide-react';

// Code-splitting non-critical routes and heavy modals to slash initial bundle size and maximize FCP/LCP
const OrganizerPortal = lazy(() =>
  import('./components/OrganizerPortal.jsx').then((m) => ({ default: m.OrganizerPortal }))
);
const AdminPortal = lazy(() =>
  import('./components/AdminPortal.jsx').then((m) => ({ default: m.AdminPortal }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal.jsx').then((m) => ({ default: m.AuthModal }))
);
const WebVitalsHUD = lazy(() =>
  import('./components/WebVitalsHUD.jsx').then((m) => ({ default: m.WebVitalsHUD }))
);
const ListVenueForm = lazy(() =>
  import('./components/ListVenueForm.jsx').then((m) => ({ default: m.ListVenueForm }))
);
const MyListings = lazy(() =>
  import('./components/MyListings.jsx').then((m) => ({ default: m.MyListings }))
);
import { VenueDetailModal } from './components/VenueDetailModal.jsx';
import { ContactListingSection } from './components/ContactListingSection.jsx';

// Zero-CLS Suspense Skeleton matching final view layout
const PortalSkeleton = () => (
  <div className="space-y-6 animate-pulse min-h-[400px]">
    <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
    <div className="h-4 bg-slate-200 rounded w-96 mb-6"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div className="h-44 bg-white border border-slate-200 rounded-xl"></div>
      <div className="h-44 bg-white border border-slate-200 rounded-xl"></div>
      <div className="h-44 bg-white border border-slate-200 rounded-xl"></div>
    </div>
  </div>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [venues, setVenues] = useState([]);
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [vitalsHudOpen, setVitalsHudOpen] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Venue Listing & Redirection State
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [editingVenue, setEditingVenue] = useState(null);
  const [viewingVenue, setViewingVenue] = useState(null);
  const [selectedVenueForBooking, setSelectedVenueForBooking] = useState(null);

  // Initialize Web Vitals observer immediately
  useEffect(() => {
    webVitals.init();
  }, []);

  const addToast = (type, message) => {
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
      setApprovedEvents(events || []);
    } catch (err) {
      console.error('Failed to load approved events', err);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  // Load Venues
  const refreshVenues = useCallback(async () => {
    try {
      const data = await api.getVenues();
      setVenues(data || []);
    } catch (err) {
      console.error('Failed to load venues', err);
    }
  }, []);

  // Load Student Registrations
  const refreshRegistrations = useCallback(async (userId) => {
    if (!userId) {
      setMyRegistrations([]);
      setRegisteredEventIds(new Set());
      return;
    }
    setLoadingRegistrations(true);
    try {
      const data = await api.getMyRegistrations(userId);
      setMyRegistrations(data || []);
      const ids = new Set((data || []).map((r) => (typeof r.event === 'object' ? r.event._id : r.event)));
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
      setMyEvents(data || []);
    } catch {
      setMyEvents([]);
    }
  }, []);

  // Load Admin Pending Requests
  const refreshPendingEvents = useCallback(async () => {
    try {
      const data = await api.getPendingEvents();
      setPendingEvents(data || []);
    } catch {
      setPendingEvents([]);
    }
  }, []);

  // Initial App Startup
  useEffect(() => {
    const initApp = async () => {
      await refreshVenues();
      await refreshFeed();

      // Check existing authenticated session
      let user = storage.getUser();
      if (user) {
        const verified = await api.getMe();
        if (!verified) {
          user = null;
        } else {
          user = verified;
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

  // Auth Success Handler with role-based or requested redirection
  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setAuthModalOpen(false);
    addToast('success', `Welcome back, ${user.name}!`);
    refreshRegistrations(user._id);

    // If user intended to navigate somewhere before login (e.g. List Your Venue)
    if (redirectAfterLogin) {
      const target = redirectAfterLogin;
      setRedirectAfterLogin(null);
      setActiveTab(target);
      return;
    }

    // Redirect to appropriate role dashboard
    if (user.role === 'Student') {
      setActiveTab('feed');
    } else if (user.role === 'Organizer') {
      refreshMyEvents();
      setActiveTab('organizer');
    } else if (user.role === 'Admin') {
      refreshPendingEvents();
      setActiveTab('admin');
    }
  };

  const handleScrollToContact = () => {
    const el = document.getElementById('contact-listing-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setActiveTab('feed');
      setTimeout(() => {
        document.getElementById('contact-listing-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  };

  const handleOpenListVenue = () => {
    handleScrollToContact();
  };

  // Demo Switch Handler
  const handleDemoSwitch = async (role) => {
    try {
      const user = await api.demoSwitch(role);
      handleAuthSuccess(user);
      addToast('info', `Switched active persona to ${user.name} (${user.role})`);
    } catch (err) {
      addToast('error', err.message || 'Failed to switch demo persona.');
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setMyRegistrations([]);
    setRegisteredEventIds(new Set());
    setRedirectAfterLogin(null);
    setEditingVenue(null);
    setActiveTab('login');
    addToast('info', 'You have been signed out.');
  };

  // Student Seat Registration Handler
  const handleRegister = async (event) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    try {
      await api.registerForEvent(event._id);
      addToast('success', `Seat reserved successfully for "${event.title}"!`);
      await refreshFeed();
      await refreshRegistrations(currentUser._id);
    } catch (err) {
      addToast('error', err.message || 'Registration failed.');
      throw err;
    }
  };

  // Student Cancel Registration Handler
  const handleCancelRegistration = async (eventId) => {
    if (!currentUser) return;

    try {
      await api.cancelRegistration(eventId);
      addToast('info', 'Your seat reservation has been cancelled.');
      await refreshFeed();
      await refreshRegistrations(currentUser._id);
    } catch (err) {
      addToast('error', err.message || 'Failed to cancel reservation.');
      throw err;
    }
  };

  const handleSelectTab = (tab) => {
    if (tab === 'list-venue') {
      handleScrollToContact();
      return;
    }
    if (tab === 'my-listings' && !currentUser) {
      setRedirectAfterLogin('my-listings');
      setActiveTab('login');
      addToast('info', 'Please sign in to view your listings.');
      return;
    }
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
        onOpenAuth={() => setActiveTab('login')}
        onLogout={handleLogout}
        onDemoSwitch={handleDemoSwitch}
        onListVenue={handleOpenListVenue}
        pendingCount={pendingEvents.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[500px]">
        {activeTab === 'login' && (
          <LoginPage
            onSuccess={handleAuthSuccess}
            onClose={() => setActiveTab('feed')}
            isModal={false}
          />
        )}

        {activeTab === 'feed' && (
          <StudentFeed
            events={approvedEvents}
            currentUser={currentUser}
            registeredEventIds={registeredEventIds}
            onRegister={handleRegister}
            onCancelRegistration={handleCancelRegistration}
            onOpenAuth={() => setActiveTab('login')}
            onNavigateToVenues={() => setActiveTab('venues')}
            onNavigateToListVenue={handleOpenListVenue}
            loading={loadingFeed}
          />
        )}

        {activeTab === 'venues' && (
          <VenueDirectory
            venues={venues}
            onRequestBooking={(targetVenue) => {
              const targetId = typeof targetVenue === 'object' ? targetVenue?._id : targetVenue;
              if (targetId) setSelectedVenueForBooking(targetId);
              if (!currentUser) {
                setRedirectAfterLogin('organizer');
                setActiveTab('login');
              } else if (currentUser.role === 'Organizer' || currentUser.role === 'Admin') {
                setActiveTab('organizer');
              } else {
                addToast('error', 'Only club organizers and administrators can request venue bookings.');
              }
            }}
            canBook={currentUser?.role === 'Organizer' || currentUser?.role === 'Admin'}
            currentUser={currentUser}
            onOpenListVenue={handleOpenListVenue}
          />
        )}

        {activeTab === 'list-venue' && (
          <Suspense fallback={<PortalSkeleton />}>
            <ListVenueForm
              currentUser={currentUser}
              initialData={editingVenue}
              isEditing={Boolean(editingVenue)}
              onSuccess={(listing, msg) => {
                addToast('success', msg || 'Venue listing saved successfully!');
                setEditingVenue(null);
                setActiveTab('my-listings');
                refreshVenues();
              }}
              onCancel={() => {
                setEditingVenue(null);
                setActiveTab('my-listings');
              }}
            />
          </Suspense>
        )}

        {activeTab === 'my-listings' && (
          <Suspense fallback={<PortalSkeleton />}>
            <MyListings
              currentUser={currentUser}
              onAddNewVenue={() => {
                setEditingVenue(null);
                setActiveTab('list-venue');
              }}
              onEditVenue={(venue) => {
                setEditingVenue(venue);
                setActiveTab('list-venue');
              }}
              onViewVenueDetails={(venue) => setViewingVenue(venue)}
            />
          </Suspense>
        )}

        {activeTab === 'my-registrations' && currentUser?.role === 'Student' && (
          <MyRegistrations
            registrations={myRegistrations}
            onCancelRegistration={handleCancelRegistration}
            onExploreEvents={() => setActiveTab('feed')}
            loading={loadingRegistrations}
          />
        )}

        {(activeTab === 'organizer' || activeTab === 'ai-planner') && (currentUser?.role === 'Organizer' || currentUser?.role === 'Admin') && (
          <Suspense fallback={<PortalSkeleton />}>
            <OrganizerPortal
              venues={venues}
              myEvents={myEvents}
              onRefreshEvents={refreshMyEvents}
              onRefreshVenues={refreshVenues}
              initialVenueId={selectedVenueForBooking}
              initialSubTab={activeTab === 'ai-planner' ? 'ai-planner' : 'programs'}
            />
          </Suspense>
        )}

        {activeTab === 'admin' && currentUser?.role === 'Admin' && (
          <Suspense fallback={<PortalSkeleton />}>
            <AdminPortal
              pendingEvents={pendingEvents}
              venues={venues}
              onRefreshPending={refreshPendingEvents}
              onRefreshVenues={refreshVenues}
              onRefreshFeed={refreshFeed}
            />
          </Suspense>
        )}
      </main>

      {/* Global Venue Detail Modal */}
      {viewingVenue && (
        <VenueDetailModal
          venue={viewingVenue}
          isOpen={Boolean(viewingVenue)}
          onClose={() => setViewingVenue(null)}
          currentUser={currentUser}
          onInquirySent={(msg) => addToast('success', msg)}
          onRequestBooking={(targetVenue) => {
            setViewingVenue(null);
            const targetId = typeof targetVenue === 'object' ? targetVenue?._id : targetVenue;
            if (targetId) setSelectedVenueForBooking(targetId);
            if (!currentUser) {
              setRedirectAfterLogin('organizer');
              setActiveTab('login');
            } else if (currentUser.role === 'Organizer' || currentUser.role === 'Admin') {
              setActiveTab('organizer');
            } else {
              addToast('error', 'Only club organizers and administrators can request venue bookings.');
            }
          }}
        />
      )}

      {/* Interactive "Have a Venue or Event to List?" Section */}
      <ContactListingSection currentUser={currentUser} />

      {/* Clean Anti-Slop Footer with Core Web Vitals HUD Launcher */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 tracking-tight">EventSphere</span>
            <span>—</span>
            <span>Event & Venue Management Platform</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setVitalsHudOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
              title="Open Live Web Vitals Telemetry Monitor"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>⚡ Core Web Vitals HUD</span>
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Ashok Mittal · Shanti Devi Mittal</span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal (Lazy Loaded) */}
      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            onSuccess={handleAuthSuccess}
          />
        </Suspense>
      )}

      {/* Web Vitals Real-Time Telemetry HUD (Lazy Loaded) */}
      {vitalsHudOpen && (
        <Suspense fallback={null}>
          <WebVitalsHUD isOpen={vitalsHudOpen} onClose={() => setVitalsHudOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
