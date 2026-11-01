/**
 * CampusEventHub Database & Persistence Benchmark
 *
 * Implements:
 * - Clear separation of In-Memory retrieval vs Persistent disk/DB operations
 * - Connection acquisition & ping latency
 * - Cold vs Warm query execution times
 * - Indexed (O(1) key/hash lookup) vs Unindexed (O(N) linear scan) performance
 * - Performance with increasing dataset sizes (100, 1,000, 5,000, 10,000 records)
 * - JSON and CSV reporting
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { db } from '../src/server/db.js';
import {
  fmtMs,
  getSystemInfo,
  saveJsonReport,
  saveCsvReport,
  startRuntimeMonitor,
  stopRuntimeMonitor,
} from './benchmark-utils.js';

const DATA_FILE = path.resolve(process.cwd(), '.campus_data.json');

/**
 * High-resolution timer helper returning milliseconds
 */
function hrDurationMs(startNs, endNs) {
  return Number(endNs - startNs) / 1e6;
}

/**
 * 1. Connection Acquisition & Health Ping
 */
async function benchmarkConnection() {
  console.log(`\n========================================================================================================`);
  console.log(`  1. DATABASE CONNECTION & STATUS`);
  console.log(`========================================================================================================`);

  const start = process.hrtime.bigint();
  await db.connect();
  const connectMs = hrDurationMs(start, process.hrtime.bigint());

  const isRemote = db.isConnectedToMongo;
  console.log(`  • Engine Type:           ${isRemote ? 'Remote MongoDB Instance' : 'Embedded High-Integrity Mongoose Store'}`);
  console.log(`  • Connection Duration:   ${fmtMs(connectMs)}`);
  console.log(`  • Persistence Storage:   ${DATA_FILE}`);
  console.log(`  • Status:                ACTIVE`);

  return { isRemote, connectMs };
}

/**
 * 2. In-Memory Retrieval vs Persistent Disk Snapshot Operations
 */
