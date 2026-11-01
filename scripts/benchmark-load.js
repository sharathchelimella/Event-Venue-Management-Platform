/**
 * CampusEventHub Advanced API Load Testing & Concurrency Benchmark
 *
 * Implements:
 * - Local vs Cloud Run execution and latency decomposition
 * - Concurrency tiers: 10, 50, 100, 200 (and optional 500)
 * - Complete metrics: Min, Mean, Max, p50, p90, p95, p99, Throughput, Error classification
 * - Node.js Runtime Monitoring: CPU %, Heap delta, Peak RSS, Event-Loop Lag, ELU %
 * - Deep Security & Auth Testing: Valid, Invalid credentials, Missing token, Malformed token,
 *   Unauthorized role (RLS 403), Non-existent resource (404)
 * - Automated JSON and CSV report generation
 */

import {
  makeSingleRequest,
  startRuntimeMonitor,
  stopRuntimeMonitor,
  runLoadTier,
  runWarmUpRequests,
  compareEnvironments,
  fmtMs,
  getSystemInfo,
  saveJsonReport,
  saveCsvReport,
} from './benchmark-utils.js';

// Parse CLI flags
const args = process.argv.slice(2);
const targetArg = args.find((a) => a.startsWith('--target='))?.split('=')[1] || 'local';
const quickMode = args.includes('--quick');
const include500 = args.includes('--include-500') || args.includes('--500');

// Concurrency levels
let concurrencyLevels = [10, 50, 100, 200];
if (args.find((a) => a.startsWith('--concurrency='))) {
  concurrencyLevels = args
    .find((a) => a.startsWith('--concurrency='))
    .split('=')[1]
    .split(',')
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
} else if (quickMode) {
  concurrencyLevels = [10, 50];
} else if (include500) {
  concurrencyLevels = [10, 50, 100, 200, 500];
}

const requestsPerTier = parseInt(
  args.find((a) => a.startsWith('--requests='))?.split('=')[1] || (quickMode ? '50' : '200'),
  10
);
const warmUpCount = parseInt(
  args.find((a) => a.startsWith('--warmup='))?.split('=')[1] || (quickMode ? '10' : '25'),
  10
);
const timeoutMs = parseInt(
  args.find((a) => a.startsWith('--timeout='))?.split('=')[1] || '10000',
  10
);
const rampUpMs = parseInt(
  args.find((a) => a.startsWith('--rampup='))?.split('=')[1] || '0',
  10
);

const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || 'http://127.0.0.1:3000';
const CLOUD_BASE_URL =
  process.env.CLOUD_RUN_URL ||
  args.find((a) => a.startsWith('--cloud-url='))?.split('=')[1] ||
  'https://ais-dev-bi6cb36iby3uez5dtkx6wu-799994418742.asia-northeast1.run.app';

/**
 * Standardized Benchmark Test Scenarios
 */
