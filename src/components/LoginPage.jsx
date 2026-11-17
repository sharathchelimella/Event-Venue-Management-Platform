import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api.js';
import {
  Calendar,
  Lock,
  Mail,
  User,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Shield,
  Users,
  Compass,
  KeyRound,
  RotateCcw,
  Check,
  ChevronLeft,
  X,
} from 'lucide-react';

export const LoginPage = ({
  onSuccess,
  onClose,
  isModal = false,
  initialMode = 'login',
}) => {
  // Navigation / screen mode: 'login' | 'register' | 'forgot' | 'success'
  const [mode, setMode] = useState(initialMode); // 'login', 'register', 'forgot'
  const [successUser, setSuccessUser] = useState(null);

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [rememberMe, setRememberMe] = useState(true);

  // Password visibility & Caps Lock detection
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Form validation & UI states
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Forgot password flow states
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1 = request code, 2 = enter code & new password
  const [forgotMessage, setForgotMessage] = useState(null);
  const [receivedCodeHelper, setReceivedCodeHelper] = useState('');

  // Google sign in states
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleRole, setGoogleRole] = useState('Student');

  // Caps Lock keyboard listener
  const handleKeyActivity = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  // Email format validation
  const validateEmailFormat = (val) => {
    if (!val) {
      setEmailError('Email is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) {
      setEmailError('Please enter a valid email address (e.g. name@campus.edu).');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    if (touchedEmail) {
      validateEmailFormat(val);
    }
  };

  // Google Identity Services SDK integration
  useEffect(() => {
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
                const user = await api.googleAuth(
                  { credential: response.credential, role },
                  rememberMe
                );
                handleSuccessfulAuth(user);
              } catch (err) {
                setError(err.message || 'Google Sign-In failed.');
              } finally {
                setLoading(false);
              }
            }
          },
        });

        const btnEl = document.getElementById('eventsphereGsiBtn');
        if (btnEl) {
          window.google.accounts.id.renderButton(btnEl, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: mode === 'login' ? 'signin_with' : 'signup_with',
          });
        }
      } catch (err) {
        console.warn('[EventSphere] Google GIS initialization warning:', err);
      }
    }
  }, [mode, role, rememberMe]);

  // Auth Success Handler with tasteful redirect
  const handleSuccessfulAuth = (user) => {
    setSuccessUser(user);
    setMode('success');
    // Brief animation delay so user can enjoy the feedback badge
    setTimeout(() => {
      onSuccess(user);
      if (onClose) onClose();
    }, 1200);
  };

  // Submit Handler for Email/Password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const isEmailValid = validateEmailFormat(email);
    if (!isEmailValid) {
      setTouchedEmail(true);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await api.login(email.trim(), password, rememberMe);
        handleSuccessfulAuth(user);
      } else {
        const user = await api.register(name.trim(), email.trim(), password, role, rememberMe);
        handleSuccessfulAuth(user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Google Direct Submit
  const handleGoogleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) {
      setError('Please provide a valid Google email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const derivedName = googleName.trim() || googleEmail.split('@')[0].replace(/[._-]/g, ' ');
      const user = await api.googleAuth(
        {
          email: googleEmail.trim().toLowerCase(),
          name: derivedName,
          role: googleRole,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(derivedName)}`,
          authProvider: 'google',
        },
        rememberMe
      );
      handleSuccessfulAuth(user);
    } catch (err) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Step 1 (Request Code)
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setForgotMessage(null);

    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      setForgotMessage(res.message);
      if (res.code) {
        setReceivedCodeHelper(res.code);
        setResetCode(res.code); // Pre-fill for seamless user testing
      }
      setForgotStep(2);
    } catch (err) {
      setError(err.message || 'Unable to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Step 2 (Reset with Code)
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetCode || !newPassword) {
      setError('Please enter the verification code and new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.resetPassword(forgotEmail.trim(), resetCode.trim(), newPassword);
      setEmail(forgotEmail.trim());
      setPassword(newPassword);
      setMode('login');
      setError(null);
      setForgotStep(1);
      setForgotMessage(res.message || 'Password reset successful! You can now sign in.');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Fast-fill demo credentials
  const fillDemo = (roleChoice) => {
    setError(null);
    setMode('login');
    setShowGoogleInput(false);
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
  };

  return (
    <div
      className={`w-full ${
        isModal
          ? 'max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200/80 shadow-2xl bg-white'
          : 'min-h-[85vh] flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8'
      }`}
    >
      <div className={`w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200/70 grid grid-cols-1 lg:grid-cols-12 min-h-[620px]`}>
        {/* ================================================================= */}
        {/* LEFT SECTION: EventSphere Branding & Rich Visual Showcase (Desktop) */}
        {/* ================================================================= */}
        <div className="relative overflow-hidden lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 lg:p-10 flex flex-col justify-between">
          {/* Animated decorative gradient blur orbs */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Brand Block */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-400 flex items-center justify-center text-white font-black text-base shadow-lg shadow-indigo-500/25">
                ES
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white block">EventSphere</span>
                <span className="text-[10px] font-mono tracking-widest text-indigo-300 uppercase block">Venue & Event Platform</span>
              </div>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight mb-3">
              Where Campus Culture Meets Seamless Venue Management.
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 leading-relaxed font-normal">
              Discover collegiate hackathons, book campus auditoriums with zero-conflict scheduling, and manage attendee rosters in real time.
            </p>
          </div>

          {/* Center: Interactive Floating Event Spotlight Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative z-10 my-8 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                Live Upcoming Event
              </span>
              <span className="text-[11px] font-mono text-slate-300">Nov 28, 2026</span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                HackCampus 2026: 36-Hr National Hackathon
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1">
                <span>📍 Shanti Devi Mittal Auditorium</span>
                <span>•</span>
                <span className="text-indigo-300 font-mono">2,500 Cap</span>
              </p>
            </div>

            {/* Live Capacity Meter */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Booked Capacity</span>
                <span className="text-emerald-400 font-semibold">94% (Housefull Near)</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '94%' }}
                  transition={{ duration: 1, delay: 0.4 }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-emerald-400 rounded-full"
                ></motion.div>
              </div>
            </div>
          </motion.div>

          {/* Bottom Security Highlights */}
          <div className="relative z-10 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
              <span className="block text-base font-bold text-indigo-300 font-mono">100%</span>
              <span className="text-[10px] text-slate-400 uppercase font-medium">Conflict Free</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
              <span className="block text-base font-bold text-indigo-300 font-mono">2.5k+</span>
              <span className="text-[10px] text-slate-400 uppercase font-medium">Max Hall Cap</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
              <span className="block text-base font-bold text-indigo-300 font-mono">RLS</span>
              <span className="text-[10px] text-slate-400 uppercase font-medium">RBAC Guards</span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT SECTION: Interactive Form (Sign In / Register / Recovery) */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white relative">
          {/* Modal Close Button if displayed as overlay */}
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div>
            {/* Header / Mode Switcher */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                  {mode === 'login'
                    ? 'Sign In to EventSphere'
                    : mode === 'register'
                    ? 'Create Your Account'
                    : mode === 'forgot'
                    ? 'Reset Your Password'
                    : 'Authentication Complete'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {mode === 'login'
                    ? 'Enter your campus credentials or sign in with Google'
                    : mode === 'register'
                    ? 'Register as a Student attendee or verified Event Organizer'
                    : mode === 'forgot'
                    ? 'Follow the instant recovery steps to restore account access'
                    : 'Taking you to your role-based dashboard...'}
                </p>
              </div>

              {/* Mode Toggle Pills (when not in success/forgot) */}
              {(mode === 'login' || mode === 'register') && (
                <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      mode === 'login'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      mode === 'register'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Register
                  </button>
                </div>
              )}
            </div>

            {/* Quick Demo Accounts Helper Pills */}
            {(mode === 'login' || mode === 'register') && (
              <div className="mb-5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Instant Test Personas:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillDemo('Student')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    🎓 Student (Alex)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('Organizer')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    🎪 Organizer (Priya)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('Admin')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    🏛️ Admin (Dean)
                  </button>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </motion.div>
            )}

            {/* Success Message Banner */}
            {forgotMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed">{forgotMessage}</span>
              </motion.div>
            )}

            {/* Caps Lock Alert Banner */}
            {capsLockActive && (
              <div className="mb-3 p-2 px-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
                <span className="font-bold text-[10px] uppercase bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">Caps Lock</span>
                <span>Caps Lock is active. Ensure your password casing is correct.</span>
              </div>
            )}

            {/* ============================================================= */}
            {/* SCREEN 1: SUCCESS TRANSITION SCREEN */}
            {/* ============================================================= */}
            {mode === 'success' && successUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Welcome back, {successUser.name}!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Authenticated successfully as{' '}
                    <span className="font-semibold text-slate-800">{successUser.role}</span>.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-xs font-mono text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></div>
                  <span>Directing to {successUser.role} Portal...</span>
                </div>
              </motion.div>
            )}

            {/* ============================================================= */}
            {/* SCREEN 2: FORGOT PASSWORD WIZARD */}
            {/* ============================================================= */}
            {mode === 'forgot' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {forgotStep === 1 ? (
                  <form onSubmit={handleForgotRequest} className="space-y-4">
                    <p className="text-xs text-slate-600">
                      Enter your account email. We will issue a 6-digit verification code to reset your password.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="e.g. alex.student@campus.edu"
                          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError(null);
                        }}
                        className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Back to Sign In
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? 'Sending Code...' : 'Generate Recovery Code'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    {receivedCodeHelper && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
                        <span className="font-semibold block mb-0.5">Campus Recovery Code:</span>
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono font-bold tracking-widest text-indigo-700">{receivedCodeHelper}</code>
                          <span className="text-[10px] text-indigo-500 font-mono">Valid for 15m</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        6-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3 py-2.5 text-sm font-mono tracking-widest border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-900 text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        New Password (min 6 characters)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-900"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? 'Updating Password...' : 'Save & Sign In'}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}

            {/* ============================================================= */}
            {/* SCREEN 3: MAIN LOGIN / REGISTRATION FORM */}
            {/* ============================================================= */}
            {(mode === 'login' || mode === 'register') && (
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* 1. Google One-Click Authentication */}
                <div className="space-y-2">
                  <div id="eventsphereGsiBtn" className="flex justify-center"></div>

                  <button
                    type="button"
                    onClick={() => setShowGoogleInput(!showGoogleInput)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition-all cursor-pointer"
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
                    <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
                  </button>

                  {/* Expandable Direct Google Account Picker */}
                  <AnimatePresence>
                    {showGoogleInput && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleGoogleSubmit}
                        className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3 text-xs"
                      >
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

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Google Email
                          </label>
                          <input
                            type="email"
                            required
                            value={googleEmail}
                            onChange={(e) => setGoogleEmail(e.target.value)}
                            placeholder="user@gmail.com or name@campus.edu"
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600"
                          />
                        </div>

                        {mode === 'register' && (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Display Name (Optional)
                            </label>
                            <input
                              type="text"
                              value={googleName}
                              onChange={(e) => setGoogleName(e.target.value)}
                              placeholder="e.g. Sharath Chelimella"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600"
                            />
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {loading ? 'Authenticating...' : 'Sign In with Google'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
                    or with campus email
                  </span>
                  <div className="border-t border-slate-200 w-full"></div>
                </div>

                {/* Main Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Full Name field for registration */}
                  {mode === 'register' && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Maya Chen"
                          className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Email Field with validation */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Campus / Professional Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onBlur={() => {
                          setTouchedEmail(true);
                          validateEmailFormat(email);
                        }}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        placeholder="name@campus.edu"
                        className={`w-full pl-10 pr-10 py-2.5 text-sm border rounded-xl focus:outline-hidden transition-all ${
                          emailError && touchedEmail
                            ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/10 bg-rose-50/20'
                            : 'border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
                        }`}
                      />
                      {!emailError && touchedEmail && email && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3.5 top-3" />
                      )}
                    </div>
                    {emailError && touchedEmail && (
                      <p className="text-[11px] text-rose-600 mt-1">{emailError}</p>
                    )}
                  </div>

                  {/* Password Field with Eye Toggle & Caps Lock Detection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Password</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot');
                            setForgotEmail(email);
                            setError(null);
                          }}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onKeyDown={handleKeyActivity}
                        onKeyUp={handleKeyActivity}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition-colors focus:outline-hidden cursor-pointer"
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

                  {/* Role Selector Card for Registration */}
                  {mode === 'register' && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">Role & Access Level</label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label
                          className={`flex items-start gap-2 p-2.5 border rounded-xl cursor-pointer transition-all ${
                            role === 'Student'
                              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold shadow-2xs'
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
                          <div>
                            <span className="block font-semibold">Student / Attendee</span>
                            <span className="text-[10px] text-slate-500 font-normal">Discover & reserve passes</span>
                          </div>
                        </label>
                        <label
                          className={`flex items-start gap-2 p-2.5 border rounded-xl cursor-pointer transition-all ${
                            role === 'Organizer'
                              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold shadow-2xs'
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
                          <div>
                            <span className="block font-semibold">Event Organizer</span>
                            <span className="text-[10px] text-slate-500 font-normal">Book venues & export rosters</span>
                          </div>
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        * Administrator privileges are pre-configured by campus IT governance.
                      </p>
                    </motion.div>
                  )}

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span>Remember this device</span>
                    </label>
                  </div>

                  {/* Animated Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-slate-900/10 transition-colors disabled:opacity-50 cursor-pointer mt-2"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Authenticating...</span>
                      </div>
                    ) : (
                      <>
                        <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Create My Account'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Row-Level Security Active</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">v2.4 Production</span>
          </div>
        </div>
      </div>
    </div>
  );
};
