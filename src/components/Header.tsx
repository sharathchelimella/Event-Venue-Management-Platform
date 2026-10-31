import React from 'react';
import { IUser, UserRole } from '../types/index.ts';
import { Calendar, UserCheck, Shield, Sparkles, LogOut, LogIn } from 'lucide-react';

interface HeaderProps {
  currentUser: IUser | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onDemoSwitch: (role: UserRole) => void;
  pendingCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  onDemoSwitch,
  pendingCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Main Top Bar Contract: 3 Zones */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm tracking-tighter">
              CE
            </div>
            <button
              onClick={() => setActiveTab('feed')}
              className="text-left font-bold text-lg tracking-tight text-slate-900 hover:text-slate-700 whitespace-nowrap shrink-0"
            >
              CampusEventHub
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
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
              <button
                onClick={() => setActiveTab('organizer')}
                className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'organizer' ? 'text-slate-900 font-semibold border-b-2 border-slate-900 pb-0.5' : ''
                }`}
              >
                Organizer Portal
              </button>
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

          {/* Zone 3: Primary Action / User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
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
        <div className="flex md:hidden items-center gap-4 py-2 border-t border-slate-100 overflow-x-auto text-xs font-medium text-slate-600">
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
          {currentUser?.role === 'Student' && (
            <button
              onClick={() => setActiveTab('my-registrations')}
              className={`whitespace-nowrap ${activeTab === 'my-registrations' ? 'text-slate-950 font-bold' : ''}`}
            >
              My Passes
            </button>
          )}
          {(currentUser?.role === 'Organizer' || currentUser?.role === 'Admin') && (
            <button
              onClick={() => setActiveTab('organizer')}
              className={`whitespace-nowrap ${activeTab === 'organizer' ? 'text-slate-950 font-bold' : ''}`}
            >
              Organizer
            </button>
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
