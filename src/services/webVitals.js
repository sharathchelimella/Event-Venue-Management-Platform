/**
 * Core Web Vitals & Real User Monitoring (RUM) Telemetry Service
 *
 * Measures:
 * - TTFB (Time to First Byte): Navigation timing response start
 * - FCP (First Contentful Paint): First paint entry with content
 * - LCP (Largest Contentful Paint): Largest render candidate entry
 * - CLS (Cumulative Layout Shift): Cumulative session window shifts
 * - INP (Interaction to Next Paint): Longest interaction latency
 * - Total Page Load: Full window load event completion
 */

export const VITALS_THRESHOLDS = {
  fcp: { good: 1800, needsImprovement: 3000, unit: 'ms' },
  lcp: { good: 2500, needsImprovement: 4000, unit: 'ms' },
  cls: { good: 0.1, needsImprovement: 0.25, unit: '' },
  inp: { good: 200, needsImprovement: 500, unit: 'ms' },
  ttfb: { good: 800, needsImprovement: 1800, unit: 'ms' },
  totalLoad: { good: 2500, needsImprovement: 4000, unit: 'ms' },
};

export function getVitalRating(metric, value) {
  if (value === null || value === undefined) return 'pending';
  const thresholds = VITALS_THRESHOLDS[metric];
  if (!thresholds) return 'good';
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

class WebVitalsManager {
  constructor() {
    this.listeners = new Set();
    this.metrics = {
      ttfb: null,
      fcp: null,
      lcp: null,
      cls: 0,
      inp: null,
      totalLoad: null,
      domReady: null,
    };
    this.isInitialized = false;
    this.clsEntries = [];
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const current = this.getMetrics();
    for (const listener of this.listeners) {
      try {
        listener(current);
      } catch (err) {
        console.error('Web Vitals listener error', err);
      }
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Navigation Timing (TTFB, DOM Ready, Total Page Load)
    const checkNavigationTiming = () => {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        const ttfb = Math.max(0, Math.round(nav.responseStart - nav.requestStart || nav.responseStart));
        this.metrics.ttfb = ttfb;
        if (nav.domContentLoadedEventEnd > 0) {
          this.metrics.domReady = Math.round(nav.domContentLoadedEventEnd);
        }
        if (nav.loadEventEnd > 0) {
          this.metrics.totalLoad = Math.round(nav.loadEventEnd);
        }
        this.notify();
      }
    };

    if (document.readyState === 'complete') {
      checkNavigationTiming();
    } else {
      window.addEventListener('load', () => {
        setTimeout(checkNavigationTiming, 100);
      });
    }

    // 2. First Contentful Paint (FCP)
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const paintObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = Math.round(entry.startTime);
              this.notify();
              paintObserver.disconnect();
            }
          }
        });
        paintObserver.observe({ type: 'paint', buffered: true });
      } catch (e) {
        // Fallback: check already buffered entries
        const existing = performance.getEntriesByName('first-contentful-paint');
        if (existing.length > 0) {
          this.metrics.fcp = Math.round(existing[0].startTime);
          this.notify();
        }
      }

      // 3. Largest Contentful Paint (LCP)
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.metrics.lcp = Math.round(lastEntry.startTime);
            this.notify();
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // Finalize LCP upon user interaction (as per Web Vitals spec)
        ['keydown', 'click'].forEach((type) => {
          window.addEventListener(
            type,
            () => {
              lcpObserver.takeRecords();
              lcpObserver.disconnect();
            },
            { once: true, passive: true }
          );
        });
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // 4. Cumulative Layout Shift (CLS)
      try {
        let sessionValue = 0;
        let sessionEntries = [];

        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            // Only count shifts without recent user input
            if (!entry.hadRecentInput) {
              const firstSessionEntry = sessionEntries[0];
              const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

              // If entry is within 1s of previous and 5s of first in session
              if (
                sessionValue &&
                entry.startTime - lastSessionEntry.startTime < 1000 &&
                entry.startTime - firstSessionEntry.startTime < 5000
              ) {
                sessionValue += entry.value;
                sessionEntries.push(entry);
              } else {
                sessionValue = entry.value;
                sessionEntries = [entry];
              }

              if (sessionValue > this.metrics.cls) {
                this.metrics.cls = Number(sessionValue.toFixed(4));
                this.notify();
              }
            }
          }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        console.warn('CLS observer not supported');
      }

      // 5. Interaction to Next Paint (INP) / First Input Delay
      try {
        let maxInteractionDuration = 0;
        const eventObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.duration && entry.duration > maxInteractionDuration) {
              maxInteractionDuration = entry.duration;
              this.metrics.inp = Math.round(maxInteractionDuration);
              this.notify();
            }
          }
        });
        eventObserver.observe({
          type: 'event',
          buffered: true,
          durationThreshold: 16,
        });
      } catch (e) {
        // Fallback to first-input if 'event' timing is restricted
        try {
          const fidObserver = new PerformanceObserver((entryList) => {
            const firstInput = entryList.getEntries()[0];
            if (firstInput) {
              this.metrics.inp = Math.round(firstInput.processingStart - firstInput.startTime);
              this.notify();
            }
          });
          fidObserver.observe({ type: 'first-input', buffered: true });
        } catch {}
      }
    }
  }

  // Trigger synthetic interaction test to measure INP live
  measureInteractionLatency() {
    const start = performance.now();
    // Simulate UI state computation to calculate input-to-paint frame gap
    requestAnimationFrame(() => {
      const duration = Math.round(performance.now() - start);
      if (!this.metrics.inp || duration > this.metrics.inp) {
        this.metrics.inp = duration;
      }
      this.notify();
    });
  }
}

export const webVitals = new WebVitalsManager();