export function getLoadScenarios(studentId = 'demo-student') {
  return [
    // 1. Public Read
    {
      id: 'public-venues',
      name: 'GET /api/venues',
      category: 'Public Read',
      description: 'Retrieves public campus venues and booking calendars',
      method: 'GET',
      path: '/api/venues',
      body: null,
      headers: {},
      expectedStatus: 200,
    },
    // 2. Relational Query
    {
      id: 'events-approved',
      name: 'GET /api/events/approved',
      category: 'Relational DB',
      description: 'Queries active events with hydrated venue and organizer entities',
      method: 'GET',
      path: '/api/events/approved',
      body: null,
      headers: {},
      expectedStatus: 200,
    },
    // 3. Authenticated Role Switch
    {
      id: 'auth-demo-switch',
      name: 'POST /api/auth/demo-switch',
      category: 'Role Switch',
      description: 'Switches persona to Organizer and resolves credentials',
      method: 'POST',
      path: '/api/auth/demo-switch',
      body: JSON.stringify({ role: 'Organizer' }),
      headers: { 'Content-Type': 'application/json' },
      expectedStatus: 200,
    },
    // 4. Valid Authentication & Private Access
    {
      id: 'users-registrations-valid',
      name: 'GET /api/users/registrations (Valid Auth)',
      category: 'Auth Private',
      description: 'Retrieves student ticket passbook using valid student identity header',
      method: 'GET',
      path: '/api/users/registrations',
      body: null,
      headers: { 'x-user-id': studentId },
      expectedStatus: 200,
    },
    // 5. Invalid Credentials (Expected 401)
    {
      id: 'auth-login-bad-pass',
      name: 'POST /api/auth/login (Bad Pass)',
      category: 'Security 401',
      description: 'Attempts sign-in with incorrect password; triggers security audit log',
      method: 'POST',
      path: '/api/auth/login',
      body: JSON.stringify({ email: 'student@campus.edu', password: 'invalid_password_xyz' }),
      headers: { 'Content-Type': 'application/json' },
      expectedStatus: 401,
    },
    // 6. Missing Authentication Token (Expected 401)
    {
      id: 'missing-auth-token',
      name: 'POST /api/events/1/register (No Auth)',
      category: 'Security 401',
      description: 'Attempts seat reservation without authentication token; RLS rejects',
      method: 'POST',
      path: '/api/events/1/register',
      body: null,
      headers: {},
      expectedStatus: 401,
    },
    // 7. Malformed / Invalid Token (Expected 401)
    {
      id: 'malformed-token',
      name: 'GET /api/auth/me (Malformed Token)',
      category: 'Security 401',
      description: 'Attempts user profile retrieval with fake/tampered token',
      method: 'GET',
      path: '/api/auth/me',
      body: null,
      headers: { 'x-user-id': 'tampered-signature-invalid-token-9999' },
      expectedStatus: 401,
    },
    // 8. Unauthorized Role Access (Expected 403 RLS)
    {
      id: 'unauthorized-role-rls',
      name: 'POST /api/venues (Student Role 403)',
      category: 'Security 403',
      description: 'Student attempts admin venue creation; RLS policy POL-VENUE-02 enforces 403',
      method: 'POST',
      path: '/api/venues',
      body: JSON.stringify({ venue_name: 'Hacked Auditorium', max_capacity: 500 }),
      headers: { 'Content-Type': 'application/json', 'x-user-id': studentId },
      expectedStatus: 403,
    },
    // 9. Unauthorized Resource Access / Not Found
    {
      id: 'invalid-event-roster',
      name: 'GET /api/events/99999/reg (Non-existent)',
      category: 'Security 401/404',
      description: 'Queries attendee roster of invalid or unauthenticated event ID',
      method: 'GET',
      path: '/api/events/nonexistent-event-id-99999/registrations',
      body: null,
      headers: {},
      expectedStatus: [401, 404],
    },
  ];
}

/**
 * Run a full load test suite for an environment
 */
