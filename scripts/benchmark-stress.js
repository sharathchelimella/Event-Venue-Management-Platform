/**
 * CampusEventHub Stress Testing Suite
 *
 * Incrementally increases concurrency levels (10 -> 50 -> 100 -> 200 -> 300 -> 500 users)
 * to identify the server saturation point, maximum sustainable throughput (req/s),
 * and the inflection point where queue latency escalates or errors emerge.
 */

import {
  startRuntimeMonitor,
  stopRuntimeMonitor,
  runLoadTier,
  runWarmUpRequests,
  fmtMs,
  getSystemInfo,
  saveJsonReport,
  saveCsvReport,
} from './benchmark-utils.js';

const args = process.argv.slice(2);
const quickMode = args.includes('--quick');
const targetArg = args.find((a) => a.startsWith('--target='))?.split('=')[1] || 'local';
const LOCAL_BASE_URL = 'http://127.0.0.1:3000';
const CLOUD_BASE_URL =
  process.env.CLOUD_RUN_URL ||
  'https://ais-dev-bi6cb36iby3uez5dtkx6wu-799994418742.asia-northeast1.run.app';

const baseUrl = targetArg === 'cloud' ? CLOUD_BASE_URL : LOCAL_BASE_URL;

// Concurrency escalation ladder
const ladder = quickMode
  ? [10, 50, 100, 200]
  : [10, 50, 100, 200, 300, 400, 500];

const requestsPerStage = quickMode ? 100 : 300;

// High-impact multi-table test scenario
const STRESS_SCENARIO = {
  id: 'events-approved',
  name: 'GET /api/events/approved',
  category: 'Relational DB Load',
  path: '/api/events/approved',
  method: 'GET',
  headers: {},
  expectedStatus: 200,
};

async function main() {
  const sysInfo = getSystemInfo();
  console.log(`\n========================================================================================================`);
  console.log(`  STRESS BENCHMARK: CONCURRENCY SATURATION & BREAKING POINT ANALYSIS`);
  console.log(`  Target: ${baseUrl}`);
  console.log(`  Concurrency Ladder: ${ladder.join(' -> ')} concurrent users`);
  console.log(`  Requests Per Step: ${requestsPerStage}`);
  console.log(`========================================================================================================\n`);

  process.stdout.write('  Warming up engine (30 requests)... ');
  await runWarmUpRequests(baseUrl, STRESS_SCENARIO, 30);
  console.log('Done.\n');

  console.log(
    `  ┌──────────┬──────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬──────────┬────────┬────────┬───────┐`
  );
  console.log(
    `  │ Concurr. │ Reqs │ Min     │ Mean    │ p50     │ p90     │ p95     │ p99     │ Through. │ Err %  │ CPU %  │ ELU % │`
  );
  console.log(
    `  ├──────────┼──────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────────┼────────┼────────┼───────┤`
  );

  const stageResults = [];
  let peakThroughput = 0;
  let peakThroughputConcurrency = 0;
  let saturationThreshold = null;

  for (const c of ladder) {
    const monitor = startRuntimeMonitor();

    const metrics = await runLoadTier(baseUrl, STRESS_SCENARIO, {
      concurrency: c,
      totalRequests: requestsPerStage,
      timeout: 10000,
    });

    const runtime = stopRuntimeMonitor(monitor);

    if (metrics.throughput > peakThroughput) {
      peakThroughput = metrics.throughput;
      peakThroughputConcurrency = c;
    }

    // Saturation marker: p95 exceeds 100ms or error rate > 1%
    if (!saturationThreshold && (metrics.p95 > 100 || metrics.errorRate > 1)) {
      saturationThreshold = {
        concurrency: c,
        p95: metrics.p95,
        errorRate: metrics.errorRate,
        throughput: metrics.throughput,
      };
    }

    stageResults.push({ concurrency: c, metrics, runtime });

    const cCol = `${c} users`.padEnd(8);
    const reqCol = `${metrics.totalRequests}`.padStart(4);
    const minCol = fmtMs(metrics.min).padStart(7);
    const meanCol = fmtMs(metrics.mean).padStart(7);
    const p50Col = fmtMs(metrics.p50).padStart(7);
    const p90Col = fmtMs(metrics.p90).padStart(7);
    const p95Col = fmtMs(metrics.p95).padStart(7);
    const p99Col = fmtMs(metrics.p99).padStart(7);
    const rpsCol = `${metrics.throughput.toFixed(0)} r/s`.padStart(8);
    const errCol = `${metrics.errorRate.toFixed(1)}%`.padStart(6);
    const cpuCol = `${runtime.cpu.percent.toFixed(0)}%`.padStart(6);
    const eluCol = `${runtime.eventLoop.utilizationPercent.toFixed(0)}%`.padStart(5);

    console.log(
      `  │ ${cCol} │ ${reqCol} │ ${minCol} │ ${meanCol} │ ${p50Col} │ ${p90Col} │ ${p95Col} │ ${p99Col} │ ${rpsCol} │ ${errCol} │ ${cpuCol} │ ${eluCol} │`
    );
  }

  console.log(
    `  └──────────┴──────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴──────────┴────────┴────────┴───────┘\n`
  );

  console.log(`========================================================================================================`);
  console.log(`  STRESS TEST FINDINGS`);
  console.log(`========================================================================================================`);
  console.log(`  • Maximum Sustainable Throughput:  ${peakThroughput.toFixed(0)} requests/sec at ${peakThroughputConcurrency} concurrent users`);
  if (saturationThreshold) {
    console.log(`  • Latency Saturation Point:        ${saturationThreshold.concurrency} concurrent users (p95 reached ${fmtMs(saturationThreshold.p95)})`);
  } else {
    console.log(`  • Latency Saturation Point:        Not exceeded (all tiers remained within nominal thresholds)`);
  }
  console.log(`========================================================================================================\n`);

  // Report export
  const reportData = {
    system: sysInfo,
    config: { baseUrl, ladder, requestsPerStage },
    peakThroughput,
    peakThroughputConcurrency,
    saturationThreshold,
    stages: stageResults,
  };

  const jsonReport = saveJsonReport('benchmark-stress', reportData);
  console.log(`  [Report] JSON report generated: ${jsonReport.filePath}`);

  const csvHeaders = ['Concurrency', 'Requests', 'MeanMs', 'p50Ms', 'p90Ms', 'p95Ms', 'p99Ms', 'ThroughputRps', 'ErrPercent', 'CpuPercent', 'ELUPercent'];
  const csvRows = stageResults.map((s) => [
    s.concurrency,
    s.metrics.totalRequests,
    s.metrics.mean.toFixed(2),
    s.metrics.p50.toFixed(2),
    s.metrics.p90.toFixed(2),
    s.metrics.p95.toFixed(2),
    s.metrics.p99.toFixed(2),
    s.metrics.throughput.toFixed(1),
    s.metrics.errorRate.toFixed(2),
    s.runtime.cpu.percent.toFixed(1),
    s.runtime.eventLoop.utilizationPercent.toFixed(1),
  ]);
  const csvReport = saveCsvReport('benchmark-stress', csvHeaders, csvRows);
  console.log(`  [Report] CSV report generated:  ${csvReport.filePath}\n`);
}

main().catch((err) => {
  console.error('Fatal stress benchmark error:', err);
  process.exit(1);
});