async function benchmarkInMemoryVsDisk() {
  console.log(`\n========================================================================================================`);
  console.log(`  2. IN-MEMORY RETRIEVAL VS PERSISTENT DISK I/O`);
  console.log(`========================================================================================================\n`);

  // A. In-Memory Cold vs Warm Queries
  // Cold: First read
  const coldStart = process.hrtime.bigint();
  const venuesCold = await db.findVenues();
  const coldDurationMs = hrDurationMs(coldStart, process.hrtime.bigint());

  // Warm: 1,000 repetitions
  const warmLatencies = [];
  for (let i = 0; i < 1000; i++) {
    const t0 = process.hrtime.bigint();
    await db.findVenues();
    warmLatencies.push(hrDurationMs(t0, process.hrtime.bigint()));
  }
  const warmAvgMs = warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length;
  const warmMinMs = Math.min(...warmLatencies);
  const warmMaxMs = Math.max(...warmLatencies);

  // B. Persistent Disk I/O (saveSnapshot and loadSnapshot)
  const saveLatencies = [];
  for (let i = 0; i < 50; i++) {
    const t0 = process.hrtime.bigint();
    db.saveSnapshot();
    saveLatencies.push(hrDurationMs(t0, process.hrtime.bigint()));
  }
  const saveAvgMs = saveLatencies.reduce((a, b) => a + b, 0) / saveLatencies.length;
  const saveMinMs = Math.min(...saveLatencies);
  const saveMaxMs = Math.max(...saveLatencies);

  const loadLatencies = [];
  for (let i = 0; i < 50; i++) {
    const t0 = process.hrtime.bigint();
    db.loadSnapshot();
    loadLatencies.push(hrDurationMs(t0, process.hrtime.bigint()));
  }
  const loadAvgMs = loadLatencies.reduce((a, b) => a + b, 0) / loadLatencies.length;
  const loadMinMs = Math.min(...loadLatencies);
  const loadMaxMs = Math.max(...loadLatencies);

  const dataFileSize = fs.existsSync(DATA_FILE) ? fs.statSync(DATA_FILE).size : 0;

  console.log(
    `  ┌────────────────────────────────────────┬─────────────┬─────────────┬─────────────┬───────────────────────────┐`
  );
  console.log(
    `  │ Operation Type                         │ Min Latency │ Mean Latency│ Max Latency │ Details                   │`
  );
  console.log(
    `  ├────────────────────────────────────────┼─────────────┼─────────────┼─────────────┼───────────────────────────┤`
  );
  console.log(
    `  │ In-Memory Query (Cold Cache)           │ ${fmtMs(coldDurationMs).padStart(11)} │ ${fmtMs(coldDurationMs).padStart(11)} │ ${fmtMs(coldDurationMs).padStart(11)} │ 1st run, ${venuesCold.length} venues found   │`
  );
  console.log(
    `  │ In-Memory Query (Warm Cache, 1k runs)  │ ${fmtMs(warmMinMs).padStart(11)} │ ${fmtMs(warmAvgMs).padStart(11)} │ ${fmtMs(warmMaxMs).padStart(11)} │ Zero I/O, in-memory reference │`
  );
  console.log(
    `  │ Persistent Disk Flush (saveSnapshot)   │ ${fmtMs(saveMinMs).padStart(11)} │ ${fmtMs(saveAvgMs).padStart(11)} │ ${fmtMs(saveMaxMs).padStart(11)} │ Synchronous fs.writeFileSync │`
  );
  console.log(
    `  │ Persistent Disk Read & Parse (load)    │ ${fmtMs(loadMinMs).padStart(11)} │ ${fmtMs(loadAvgMs).padStart(11)} │ ${fmtMs(loadMaxMs).padStart(11)} │ Disk I/O + JSON parse (${dataFileSize} B)│`
  );
  console.log(
    `  └────────────────────────────────────────┴─────────────┴─────────────┴─────────────┴───────────────────────────┘\n`
  );

  return {
    inMemory: { coldDurationMs, warmAvgMs, warmMinMs, warmMaxMs },
    persistentDisk: { saveAvgMs, saveMinMs, saveMaxMs, loadAvgMs, loadMinMs, loadMaxMs, dataFileSize },
  };
}

/**
 * 3. Indexed vs Unindexed Query Performance Across Increasing Dataset Sizes
 */
async function benchmarkIndexedVsUnindexed() {
  console.log(`========================================================================================================`);
  console.log(`  3. QUERY PERFORMANCE WITH INDEXES VS UNINDEXED LINEAR SCANS`);
  console.log(`========================================================================================================\n`);

  const datasetSizes = [100, 1000, 5000, 10000];
  const queryBenchmarkResults = [];

  console.log(
    `  ┌──────────────┬──────────────────┬──────────────────┬─────────────────┬─────────────────────────────────────┐`
  );
  console.log(
    `  │ Dataset Size │ Indexed Lookup   │ Unindexed Scan   │ Speedup Factor  │ Complexity                          │`
  );
  console.log(
    `  ├──────────────┼──────────────────┼──────────────────┼─────────────────┼─────────────────────────────────────┤`
  );

  for (const size of datasetSizes) {
    // Generate synthetic dataset without polluting production state
    const syntheticUsers = [];
    const indexMap = new Map();

    for (let i = 0; i < size; i++) {
      const user = {
        _id: `synth-user-${i}`,
        email: `student_${i}@campus.test`,
        name: `Student ${i}`,
        role: i % 10 === 0 ? 'Admin' : i % 3 === 0 ? 'Organizer' : 'Student',
      };
      syntheticUsers.push(user);
      indexMap.set(user.email, user);
    }

    const targetEmail = `student_${Math.floor(size * 0.85)}@campus.test`;

    // 1. Indexed lookup (O(1) Hash Map)
    const indexedTimes = [];
    for (let r = 0; r < 500; r++) {
      const t0 = process.hrtime.bigint();
      const res = indexMap.get(targetEmail);
      indexedTimes.push(hrDurationMs(t0, process.hrtime.bigint()));
    }
    const indexedAvg = indexedTimes.reduce((a, b) => a + b, 0) / indexedTimes.length;

    // 2. Unindexed full table scan (O(N) Array.prototype.find)
    const scanTimes = [];
    for (let r = 0; r < 500; r++) {
      const t0 = process.hrtime.bigint();
      const res = syntheticUsers.find((u) => u.email === targetEmail);
      scanTimes.push(hrDurationMs(t0, process.hrtime.bigint()));
    }
    const scanAvg = scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length;

    const speedup = indexedAvg > 0 ? (scanAvg / indexedAvg).toFixed(1) : 'N/A';

    queryBenchmarkResults.push({
      datasetSize: size,
      indexedAvgMs: indexedAvg,
      unindexedAvgMs: scanAvg,
      speedup: parseFloat(speedup),
    });

    const sizeCol = `${size} records`.padEnd(12);
    const indCol = `${(indexedAvg * 1000).toFixed(2)} µs (${fmtMs(indexedAvg)})`.padStart(16);
    const scanCol = `${(scanAvg * 1000).toFixed(2)} µs (${fmtMs(scanAvg)})`.padStart(16);
    const speedCol = `${speedup}x faster`.padStart(15);
    const compCol = `O(1) Map vs O(N) Table Scan`.padEnd(35);

    console.log(`  │ ${sizeCol} │ ${indCol} │ ${scanCol} │ ${speedCol} │ ${compCol} │`);
  }

  console.log(
    `  └──────────────┴──────────────────┴──────────────────┴─────────────────┴─────────────────────────────────────┘\n`
  );

  return queryBenchmarkResults;
}