async function runSuite(envName, baseUrl, pwContext = null) {
  console.log(`\n========================================================================================================`);
  console.log(`  LOAD TEST BENCHMARK: ${envName.toUpperCase()}`);
  console.log(`  Target: ${baseUrl}`);
  console.log(`  Concurrency Tiers: ${concurrencyLevels.join(', ')} users | Requests: ${requestsPerTier} | Warm-up: ${warmUpCount}`);
  if (rampUpMs > 0) console.log(`  Ramp-up Period: ${rampUpMs} ms`);
  console.log(`========================================================================================================\n`);

  const envResults = [];

  // Dynamically resolve demo student ID for accurate RLS evaluation
  let studentId = 'demo-student';
  try {
    const demoRes = await makeSingleRequest(baseUrl, {
      method: 'POST',
      path: '/api/auth/demo-switch',
      body: JSON.stringify({ role: 'Student' }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (demoRes && demoRes.statusCode === 200) {
      // Fetch user profile to get student _id
      const res = await fetch(new URL('/api/auth/demo-switch', baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Student' }),
      });
      const data = await res.json();
      if (data?.user?._id) studentId = data.user._id;
    }
  } catch {
    // Fall back to default
  }

  const scenarios = getLoadScenarios(studentId);

  for (const scenario of scenarios) {
    console.log(`--------------------------------------------------------------------------------------------------------`);
    console.log(`  Scenario: ${scenario.name} [${scenario.category}] - ${scenario.description}`);
    console.log(`--------------------------------------------------------------------------------------------------------`);

    // Warm-up phase
    process.stdout.write(`  Warming up connection pool (${warmUpCount} requests)... `);
    await runWarmUpRequests(baseUrl, scenario, warmUpCount, { pwContext, timeout: timeoutMs });
    console.log(`Done.`);

    // Terminal Table Header
    console.log(
      `  ┌──────────┬──────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬──────────┬──────────┬────────┬────────┬───────┐`
    );
    console.log(
      `  │ Users    │ Reqs │ Min     │ Mean    │ p50     │ p90     │ p95     │ p99     │ Through. │ Exp.Err  │ Err%   │ CPU %  │ ELU % │`
    );
    console.log(
      `  ├──────────┼──────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼────────┼────────┼───────┤`
    );

    for (const c of concurrencyLevels) {
      const monitor = startRuntimeMonitor();

      const metrics = await runLoadTier(baseUrl, scenario, {
        concurrency: c,
        totalRequests: requestsPerTier,
        timeout: timeoutMs,
        rampUpMs,
        pwContext,
      });

      const runtime = stopRuntimeMonitor(monitor);

      const record = {
        environment: envName,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        category: scenario.category,
        concurrency: c,
        metrics,
        runtime,
      };
      envResults.push(record);

      const uCol = `${c} c.`.padEnd(8);
      const reqCol = `${metrics.totalRequests}`.padStart(4);
      const minCol = fmtMs(metrics.min).padStart(7);
      const meanCol = fmtMs(metrics.mean).padStart(7);
      const p50Col = fmtMs(metrics.p50).padStart(7);
      const p90Col = fmtMs(metrics.p90).padStart(7);
      const p95Col = fmtMs(metrics.p95).padStart(7);
      const p99Col = fmtMs(metrics.p99).padStart(7);
      const rpsCol = `${metrics.throughput.toFixed(0)} r/s`.padStart(8);
      const expCol = `${metrics.expectedErrors}`.padStart(8);
      const errCol = `${metrics.errorRate.toFixed(1)}%`.padStart(6);
      const cpuCol = `${runtime.cpu.percent.toFixed(0)}%`.padStart(6);
      const eluCol = `${runtime.eventLoop.utilizationPercent.toFixed(0)}%`.padStart(5);

      console.log(
        `  │ ${uCol} │ ${reqCol} │ ${minCol} │ ${meanCol} │ ${p50Col} │ ${p90Col} │ ${p95Col} │ ${p99Col} │ ${rpsCol} │ ${expCol} │ ${errCol} │ ${cpuCol} │ ${eluCol} │`
      );
    }

    console.log(
      `  └──────────┴──────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴──────────┴──────────┴────────┴────────┴───────┘\n`
    );
  }

  return envResults;
}

/**
 * Produce Local vs Cloud Comparative Analysis
 */
function produceComparisonReport(localResults, cloudResults) {
  console.log(`\n========================================================================================================`);
  console.log(`  LOCAL VS CLOUD RUN LATENCY COMPARISON & DECOMPOSITION`);
  console.log(`========================================================================================================\n`);

  console.log(
    `  ┌────────────────────────────────────┬───────┬────────────┬────────────┬─────────────┬──────────┬────────────────────────┐`
  );
  console.log(
    `  │ Scenario                           │ Users │ Local p50  │ Cloud p50  │ Delta (Δms) │ % Change │ Latency Attribution    │`
  );
  console.log(
    `  ├────────────────────────────────────┼───────┼────────────┼────────────┼─────────────┼──────────┼────────────────────────┤`
  );

  const comparisonRows = [];

  for (const localRec of localResults) {
    const cloudRec = cloudResults.find(
      (c) => c.scenarioId === localRec.scenarioId && c.concurrency === localRec.concurrency
    );
    if (!cloudRec) continue;

    const comp = compareEnvironments(localRec.metrics, cloudRec.metrics);
    comparisonRows.push({
      scenario: localRec.scenarioName,
      concurrency: localRec.concurrency,
      localP50: localRec.metrics.p50,
      cloudP50: cloudRec.metrics.p50,
      deltaP50: comp.deltaP50Ms,
      percentChangeP50: comp.percentChangeP50,
      localMean: localRec.metrics.mean,
      cloudMean: cloudRec.metrics.mean,
      deltaMean: comp.deltaMeanMs,
      percentChangeMean: comp.percentChangeMean,
      networkSharePercent: comp.decomposition.networkSharePercent,
      serverSharePercent: comp.decomposition.serverSharePercent,
    });

    const nameCol = localRec.scenarioName.slice(0, 34).padEnd(34);
    const uCol = `${localRec.concurrency}`.padStart(5);
    const locCol = fmtMs(localRec.metrics.p50).padStart(10);
    const cldCol = fmtMs(cloudRec.metrics.p50).padStart(10);
    const deltaCol = fmtMs(comp.deltaP50Ms).padStart(11);
    const pctCol = `+${comp.percentChangeP50.toFixed(0)}%`.padStart(8);
    const attrCol = `${comp.decomposition.networkSharePercent.toFixed(0)}% WAN / ${comp.decomposition.serverSharePercent.toFixed(0)}% Srv`.padEnd(22);

    console.log(
      `  │ ${nameCol} │ ${uCol} │ ${locCol} │ ${cldCol} │ ${deltaCol} │ ${pctCol} │ ${attrCol} │`
    );
  }

  console.log(
    `  └────────────────────────────────────┴───────┴────────────┴────────────┴─────────────┴──────────┴────────────────────────┘\n`
  );

  return comparisonRows;
}

/**
 * Identify bottlenecks and executive summary
 */
function generateExecutiveSummary(allResults) {
  let slowestEndpoint = { name: '', mean: -1 };
  let highestP95 = { name: '', p95: -1, concurrency: 0 };
  let highestError = { name: '', errorRate: -1 };
  let highestResource = { name: '', cpu: -1, elu: -1, heapDelta: -1 };

  for (const r of allResults) {
    if (r.metrics.mean > slowestEndpoint.mean) {
      slowestEndpoint = { name: `${r.scenarioName} (${r.environment})`, mean: r.metrics.mean };
    }
    if (r.metrics.p95 > highestP95.p95) {
      highestP95 = {
        name: `${r.scenarioName} (${r.environment})`,
        p95: r.metrics.p95,
        concurrency: r.concurrency,
      };
    }
    if (r.metrics.errorRate > highestError.errorRate) {
      highestError = {
        name: `${r.scenarioName} (${r.environment})`,
        errorRate: r.metrics.errorRate,
      };
    }
    if (r.runtime.cpu.percent > highestResource.cpu) {
      highestResource = {
        name: `${r.scenarioName} (${r.environment})`,
        cpu: r.runtime.cpu.percent,
        elu: r.runtime.eventLoop.utilizationPercent,
        heapDelta: r.runtime.memory.heapDeltaMb,
      };
    }
  }

  console.log(`========================================================================================================`);
  console.log(`  EXECUTIVE LOAD BENCHMARK SUMMARY`);
  console.log(`========================================================================================================`);
  console.log(`  • Slowest Mean Latency:       ${slowestEndpoint.name} -> ${fmtMs(slowestEndpoint.mean)}`);
  console.log(`  • Highest p95 Tail Latency:   ${highestP95.name} @ ${highestP95.concurrency} users -> ${fmtMs(highestP95.p95)}`);
  console.log(`  • Highest Unexpected Errors:  ${highestError.name} -> ${highestError.errorRate.toFixed(2)}%`);
  console.log(`  • Most Resource Intensive:    ${highestResource.name} -> ${highestResource.cpu.toFixed(1)}% CPU | ${highestResource.elu.toFixed(1)}% ELU | Heap Δ: ${highestResource.heapDelta.toFixed(2)} MB`);
  console.log(`========================================================================================================\n`);

  return { slowestEndpoint, highestP95, highestError, highestResource };
}

async function main() {
  const sysInfo = getSystemInfo();
  console.log(`\n========================================================================================================`);
  console.log(`  CAMPUS EVENT HUB - ADVANCED PERFORMANCE & LOAD BENCHMARK SUITE`);
  console.log(`  Node: ${sysInfo.nodeVersion} | OS: ${sysInfo.platform} (${sysInfo.arch}) | CPUs: ${sysInfo.cpus} | Mem: ${sysInfo.totalMemoryMb} MB`);
  console.log(`  Target Mode: ${targetArg.toUpperCase()}`);
  console.log(`========================================================================================================`);

  let localResults = [];
  let cloudResults = [];

  if (targetArg === 'local' || targetArg === 'both') {
    localResults = await runSuite('Local Loopback', LOCAL_BASE_URL);
  }

  if (targetArg === 'cloud' || targetArg === 'both') {
    console.log(`\n  Initializing headless browser context for Cloud Run authentication...`);
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(CLOUD_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2500);

    cloudResults = await runSuite('Cloud Run Live', CLOUD_BASE_URL, context);
    await browser.close();
  }

  let comparisonRows = [];
  if (localResults.length > 0 && cloudResults.length > 0) {
    comparisonRows = produceComparisonReport(localResults, cloudResults);
  }

  const allResults = [...localResults, ...cloudResults];
  const summary = generateExecutiveSummary(allResults);

  // Generate Automated Reports (JSON and CSV)
  const reportPayload = {
    system: sysInfo,
    config: {
      target: targetArg,
      concurrencyLevels,
      requestsPerTier,
      warmUpCount,
      timeoutMs,
      rampUpMs,
      localBaseUrl: LOCAL_BASE_URL,
      cloudBaseUrl: CLOUD_BASE_URL,
    },
    localResults,
    cloudResults,
    comparison: comparisonRows,
    summary,
  };

  const jsonReport = saveJsonReport('benchmark-load', reportPayload);
  console.log(`  [Report] JSON report generated: ${jsonReport.filePath}`);

  // CSV Export
  const csvHeaders = [
    'Environment',
    'Scenario',
    'Category',
    'Concurrency',
    'TotalRequests',
    'MinMs',
    'MeanMs',
    'p50Ms',
    'p90Ms',
    'p95Ms',
    'p99Ms',
    'MaxMs',
    'ThroughputRps',
    'SuccessfulResponses',
    'ExpectedErrors',
    'UnexpectedErrors',
    'NetworkFailures',
    'Timeouts',
    'ErrorRatePercent',
    'CpuPercent',
    'HeapUsedDeltaMb',
    'PeakRssMb',
    'EventLoopLagMeanMs',
    'EventLoopLagP95Ms',
    'EventLoopUtilizationPercent',
  ];

  const csvRows = allResults.map((r) => [
    r.environment,
    r.scenarioName,
    r.category,
    r.concurrency,
    r.metrics.totalRequests,
    r.metrics.min.toFixed(2),
    r.metrics.mean.toFixed(2),
    r.metrics.p50.toFixed(2),
    r.metrics.p90.toFixed(2),
    r.metrics.p95.toFixed(2),
    r.metrics.p99.toFixed(2),
    r.metrics.max.toFixed(2),
    r.metrics.throughput.toFixed(1),
    r.metrics.successfulResponses,
    r.metrics.expectedErrors,
    r.metrics.unexpectedErrors,
    r.metrics.networkFailures,
    r.metrics.timeouts,
    r.metrics.errorRate.toFixed(2),
    r.runtime.cpu.percent.toFixed(1),
    r.runtime.memory.heapDeltaMb.toFixed(2),
    r.runtime.memory.peakRssMb.toFixed(2),
    r.runtime.eventLoop.lagMeanMs.toFixed(2),
    r.runtime.eventLoop.lagP95Ms.toFixed(2),
    r.runtime.eventLoop.utilizationPercent.toFixed(1),
  ]);

  const csvReport = saveCsvReport('benchmark-load', csvHeaders, csvRows);
  console.log(`  [Report] CSV report generated:  ${csvReport.filePath}\n`);
}

main().catch((err) => {
  console.error('Fatal load benchmark error:', err);
  process.exit(1);
});
