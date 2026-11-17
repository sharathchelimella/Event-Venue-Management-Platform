import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { X, Lock, Mail, User, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export const AuthModal = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Google sign in state
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleRole, setGoogleRole] = useState('Student');

  // Initialize official Google Identity Services SDK if Client ID is configured
  useEffect(() => {
    if (!isOpen) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (typeof window !== 'undefined' && window.google?.accounts?.id && clientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (response.credential) {
              setLoading(true);
              setError(null);
              try {
                const user = await api.googleAuth({
                  credential: response.credential,
                  role,
                });
                onSuccess(user);
                onClose();
              } catch (err) {
                setError(err.message || 'Google Sign-In failed.');
              } finally {
                setLoading(false);
              }
            }
          },
        });

        const btnContainer = document.getElementById('gsiButtonContainer');
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: isLogin ? 'signin_with' : 'signup_with',
          });
        }
      } catch (err) {
        console.warn('Google Identity Services init warning:', err);
      }
    }
  }, [isOpen, isLogin, role, onSuccess, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const user = await api.login(email, password);
        onSuccess(user);
        onClose();
      } else {
        const user = await api.register(name, email, password, role);
        onSuccess(user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) {
      setError('Please enter a valid Google email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const derivedName = googleName.trim() || googleEmail.split('@')[0].replace(/[._-]/g, ' ');
      const user = await api.googleAuth({
        email: googleEmail.trim().toLowerCase(),
        name: derivedName,
        role: googleRole,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(derivedName)}`,
        authProvider: 'google',
      });
      onSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Google Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleBtnClick = () => {
    // If official Google prompt is configured, try triggering it
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (typeof window !== 'undefined' && window.google?.accounts?.id && clientId) {
      window.google.accounts.id.prompt();
    } else {
      // Toggle the direct Google account sign-in panel
      setShowGoogleInput((prev) => !prev);
      setError(null);
    }
  };

  const fillDemo = (roleChoice) => {
    if (roleChoice === 'Student') {
      setEmail('alex.student@campus.edu');
      setPassword('password123');
    } else if (roleChoice === 'Organizer') {
      setEmail('priya.organizer@campus.edu');
      setPassword('password123');
    } else {
      setEmail('dean.admin@campus.edu');
      setPassword('adminpassword');
    }
    setIsLogin(true);
    setShowGoogleInput(false);
    setError(null);
  };

  const fillDemoGoogle = (emailVal, nameVal, roleVal) => {
    setGoogleEmail(emailVal);
    setGoogleName(nameVal);
    setGoogleRole(roleVal);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isLogin ? 'Sign In to CampusEventHub' : 'Create an Account'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLogin ? 'Enter your campus or Google credentials to continue' : 'Join as a student or event organizer'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Quick Demo Pre-fill Links */}
          <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span className="font-semibold text-slate-700 block mb-1.5">Quick Demo Logins:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => fillDemo('Student')}
                className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-400 rounded text-slate-700 font-medium transition-colors"
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => fillDemo('Organizer')}
                className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-400 rounded text-slate-700 font-medium transition-colors"
              >
                Organizer
              </button>
              <button
                type="button"
                onClick={() => fillDemo('Admin')}
                className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-400 rounded text-slate-700 font-medium transition-colors"
              >
                Admin
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In Container */}
          <div className="space-y-3 mb-5">
            {/* Optional Official GSI Render Container */}
            <div id="gsiButtonContainer" className="flex justify-center"></div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleBtnClick}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg border border-slate-300 shadow-2xs hover:border-slate-400 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLogin ? 'Sign in with Google' : 'Sign up with Google'}</span>
            </button>

            {/* Expandable Google Account Entry Box */}
            {showGoogleInput && (
              <form onSubmit={handleGoogleSubmit} className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3 text-xs">
                <div className="flex items-center justify-between text-blue-900 font-semibold">
                  <span>Sign in with Google Account</span>
                  <button
                    type="button"
                    onClick={() => setShowGoogleInput(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Pre-fill Quick Google Account Helpers */}
                <div className="flex flex-wrap gap-1 text-[11px]">
                  <span className="text-slate-500 self-center">Quick accounts:</span>
                  <button
                    type="button"
                    onClick={() => fillDemoGoogle('alex.rivera@gmail.com', 'Alex Rivera', 'Student')}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded hover:border-blue-400 text-slate-700"
                  >
                    alex.rivera@gmail.com
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoGoogle('priya.sharma@gmail.com', 'Priya Sharma', 'Organizer')}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded hover:border-blue-400 text-slate-700"
                  >
                    priya.sharma@gmail.com
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Google Email
                  </label>
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="user@gmail.com or user@campus.edu"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="e.g. Sharath Chelimella"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:border-blue-600"
                  />
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Assign Role
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label
                        className={`flex items-center gap-1.5 p-2 bg-white border rounded cursor-pointer ${
                          googleRole === 'Student'
                            ? 'border-blue-600 text-blue-900 font-semibold'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="googleRole"
                          value="Student"
                          checked={googleRole === 'Student'}
                          onChange={() => setGoogleRole('Student')}
                          className="sr-only"
                        />
                        <span>Student</span>
                      </label>
                      <label
                        className={`flex items-center gap-1.5 p-2 bg-white border rounded cursor-pointer ${
                          googleRole === 'Organizer'
                            ? 'border-blue-600 text-blue-900 font-semibold'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="googleRole"
                          value="Organizer"
                          checked={googleRole === 'Organizer'}
                          onChange={() => setGoogleRole('Organizer')}
                          className="sr-only"
                        />
                        <span>Organizer</span>
                      </label>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-md transition-colors disabled:opacity-50"
                >
                  {loading ? 'Authenticating with Google...' : 'Continue to CampusEventHub'}
                </button>
              </form>
            )}

            {/* Visual Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
                or with campus email
              </span>
              <div className="border-t border-slate-200 w-full"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Chen"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@campus.edu"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors flex items-center gap-1 focus:outline-hidden cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors focus:outline-hidden cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Type</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors ${
                      role === 'Student'
                        ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="Student"
                      checked={role === 'Student'}
                      onChange={() => setRole('Student')}
                      className="sr-only"
                    />
                    <span>Student / Attendee</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-colors ${
                      role === 'Organizer'
                        ? 'border-slate-900 bg-slate-50 font-semibold text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="Organizer"
                      checked={role === 'Organizer'}
                      onChange={() => setRole('Organizer')}
                      className="sr-only"
                    />
                    <span>Event Organizer</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Admin privileges are pre-configured to prevent unauthorized sign-ups.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            {isLogin ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setShowGoogleInput(false);
                    setError(null);
                  }}
                  className="font-semibold text-slate-900 hover:underline cursor-pointer"
                >
                  Register now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setShowGoogleInput(false);
                    setError(null);
                  }}
                  className="font-semibold text-slate-900 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
