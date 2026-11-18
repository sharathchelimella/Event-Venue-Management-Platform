import React from 'react';
import { LogOut, LogIn, Plus, Building2, Sparkles } from 'lucide-react';

export const Header = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  onListVenue,
  pendingCount = 0,
}) => {
  const handleListVenueClick = () => {
    if (onListVenue) {
      onListVenue();
    } else {
      setActiveTab('list-venue');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Main Top Bar Contract: 3 Zones */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-md shadow-indigo-500/20">
              ES
            </div>
            <button
              onClick={() => setActiveTab('feed')}
              className="text-left font-extrabold text-lg tracking-tight text-slate-900 hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <span>EventSphere</span>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('feed')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'feed' ? 'text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5' : ''
              }`}
            >
              Browse Events
            </button>

            <button
              onClick={() => setActiveTab('venues')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'venues' ? 'text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5' : ''
              }`}
            >
              Venues Directory
            </button>

            {currentUser && (
              <button
                onClick={() => setActiveTab('my-listings')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'my-listings'
                    ? 'text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5'
                    : ''
                }`}
              >
                <span>My Listings</span>
              </button>
            )}

            {currentUser && currentUser.role === 'Student' && (
              <button
                onClick={() => setActiveTab('my-registrations')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'my-registrations' ? 'text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5' : ''
                }`}
              >
                My Registrations
              </button>
            )}

            {currentUser && (currentUser.role === 'Organizer' || currentUser.role === 'Admin') && (
              <>
                <button
                  onClick={() => setActiveTab('organizer')}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'organizer' ? 'text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5' : ''
                  }`}
                >
                  Organizer Portal
                </button>
                <button
                  onClick={() => setActiveTab('ai-planner')}
                  className={`hover:text-indigo-600 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'ai-planner'
                      ? 'text-indigo-600 font-bold border-b-2 border-indigo-600 pb-0.5'
                      : 'text-indigo-600/90 font-medium'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  <span>AI Planner</span>
                </button>
              </>
            )}

            {currentUser && currentUser.role === 'Admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'admin' ? 'text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5' : ''
                }`}
              >
                <span>Admin Queue</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Action / List Your Venue / User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Prominent List Your Venue CTA */}
            <button
              onClick={handleListVenueClick}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                activeTab === 'list-venue'
                  ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>List Your Venue</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-3">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold uppercase">
                    {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                  </div>
                )}
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 flex items-center justify-end gap-1.5">
                    <span>{currentUser.name}</span>
                    {currentUser.authProvider === 'google' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Google
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono tracking-tight">{currentUser.role}</div>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In / Register
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex lg:hidden items-center gap-3.5 py-2.5 border-t border-slate-100 overflow-x-auto text-xs font-medium text-slate-600">
          <button
            onClick={() => setActiveTab('feed')}
            className={`whitespace-nowrap ${activeTab === 'feed' ? 'text-slate-950 font-bold' : ''}`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('venues')}
            className={`whitespace-nowrap ${activeTab === 'venues' ? 'text-slate-950 font-bold' : ''}`}
          >
            Venues
          </button>
          <button
            onClick={handleListVenueClick}
            className={`whitespace-nowrap font-bold text-indigo-600 flex items-center gap-1 ${
              activeTab === 'list-venue' ? 'underline' : ''
            }`}
          >
            <Plus className="w-3 h-3" />
            List Venue
          </button>
          {currentUser && (
            <button
              onClick={() => setActiveTab('my-listings')}
              className={`whitespace-nowrap ${activeTab === 'my-listings' ? 'text-slate-950 font-bold' : ''}`}
            >
              My Listings
            </button>
          )}
          {currentUser?.role === 'Student' && (
            <button
              onClick={() => setActiveTab('my-registrations')}
              className={`whitespace-nowrap ${activeTab === 'my-registrations' ? 'text-slate-950 font-bold' : ''}`}
            >
              My Passes
            </button>
          )}
          {(currentUser?.role === 'Organizer' || currentUser?.role === 'Admin') && (
            <>
              <button
                onClick={() => setActiveTab('organizer')}
                className={`whitespace-nowrap ${activeTab === 'organizer' ? 'text-slate-950 font-bold' : ''}`}
              >
                Organizer
              </button>
              <button
                onClick={() => setActiveTab('ai-planner')}
                className={`whitespace-nowrap flex items-center gap-1 text-indigo-600 ${
                  activeTab === 'ai-planner' ? 'font-bold' : ''
                }`}
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>AI Planner</span>
              </button>
            </>
          )}
          {currentUser?.role === 'Admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`whitespace-nowrap flex items-center gap-1 ${activeTab === 'admin' ? 'text-slate-950 font-bold' : ''}`}
            >
              Admin
              {pendingCount > 0 && <span className="bg-amber-100 text-amber-800 px-1 rounded font-mono">{pendingCount}</span>}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
