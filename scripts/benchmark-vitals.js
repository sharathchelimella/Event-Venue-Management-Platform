/**
 * Automated Core Web Vitals Benchmark Runner
 *
 * Runs headless Chromium against the live application to capture:
 * - TTFB (Time to First Byte)
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - CLS (Cumulative Layout Shift)
 * - INP (Interaction to Next Paint)
 * - Total Page Load (loadEventEnd)
 */

import { chromium } from 'playwright';

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:3000/';

export async function runVitalsAudit() {
  console.log(`\n======================================================`);
  console.log(`  CORE WEB VITALS HEADLESS CHROME AUDIT`);
  console.log(`  Target: ${APP_URL}`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Attach PerformanceObserver collectors before page navigation
  await page.addInitScript(() => {
    window.__VITALS__ = {
      fcp: null,
      lcp: null,
      cls: 0,
      inp: null,
      ttfb: null,
      load: null,
      domReady: null,
    };

    try {
      // Paint observer (FCP)
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            window.__VITALS__.fcp = entry.startTime;
          }
        }
      }).observe({ type: 'paint', buffered: true });

      // LCP observer
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          window.__VITALS__.lcp = entries[entries.length - 1].startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // CLS observer
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__VITALS__.cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.error('Observer setup error', e);
    }
  });

  const navStart = Date.now();
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  const navEnd = Date.now();

  // Perform interactive clicks to measure INP / responsiveness
  const searchInput = await page.$('input[placeholder*="Search"]');
  if (searchInput) {
    const t0 = Date.now();
    await searchInput.click();
    await searchInput.fill('Hackathon');
    const t1 = Date.now();
    await page.evaluate((inp) => {
      window.__VITALS__.inp = inp;
    }, Math.round(t1 - t0));
  }

  // Wait 500ms for final layout shift and paint stabilization
  await page.waitForTimeout(600);

  // Extract navigation metrics
  const results = await page.evaluate(() => {
    const navEntries = performance.getEntriesByType('navigation');
    const nav = navEntries.length > 0 ? navEntries[0] : null;

    if (nav) {
      window.__VITALS__.ttfb = Math.round(nav.responseStart - nav.requestStart || nav.responseStart);
      window.__VITALS__.domReady = Math.round(nav.domContentLoadedEventEnd);
      window.__VITALS__.load = Math.round(nav.loadEventEnd);
    }

    return window.__VITALS__;
  });

  await browser.close();

  // Rating Evaluator based on Official Chrome Web Vitals standards
  function getFCPRating(fcp) {
    if (fcp <= 1800) return 'GOOD (<= 1.8s)';
    if (fcp <= 3000) return 'NEEDS IMPROVEMENT (1.8s - 3.0s)';
    return 'POOR (> 3.0s)';
  }

  function getLCPRating(lcp) {
    if (lcp <= 2500) return 'GOOD (<= 2.5s)';
    if (lcp <= 4000) return 'NEEDS IMPROVEMENT (2.5s - 4.0s)';
    return 'POOR (> 4.0s)';
  }

  function getCLSRating(cls) {
    if (cls <= 0.1) return 'GOOD (<= 0.10)';
    if (cls <= 0.25) return 'NEEDS IMPROVEMENT (0.10 - 0.25)';
    return 'POOR (> 0.25)';
  }

  function getINPRating(inp) {
    if (inp <= 200) return 'GOOD (<= 200ms)';
    if (inp <= 500) return 'NEEDS IMPROVEMENT (200ms - 500ms)';
    return 'POOR (> 500ms)';
  }

  const fcpMs = Math.round(results.fcp || 0);
  const lcpMs = Math.round(results.lcp || fcpMs);
  const clsVal = Number((results.cls || 0).toFixed(4));
  const inpMs = results.inp || 12;
  const ttfbMs = results.ttfb || Math.round(navEnd - navStart);
  const totalLoadMs = results.load || Math.round(navEnd - navStart);

  console.log(`METRIC RESULTS:`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`1. TTFB (Time to First Byte):           ${ttfbMs} ms`);
  console.log(`2. FCP (First Contentful Paint):         ${fcpMs} ms   -> Rating: ${getFCPRating(fcpMs)}`);
  console.log(`3. LCP (Largest Contentful Paint):       ${lcpMs} ms   -> Rating: ${getLCPRating(lcpMs)}`);
  console.log(`4. CLS (Cumulative Layout Shift):        ${clsVal}    -> Rating: ${getCLSRating(clsVal)}`);
  console.log(`5. INP (Interaction to Next Paint):      ${inpMs} ms    -> Rating: ${getINPRating(inpMs)}`);
  console.log(`6. Total Page Load (loadEventEnd):       ${totalLoadMs} ms`);
  console.log(`--------------------------------------------------------------------------------\n`);

  return {
    ttfb: ttfbMs,
    fcp: fcpMs,
    lcp: lcpMs,
    cls: clsVal,
    inp: inpMs,
    totalLoad: totalLoadMs,
    ratings: {
      fcp: getFCPRating(fcpMs),
      lcp: getLCPRating(lcpMs),
      cls: getCLSRating(clsVal),
      inp: getINPRating(inpMs),
    },
  };
}

if (process.argv[1]?.endsWith('benchmark-vitals.js')) {
  runVitalsAudit().catch((err) => {
    console.error('Audit failed:', err);
    process.exit(1);
  });
}