async function main() {
  const sysInfo = getSystemInfo();
  console.log(`\n========================================================================================================`);
  console.log(`  CAMPUS EVENT HUB - PERSISTENT DATABASE BENCHMARK SUITE`);
  console.log(`  Node: ${sysInfo.nodeVersion} | OS: ${sysInfo.platform} (${sysInfo.arch})`);
  console.log(`========================================================================================================`);

  const monitor = startRuntimeMonitor();

  const connStats = await benchmarkConnection();
  const ioStats = await benchmarkInMemoryVsDisk();
  const indexStats = await benchmarkIndexedVsUnindexed();

  const runtime = stopRuntimeMonitor(monitor);

  console.log(`========================================================================================================`);
  console.log(`  RUNTIME RESOURCE IMPACT`);
  console.log(`========================================================================================================`);
  console.log(`  • CPU Consumed:         ${runtime.cpu.totalMs.toFixed(1)} ms (${runtime.cpu.percent.toFixed(1)}% utilization)`);
  console.log(`  • Memory Heap Delta:    ${runtime.memory.heapDeltaMb.toFixed(2)} MB (Peak: ${runtime.memory.peakHeapUsedMb.toFixed(2)} MB)`);
  console.log(`  • Peak RSS:             ${runtime.memory.peakRssMb.toFixed(2)} MB`);
  console.log(`  • Event Loop Lag (Mean):${fmtMs(runtime.eventLoop.lagMeanMs)} | (p95): ${fmtMs(runtime.eventLoop.lagP95Ms)}`);
  console.log(`========================================================================================================\n`);

  const reportData = {
    system: sysInfo,
    connection: connStats,
    ioBenchmarks: ioStats,
    indexBenchmarks: indexStats,
    runtime,
  };

  const jsonReport = saveJsonReport('benchmark-db', reportData);
  console.log(`  [Report] JSON report generated: ${jsonReport.filePath}`);

  const csvHeaders = ['DatasetSize', 'IndexedAvgMs', 'UnindexedAvgMs', 'SpeedupFactor'];
  const csvRows = indexStats.map((r) => [r.datasetSize, r.indexedAvgMs.toFixed(5), r.unindexedAvgMs.toFixed(5), r.speedup]);
  const csvReport = saveCsvReport('benchmark-db', csvHeaders, csvRows);
  console.log(`  [Report] CSV report generated:  ${csvReport.filePath}\n`);
}

main().catch((err) => {
  console.error('Fatal DB benchmark error:', err);
  process.exit(1);
});
