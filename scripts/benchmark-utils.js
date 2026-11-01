/**
 * CampusEventHub Benchmark & Performance Engineering Utilities
 *
 * Provides shared statistical functions, Node.js runtime telemetry (CPU, heap,
 * event-loop lag, event-loop utilization), connection pooling, Playwright integration,
 * CSV/JSON reporting, and Local vs Cloud latency decomposition.
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { URL } from 'url';
import { performance, monitorEventLoopDelay, PerformanceObserver } from 'perf_hooks';

// Prevent unhandled EPIPE when piping output
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
});

export const REPORTS_DIR = path.resolve(process.cwd(), 'reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// High socket keep-alive agents
export const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 1000 });
export const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 1000 });

// -----------------------------------------------------------------------------
// 1. Node.js Runtime Monitoring (CPU, Memory, Event-Loop Lag & Utilization)
// -----------------------------------------------------------------------------

export function startRuntimeMonitor() {
  const startCpu = process.cpuUsage();
  const startMem = process.memoryUsage();
  const startElu = performance.eventLoopUtilization();
  const startTime = performance.now();

  // Event loop delay monitor with 10ms resolution
  const loopDelay = monitorEventLoopDelay({ resolution: 10 });
  loopDelay.enable();

  // Track GC activity where supported
  let gcCount = 0;
  let totalGcDurationMs = 0;
  let gcObserver = null;

  try {
    gcObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        gcCount++;
        totalGcDurationMs += entry.duration;
      }
    });
    gcObserver.observe({ entryTypes: ['gc'] });
  } catch {
    // GC observation may not be available without flags in some environments
  }

  // Periodic memory sampler to capture peak memory
  let peakRss = startMem.rss;
  let peakHeapUsed = startMem.heapUsed;
  const sampler = setInterval(() => {
    const m = process.memoryUsage();
    if (m.rss > peakRss) peakRss = m.rss;
    if (m.heapUsed > peakHeapUsed) peakHeapUsed = m.heapUsed;
  }, 100);

  return {
    startCpu,
    startMem,
    startElu,
    startTime,
    loopDelay,
    gcObserver,
    sampler,
    getPeak: () => ({ peakRss, peakHeapUsed }),
    getGcStats: () => ({ gcCount, totalGcDurationMs }),
  };
}

export function stopRuntimeMonitor(monitor) {
  clearInterval(monitor.sampler);
  monitor.loopDelay.disable();
  if (monitor.gcObserver) {
    try {
      monitor.gcObserver.disconnect();
    } catch {
      // Disconnect cleanly
    }
  }

  const endCpu = process.cpuUsage(monitor.startCpu);
  const endMem = process.memoryUsage();
  const endElu = performance.eventLoopUtilization(monitor.startElu);
  const durationMs = performance.now() - monitor.startTime;
  const { peakRss, peakHeapUsed } = monitor.getPeak();
  const { gcCount, totalGcDurationMs } = monitor.getGcStats();

  // Convert CPU microseconds to ms
  const cpuUserMs = endCpu.user / 1000;
  const cpuSystemMs = endCpu.system / 1000;
  const totalCpuMs = cpuUserMs + cpuSystemMs;
  const cpuPercent = durationMs > 0 ? (totalCpuMs / durationMs) * 100 : 0;

  // Event loop delay in milliseconds (nanoseconds / 1e6)
  const loopLagMin = monitor.loopDelay.min / 1e6;
  const loopLagMean = monitor.loopDelay.mean / 1e6;
  const loopLagP50 = monitor.loopDelay.percentile(50) / 1e6;
  const loopLagP90 = monitor.loopDelay.percentile(90) / 1e6;
  const loopLagP95 = monitor.loopDelay.percentile(95) / 1e6;
  const loopLagP99 = monitor.loopDelay.percentile(99) / 1e6;
  const loopLagMax = monitor.loopDelay.max / 1e6;

  return {
    durationMs,
    cpu: {
      userMs: cpuUserMs,
      systemMs: cpuSystemMs,
      totalMs: totalCpuMs,
      percent: cpuPercent,
    },
    memory: {
      startHeapUsedMb: monitor.startMem.heapUsed / (1024 * 1024),
      endHeapUsedMb: endMem.heapUsed / (1024 * 1024),
      peakHeapUsedMb: peakHeapUsed / (1024 * 1024),
      heapDeltaMb: (endMem.heapUsed - monitor.startMem.heapUsed) / (1024 * 1024),
      startRssMb: monitor.startMem.rss / (1024 * 1024),
      endRssMb: endMem.rss / (1024 * 1024),
      peakRssMb: peakRss / (1024 * 1024),
      externalMb: endMem.external / (1024 * 1024),
    },
    eventLoop: {
      utilizationPercent: (endElu.utilization || 0) * 100,
      lagMinMs: isFinite(loopLagMin) ? loopLagMin : 0,
      lagMeanMs: isFinite(loopLagMean) ? loopLagMean : 0,
      lagP50Ms: isFinite(loopLagP50) ? loopLagP50 : 0,
      lagP90Ms: isFinite(loopLagP90) ? loopLagP90 : 0,
      lagP95Ms: isFinite(loopLagP95) ? loopLagP95 : 0,
      lagP99Ms: isFinite(loopLagP99) ? loopLagP99 : 0,
      lagMaxMs: isFinite(loopLagMax) ? loopLagMax : 0,
    },
    gc: {
      count: gcCount,
      durationMs: totalGcDurationMs,
    },
  };
}

// -----------------------------------------------------------------------------
// 2. Statistical Metrics & Percentile Calculation
// -----------------------------------------------------------------------------

export function computeMetrics(results, wallTimeSeconds) {
  if (!results || results.length === 0) return null;

  const latencies = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const totalDuration = latencies.reduce((sum, v) => sum + v, 0);
  const count = latencies.length;

  const getPercentile = (p) => {
    if (count === 1) return latencies[0];
    const index = (p / 100) * (count - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return latencies[lower] * (1 - weight) + latencies[upper] * weight;
  };

  const min = latencies[0];
  const max = latencies[count - 1];
  const mean = totalDuration / count;
  const p50 = getPercentile(50);
  const p90 = getPercentile(90);
  const p95 = getPercentile(95);
  const p99 = getPercentile(99);

  let successfulResponses = 0;
  let expectedErrors = 0;
  let unexpectedErrors = 0;
  let networkFailures = 0;
  let timeouts = 0;

  for (const r of results) {
    if (r.statusCode === 408 || r.isTimeout) {
      timeouts++;
    } else if (r.statusCode === 0 || r.networkError) {
      networkFailures++;
    } else if (r.isExpectedError) {
      expectedErrors++;
    } else if (r.success) {
      successfulResponses++;
    } else {
      unexpectedErrors++;
    }
  }

  const badFailures = unexpectedErrors + networkFailures + timeouts;
  const errorRate = count > 0 ? (badFailures / count) * 100 : 0;
  const throughput = wallTimeSeconds > 0 ? count / wallTimeSeconds : 0;

  return {
    totalRequests: count,
    wallTimeSeconds,
    min,
    max,
    mean,
    p50,
    p90,
    p95,
    p99,
    throughput,
    successfulResponses,
    expectedErrors,
    unexpectedErrors,
    networkFailures,
    timeouts,
    errorRate,
  };
}

// -----------------------------------------------------------------------------
// 3. HTTP / HTTPS Request Client
// -----------------------------------------------------------------------------

export function makeSingleRequest(baseUrl, endpoint, options = {}) {
  const { timeout = 10000, cookieHeader = '' } = options;

  return new Promise((resolve) => {
    const targetUrl = new URL(endpoint.path, baseUrl);
    const isHttps = targetUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;

    const headers = { ...endpoint.headers };
    if (cookieHeader) headers['Cookie'] = cookieHeader;
    if (endpoint.body) headers['Content-Length'] = Buffer.byteLength(endpoint.body);

    const reqOptions = {
      method: endpoint.method || 'GET',
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      headers,
      agent,
      timeout,
    };

    const startTime = process.hrtime.bigint();

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1e6;

        const expected = Array.isArray(endpoint.expectedStatus)
          ? endpoint.expectedStatus
          : [endpoint.expectedStatus || 200];

        const isSuccess = expected.includes(res.statusCode) && res.statusCode >= 200 && res.statusCode < 400;
        const isExpectedError = expected.includes(res.statusCode) && res.statusCode >= 400;

        resolve({
          statusCode: res.statusCode,
          durationMs,
          success: isSuccess,
          isExpectedError,
          networkError: false,
          isTimeout: false,
          bytes: Buffer.byteLength(data),
        });
      });
    });

    req.on('error', (err) => {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1e6;
      resolve({
        statusCode: 0,
        durationMs,
        success: false,
        isExpectedError: false,
        networkError: true,
        error: err.message,
        isTimeout: false,
        bytes: 0,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 408,
        durationMs: timeout,
        success: false,
        isExpectedError: false,
        networkError: true,
        isTimeout: true,
        error: 'Request Timeout',
        bytes: 0,
      });
    });

    if (endpoint.body) req.write(endpoint.body);
    req.end();
  });
}

export async function makePlaywrightRequest(pwContext, baseUrl, endpoint, options = {}) {
  const { timeout = 10000 } = options;
  const targetUrl = new URL(endpoint.path, baseUrl).toString();
  const startTime = process.hrtime.bigint();

  try {
    const reqOptions = {
      headers: { ...endpoint.headers },
      timeout,
    };
    if (endpoint.body) reqOptions.data = endpoint.body;

    let response;
    if (endpoint.method === 'POST') {
      response = await pwContext.request.post(targetUrl, reqOptions);
    } else if (endpoint.method === 'DELETE') {
      response = await pwContext.request.delete(targetUrl, reqOptions);
    } else {
      response = await pwContext.request.get(targetUrl, reqOptions);
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;
    const status = response.status();

    const expected = Array.isArray(endpoint.expectedStatus)
      ? endpoint.expectedStatus
      : [endpoint.expectedStatus || 200];

    const isSuccess = expected.includes(status) && status >= 200 && status < 400;
    const isExpectedError = expected.includes(status) && status >= 400;

    return {
      statusCode: status,
      durationMs,
      success: isSuccess,
      isExpectedError,
      networkError: false,
      isTimeout: false,
    };
  } catch (err) {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;
    const isTimeout = err.message?.includes('Timeout') || err.message?.includes('timeout');
    return {
      statusCode: isTimeout ? 408 : 0,
      durationMs,
      success: false,
      isExpectedError: false,
      networkError: true,
      isTimeout,
      error: err.message,
    };
  }
}

// -----------------------------------------------------------------------------
// 4. Concurrency Runner & Warm-Up Engine
// -----------------------------------------------------------------------------

export async function runLoadTier(baseUrl, endpoint, options = {}) {
  const {
    concurrency = 10,
    totalRequests = 100,
    timeout = 10000,
    rampUpMs = 0,
    pwContext = null,
    cookieHeader = '',
  } = options;

  let dispatched = 0;
  const results = [];
  const wallStart = process.hrtime.bigint();

  const worker = async (workerIndex) => {
    // Optional ramp-up delay per worker
    if (rampUpMs > 0 && concurrency > 1) {
      const delay = (rampUpMs / concurrency) * workerIndex;
      await new Promise((r) => setTimeout(r, delay));
    }

    while (true) {
      const current = dispatched++;
      if (current >= totalRequests) break;

      const res = pwContext
        ? await makePlaywrightRequest(pwContext, baseUrl, endpoint, { timeout })
        : await makeSingleRequest(baseUrl, endpoint, { timeout, cookieHeader });
      results.push(res);
    }
  };

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i));
  await Promise.all(workers);

  const wallEnd = process.hrtime.bigint();
  const wallSeconds = Number(wallEnd - wallStart) / 1e9;

  return computeMetrics(results, wallSeconds);
}

export async function runWarmUpRequests(baseUrl, endpoint, count = 25, options = {}) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(
      options.pwContext
        ? makePlaywrightRequest(options.pwContext, baseUrl, endpoint, options)
        : makeSingleRequest(baseUrl, endpoint, options)
    );
  }
  await Promise.all(promises);
}

// -----------------------------------------------------------------------------
// 5. Local vs Cloud Latency Comparison & Decomposition
// -----------------------------------------------------------------------------

export function compareEnvironments(localStats, cloudStats) {
  if (!localStats || !cloudStats) return null;

  const deltaP50 = cloudStats.p50 - localStats.p50;
  const deltaP95 = cloudStats.p95 - localStats.p95;
  const deltaMean = cloudStats.mean - localStats.mean;

  const percentChangeMean = localStats.mean > 0 ? (deltaMean / localStats.mean) * 100 : 0;
  const percentChangeP50 = localStats.p50 > 0 ? (deltaP50 / localStats.p50) * 100 : 0;
  const percentChangeP95 = localStats.p95 > 0 ? (deltaP95 / localStats.p95) * 100 : 0;

  // Latency Decomposition:
  // Local latency = Backend Processing + DB Execution + Response Serialization + Loopback (<0.2ms)
  // Cloud latency = Local Server Latency + WAN Network Transit + DNS/TLS Handshake + Google Ingress Proxy
  const serverProcessingEstimateMs = localStats.mean;
  const networkTransitAndProxyEstimateMs = Math.max(0, cloudStats.mean - localStats.mean);

  return {
    deltaMeanMs: deltaMean,
    deltaP50Ms: deltaP50,
    deltaP95Ms: deltaP95,
    percentChangeMean,
    percentChangeP50,
    percentChangeP95,
    decomposition: {
      serverProcessingEstimateMs,
      networkTransitAndProxyEstimateMs,
      networkSharePercent:
        cloudStats.mean > 0 ? (networkTransitAndProxyEstimateMs / cloudStats.mean) * 100 : 0,
      serverSharePercent:
        cloudStats.mean > 0 ? (serverProcessingEstimateMs / cloudStats.mean) * 100 : 0,
    },
  };
}

// -----------------------------------------------------------------------------
// 6. Formatting & Reporting (ASCII, JSON, CSV)
// -----------------------------------------------------------------------------

export function fmtMs(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return 'N/A';
  if (ms < 0) return 'N/A';
  if (ms < 0.001) return (ms * 1e6).toFixed(1) + ' ns';
  if (ms < 0.01) return (ms * 1000).toFixed(2) + ' µs';
  if (ms < 0.1) return (ms * 1000).toFixed(1) + ' µs';
  if (ms < 1) return ms.toFixed(3) + ' ms';
  if (ms < 10) return ms.toFixed(2) + ' ms';
  if (ms < 100) return ms.toFixed(1) + ' ms';
  return Math.round(ms) + ' ms';
}

export function fmtPreciseMs(ms, decimals = 4) {
  if (ms === null || ms === undefined || isNaN(ms) || ms < 0) return 'N/A';
  return ms.toFixed(decimals) + ' ms';
}

export function fmtMicroseconds(ms) {
  if (ms === null || ms === undefined || isNaN(ms) || ms < 0) return 'N/A';
  return (ms * 1000).toFixed(2) + ' µs';
}


export function getSystemInfo() {
  return {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
    freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
  };
}

export function saveJsonReport(name, data) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${ts}.json`;
  const filePath = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { filePath, filename };
}

export function saveCsvReport(name, headers, rows) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${ts}.csv`;
  const filePath = path.join(REPORTS_DIR, filename);
  const escapeCell = (val) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const content = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\n');

  fs.writeFileSync(filePath, content, 'utf-8');
  return { filePath, filename };
}
