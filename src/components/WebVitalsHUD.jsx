import React, { useState, useEffect } from 'react';
import { webVitals, getVitalRating, VITALS_THRESHOLDS } from '../services/webVitals.js';
import { Activity, X, ChevronDown, ChevronUp, RefreshCw, Zap, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

export const WebVitalsHUD = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState(webVitals.getMetrics());
  const [minimized, setMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('vitals');

  useEffect(() => {
    webVitals.init();
    const unsubscribe = webVitals.subscribe((data) => {
      setMetrics(data);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const getStatusBadge = (rating) => {
    switch (rating) {
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Good
          </span>
        );
      case 'needs-improvement':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Needs Work
          </span>
        );
      case 'poor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            Poor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Measuring...
          </span>
        );
    }
  };

  const handleTestInteraction = () => {
    webVitals.measureInteractionLatency();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-300 rounded-xl shadow-2xl overflow-hidden font-sans text-slate-900 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white select-none">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-xs tracking-tight">Core Web Vitals & Performance</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title={minimized ? 'Expand' : 'Collapse'}
          >
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Close Monitor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Executive Rating Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">Page Experience Status</span>
              {getStatusBadge(
                metrics.fcp && metrics.lcp
                  ? getVitalRating('fcp', metrics.fcp) === 'good' && getVitalRating('lcp', metrics.lcp) === 'good'
                    ? 'good'
                    : 'needs-improvement'
                  : 'pending'
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Standard Google Core Web Vitals measured live from browser <code className="font-mono text-slate-700">PerformanceObserver</code>.
            </p>
          </div>

          {/* Grid of Key Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* TTFB */}
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">TTFB</span>
                {getStatusBadge(getVitalRating('ttfb', metrics.ttfb))}
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                {metrics.ttfb !== null ? `${metrics.ttfb} ms` : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Time to First Byte</div>
            </div>

            {/* FCP */}
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">FCP</span>
                {getStatusBadge(getVitalRating('fcp', metrics.fcp))}
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                {metrics.fcp !== null ? `${metrics.fcp} ms` : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">First Contentful Paint</div>
            </div>

            {/* LCP */}
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">LCP</span>
                {getStatusBadge(getVitalRating('lcp', metrics.lcp))}
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                {metrics.lcp !== null ? `${metrics.lcp} ms` : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Largest Contentful Paint</div>
            </div>

            {/* CLS */}
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">CLS</span>
                {getStatusBadge(getVitalRating('cls', metrics.cls))}
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                {metrics.cls !== null ? metrics.cls.toFixed(4) : '0.0000'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Cumulative Layout Shift</div>
            </div>

            {/* INP */}
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">INP</span>
                {getStatusBadge(getVitalRating('inp', metrics.inp))}
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                {metrics.inp !== null ? `${metrics.inp} ms` : '< 16 ms'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Interaction to Next Paint</div>
            </div>

            {/* Total Page Load */}
            <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">Total Load</span>
                {getStatusBadge(getVitalRating('totalLoad', metrics.totalLoad))}
              </div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                {metrics.totalLoad !== null ? `${metrics.totalLoad} ms` : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Window Load Event</div>
            </div>
          </div>

          {/* Interactive INP Test Action */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              onClick={handleTestInteraction}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Test INP Interaction
            </button>
            <span className="text-[10px] text-slate-400">
              Good FCP: &le; 1800ms · LCP: &le; 2500ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
