/**
 * CampusEventHub Endurance & Soak Testing Suite
 *
 * Runs a continuous load test over a sustained duration (e.g., 30s to 5 minutes)
 * to monitor memory heap growth, identify potential memory leaks, and detect
 * socket starvation or latency degradation over time.
 */

import {
  makeSingleRequest,
  computeMetrics,
  fmtMs,
  getSystemInfo,
  saveJsonReport,
  saveCsvReport,
  startRuntimeMonitor,
  stopRuntimeMonitor,
} from './benchmark-utils.js';

const args = process.argv.slice(2);
const durationSeconds = parseInt(
  args.find((a) => a.startsWith('--duration='))?.split('=')[1] || (args.includes('--quick') ? '15' : '30'),
  10
);
const concurrency = parseInt(
  args.find((a) => a.startsWith('--concurrency='))?.split('=')[1] || '25',
  10
);
const sampleIntervalSec = 3;

const LOCAL_BASE_URL = 'http://127.0.0.1:3000';

const ENDURANCE_SCENARIO = {
  id: 'events-approved',
  name: 'GET /api/events/approved',
  path: '/api/events/approved',
  method: 'GET',
  headers: {},
  expectedStatus: 200,
};

async function main() {
  const sysInfo = getSystemInfo();
  console.log(`\n========================================================================================================`);
  console.log(`  ENDURANCE & MEMORY LEAK BENCHMARK`);
  console.log(`  Target: ${LOCAL_BASE_URL}`);
  console.log(`  Duration: ${durationSeconds} seconds | Concurrency: ${concurrency} users`);
  console.log(`  Sample Interval: every ${sampleIntervalSec} seconds`);
  console.log(`========================================================================================================\n`);

  console.log(
    `  ┌──────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐`
  );
  console.log(
    `  │ Elapsed  │ Reqs/Window  │ Window RPS   │ p50 Latency  │ p95 Latency  │ Heap Used    │ Process RSS  │`
  );
  console.log(
    `  ├──────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤`
  );

  const overallMonitor = startRuntimeMonitor();
  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;

  const timeSeries = [];
  let windowResults = [];
  let windowStart = Date.now();

  let stopWorkers = false;

  const worker = async () => {
    while (!stopWorkers && Date.now() < endTime) {
      const res = await makeSingleRequest(LOCAL_BASE_URL, ENDURANCE_SCENARIO, { timeout: 8000 });
      windowResults.push(res);
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());

  // Sampler interval
  const sampler = setInterval(() => {
    const now = Date.now();
    const elapsedSec = (now - startTime) / 1000;
    const windowSec = (now - windowStart) / 1000;

    const currentResults = [...windowResults];
    windowResults = [];
    windowStart = now;

    const mem = process.memoryUsage();
    const heapUsedMb = mem.heapUsed / (1024 * 1024);
    const rssMb = mem.rss / (1024 * 1024);

    const stats = computeMetrics(currentResults, windowSec);
    if (stats) {
      timeSeries.push({
        elapsedSec: Math.round(elapsedSec),
        requests: stats.totalRequests,
        throughput: stats.throughput,
        p50: stats.p50,
        p95: stats.p95,
        heapUsedMb,
        rssMb,
      });

      const elapCol = `${Math.round(elapsedSec)}s`.padStart(8);
      const reqCol = `${stats.totalRequests}`.padStart(12);
      const rpsCol = `${stats.throughput.toFixed(0)} req/s`.padStart(12);
      const p50Col = fmtMs(stats.p50).padStart(12);
      const p95Col = fmtMs(stats.p95).padStart(12);
      const heapCol = `${heapUsedMb.toFixed(2)} MB`.padStart(12);
      const rssCol = `${rssMb.toFixed(2)} MB`.padStart(12);

      console.log(
        `  │ ${elapCol} │ ${reqCol} │ ${rpsCol} │ ${p50Col} │ ${p95Col} │ ${heapCol} │ ${rssCol} │`
      );
    }
  }, sampleIntervalSec * 1000);

  await Promise.all(workers);
  clearInterval(sampler);
  stopWorkers = true;

  const runtime = stopRuntimeMonitor(overallMonitor);

  console.log(
    `  └──────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘\n`
  );

  // Compute slopes (memory leak detection and latency drift)
  const initialHeap = timeSeries[0]?.heapUsedMb || runtime.memory.startHeapUsedMb;
  const finalHeap = timeSeries[timeSeries.length - 1]?.heapUsedMb || runtime.memory.endHeapUsedMb;
  const heapDelta = finalHeap - initialHeap;
  const durationMin = durationSeconds / 60;
  const heapSlopePerMin = durationMin > 0 ? heapDelta / durationMin : 0;

  const initialP95 = timeSeries[0]?.p95 || 0;
  const finalP95 = timeSeries[timeSeries.length - 1]?.p95 || 0;
  const p95Drift = finalP95 - initialP95;

  console.log(`========================================================================================================`);
  console.log(`  ENDURANCE SUMMARY & LEAK AUDIT`);
  console.log(`========================================================================================================`);
  console.log(`  • Total Test Duration:    ${durationSeconds} seconds`);
  console.log(`  • Initial Heap:           ${initialHeap.toFixed(2)} MB -> Final Heap: ${finalHeap.toFixed(2)} MB (Delta: ${heapDelta > 0 ? '+' : ''}${heapDelta.toFixed(2)} MB)`);
  console.log(`  • Memory Growth Slope:    ${heapSlopePerMin.toFixed(2)} MB/minute ${Math.abs(heapSlopePerMin) < 5 ? '(HEALTHY: No memory leak detected)' : '(WARNING: Memory growth detected)'}`);
  console.log(`  • Latency Stability:      p95 drifted by ${p95Drift > 0 ? '+' : ''}${p95Drift.toFixed(2)} ms over test duration`);
  console.log(`  • Event Loop Mean Lag:    ${fmtMs(runtime.eventLoop.lagMeanMs)} (p95: ${fmtMs(runtime.eventLoop.lagP95Ms)})`);
  console.log(`========================================================================================================\n`);

  const reportData = {
    system: sysInfo,
    config: { durationSeconds, concurrency, sampleIntervalSec },
    heapGrowth: { initialHeap, finalHeap, heapDelta, heapSlopePerMin },
    latencyDrift: { initialP95, finalP95, p95Drift },
    runtime,
    timeSeries,
  };

  const jsonReport = saveJsonReport('benchmark-endurance', reportData);
  console.log(`  [Report] JSON report generated: ${jsonReport.filePath}`);

  const csvHeaders = ['ElapsedSeconds', 'Requests', 'ThroughputRps', 'p50Ms', 'p95Ms', 'HeapUsedMb', 'RssMb'];
  const csvRows = timeSeries.map((t) => [t.elapsedSec, t.requests, t.throughput.toFixed(1), t.p50.toFixed(2), t.p95.toFixed(2), t.heapUsedMb.toFixed(2), t.rssMb.toFixed(2)]);
  const csvReport = saveCsvReport('benchmark-endurance', csvHeaders, csvRows);
  console.log(`  [Report] CSV report generated:  ${csvReport.filePath}\n`);
}

main().catch((err) => {
  console.error('Fatal endurance benchmark error:', err);
  process.exit(1);
});
