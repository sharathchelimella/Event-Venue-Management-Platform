/**
 * CampusEventHub Spike Testing Suite
 *
 * Simulates abrupt, explosive surges in student traffic (e.g., sudden event ticket drops)
 * to evaluate server shock absorption, error generation during spikes, and recovery time.
 */

import {
  runLoadTier,
  runWarmUpRequests,
  fmtMs,
  getSystemInfo,
  saveJsonReport,
  saveCsvReport,
  startRuntimeMonitor,
  stopRuntimeMonitor,
} from './benchmark-utils.js';

const args = process.argv.slice(2);
const quickMode = args.includes('--quick');
const baselineUsers = 10;
const spikeUsers = quickMode ? 100 : 200;
const baselineRequests = quickMode ? 100 : 250;
const spikeRequests = quickMode ? 250 : 600;

const LOCAL_BASE_URL = 'http://127.0.0.1:3000';

const SPIKE_SCENARIO = {
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
  console.log(`  SPIKE BENCHMARK: ABRUPT TRAFFIC SURGE & RECOVERY ANALYSIS`);
  console.log(`  Target: ${LOCAL_BASE_URL}`);
  console.log(`  Profile: Baseline (${baselineUsers} users) -> SPIKE (${spikeUsers} users) -> Recovery (${baselineUsers} users)`);
  console.log(`========================================================================================================\n`);

  process.stdout.write('  Warming up engine (30 requests)... ');
  await runWarmUpRequests(LOCAL_BASE_URL, SPIKE_SCENARIO, 30);
  console.log('Done.\n');

  console.log(
    `  ┌─────────────────────┬──────────┬──────────┬─────────┬─────────┬─────────┬─────────┬──────────┬────────┐`
  );
  console.log(
    `  │ Phase               │ Concurr. │ Requests │ Mean    │ p50     │ p95     │ p99     │ Through. │ Err %  │`
  );
  console.log(
    `  ├─────────────────────┼──────────┼──────────┼─────────┼─────────┼─────────┼─────────┼──────────┼────────┤`
  );

  // Phase 1: Baseline
  const mon1 = startRuntimeMonitor();
  const baselineStats = await runLoadTier(LOCAL_BASE_URL, SPIKE_SCENARIO, {
    concurrency: baselineUsers,
    totalRequests: baselineRequests,
  });
  const run1 = stopRuntimeMonitor(mon1);

  console.log(
    `  │ Phase 1: Baseline   │ ${`${baselineUsers} users`.padEnd(8)} │ ${`${baselineStats.totalRequests}`.padStart(8)} │ ${fmtMs(baselineStats.mean).padStart(7)} │ ${fmtMs(baselineStats.p50).padStart(7)} │ ${fmtMs(baselineStats.p95).padStart(7)} │ ${fmtMs(baselineStats.p99).padStart(7)} │ ${`${baselineStats.throughput.toFixed(0)} r/s`.padStart(8)} │ ${`${baselineStats.errorRate.toFixed(1)}%`.padStart(6)} │`
  );

  // Phase 2: Instant Spike
  const mon2 = startRuntimeMonitor();
  const spikeStats = await runLoadTier(LOCAL_BASE_URL, SPIKE_SCENARIO, {
    concurrency: spikeUsers,
    totalRequests: spikeRequests,
  });
  const run2 = stopRuntimeMonitor(mon2);

  console.log(
    `  │ Phase 2: SPIKE SURGE│ ${`${spikeUsers} users`.padEnd(8)} │ ${`${spikeStats.totalRequests}`.padStart(8)} │ ${fmtMs(spikeStats.mean).padStart(7)} │ ${fmtMs(spikeStats.p50).padStart(7)} │ ${fmtMs(spikeStats.p95).padStart(7)} │ ${fmtMs(spikeStats.p99).padStart(7)} │ ${`${spikeStats.throughput.toFixed(0)} r/s`.padStart(8)} │ ${`${spikeStats.errorRate.toFixed(1)}%`.padStart(6)} │`
  );

  // Phase 3: Immediate Recovery
  const mon3 = startRuntimeMonitor();
  const recoveryStats = await runLoadTier(LOCAL_BASE_URL, SPIKE_SCENARIO, {
    concurrency: baselineUsers,
    totalRequests: baselineRequests,
  });
  const run3 = stopRuntimeMonitor(mon3);

  console.log(
    `  │ Phase 3: Recovery   │ ${`${baselineUsers} users`.padEnd(8)} │ ${`${recoveryStats.totalRequests}`.padStart(8)} │ ${fmtMs(recoveryStats.mean).padStart(7)} │ ${fmtMs(recoveryStats.p50).padStart(7)} │ ${fmtMs(recoveryStats.p95).padStart(7)} │ ${fmtMs(recoveryStats.p99).padStart(7)} │ ${`${recoveryStats.throughput.toFixed(0)} r/s`.padStart(8)} │ ${`${recoveryStats.errorRate.toFixed(1)}%`.padStart(6)} │`
  );

  console.log(
    `  └─────────────────────┴──────────┴──────────┴─────────┴─────────┴─────────┴─────────┴──────────┴────────┘\n`
  );

  // Recovery evaluation
  const latencyOverhead = recoveryStats.mean - baselineStats.mean;
  const isRecovered = recoveryStats.mean <= baselineStats.mean * 1.35;

  console.log(`========================================================================================================`);
  console.log(`  SPIKE RESILIENCE ASSESSMENT`);
  console.log(`========================================================================================================`);
  console.log(`  • Spike Concurrency Surge:     ${baselineUsers} -> ${spikeUsers} users (+${((spikeUsers / baselineUsers) * 100).toFixed(0)}% traffic leap)`);
  console.log(`  • Spike Error Generation:      ${spikeStats.errorRate.toFixed(2)}% unexpected errors`);
  console.log(`  • Peak Throughput During Surge: ${spikeStats.throughput.toFixed(0)} requests/sec`);
  console.log(`  • Post-Spike Baseline Latency:  ${fmtMs(recoveryStats.mean)} vs Initial ${fmtMs(baselineStats.mean)} (Delta: ${latencyOverhead > 0 ? '+' : ''}${fmtMs(latencyOverhead)})`);
  console.log(`  • System Recovery Status:      ${isRecovered ? 'RAPID RECOVERY (Full nominal performance restored immediately)' : 'LAGGED RECOVERY (Residual queue latency detected)'}`);
  console.log(`========================================================================================================\n`);

  const reportData = {
    system: sysInfo,
    config: { baselineUsers, spikeUsers, baselineRequests, spikeRequests },
    phases: [
      { name: 'Baseline', stats: baselineStats, runtime: run1 },
      { name: 'Spike', stats: spikeStats, runtime: run2 },
      { name: 'Recovery', stats: recoveryStats, runtime: run3 },
    ],
    resilience: { latencyOverhead, isRecovered },
  };

  const jsonReport = saveJsonReport('benchmark-spike', reportData);
  console.log(`  [Report] JSON report generated: ${jsonReport.filePath}`);

  const csvHeaders = ['Phase', 'Concurrency', 'Requests', 'MeanMs', 'p50Ms', 'p95Ms', 'p99Ms', 'ThroughputRps', 'ErrPercent'];
  const csvRows = [
    ['Baseline', baselineUsers, baselineStats.totalRequests, baselineStats.mean.toFixed(2), baselineStats.p50.toFixed(2), baselineStats.p95.toFixed(2), baselineStats.p99.toFixed(2), baselineStats.throughput.toFixed(1), baselineStats.errorRate.toFixed(2)],
    ['Spike', spikeUsers, spikeStats.totalRequests, spikeStats.mean.toFixed(2), spikeStats.p50.toFixed(2), spikeStats.p95.toFixed(2), spikeStats.p99.toFixed(2), spikeStats.throughput.toFixed(1), spikeStats.errorRate.toFixed(2)],
    ['Recovery', baselineUsers, recoveryStats.totalRequests, recoveryStats.mean.toFixed(2), recoveryStats.p50.toFixed(2), recoveryStats.p95.toFixed(2), recoveryStats.p99.toFixed(2), recoveryStats.throughput.toFixed(1), recoveryStats.errorRate.toFixed(2)],
  ];
  const csvReport = saveCsvReport('benchmark-spike', csvHeaders, csvRows);
  console.log(`  [Report] CSV report generated:  ${csvReport.filePath}\n`);
}

main().catch((err) => {
  console.error('Fatal spike benchmark error:', err);
  process.exit(1);
});
