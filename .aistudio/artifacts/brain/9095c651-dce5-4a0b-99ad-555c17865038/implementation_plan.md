# API Rigorous Load Testing & Latency Decomposition Plan

A production-grade benchmarking and load testing framework to empirically evaluate API performance under concurrency (10, 50, 100, 200 concurrent users), assess error handling (both successful and failure states), and decompose latency into network transit, server execution, database query, authentication, and response serialization.

---

### User Review & Clarifications Addressed

> [!IMPORTANT]
> **Clarification of Previous 0.87–1.56 ms Measurements**:
> - **Included in 0.87–1.56 ms**:
>   - In-process Node.js / Express routing and middleware pipeline.
>   - Role-Based Access Control (RLS / Auth context resolution).
>   - Embedded Mongoose / database lookup and entity hydration.
>   - JSON object serialization and buffer framing.
>   - Kernel loopback TCP transfer (`127.0.0.1:3000`).
> - **Excluded from 0.87–1.56 ms**:
>   - Wide Area Network (WAN) latency (ISP routing, cellular hops).
>   - DNS resolution and TLS 1.3 handshake.
>   - Google Cloud Run ingress gateway and reverse-proxy TLS termination (~30–80 ms depending on geographic distance).
> 
> The new benchmark tests **both environments** to measure raw engine saturation alongside real-world end-to-end network performance.

---

### 1. Scope & Test Matrix

#### Concurrency & Request Volume
- **Concurrency Levels**: 10, 50, 100, and 200 concurrent worker connections.
- **Request Volumes**: 100 to 1,000 requests per concurrency stage.
- **Warm-Up Phase**: 50 unmeasured warm-up requests per endpoint prior to timing to prime JIT compiler optimization, connection pools, and in-memory caches.

#### Endpoints & Request Types
1. **Public Read (Success)**: `GET /api/venues` (Venue directory retrieval).
2. **Entity Query with Population (Success)**: `GET /api/events/approved` (Event list with relational organizer/venue data).
3. **Authenticated Role Switch (Success)**: `POST /api/auth/demo-switch` with JSON body `{"role": "organizer"}`.
4. **Private Authenticated Resource (Success)**: `GET /api/users/registrations` with authenticated session headers.
5. **Simulated Auth Failure (Failed Request)**: `POST /api/auth/login` with invalid credentials (expects HTTP `401 Unauthorized`).
6. **Simulated RLS / Not Found Failure (Failed Request)**: `GET /api/events/invalid-event-uuid-9999/registrations` (expects HTTP `404` or `403`).

#### Measured Metrics
- **Average Latency**: Mean response time across all completed requests ($\frac{\sum t}{N}$).
- **p50 Latency**: Median response time (50% of requests finish faster than this).
- **p95 Latency**: 95th percentile latency (reveals tail latency under queue contention).
- **p99 Latency**: 99th percentile worst-case latency (reveals garbage collection or connection pool starvation).
- **Error Rate**: Percentage of requests resulting in network errors or unexpected status codes.
- **Throughput**: Effective requests handled per second ($\text{RPS} = \frac{\text{Completed Requests}}{\text{Wall-Clock Seconds}}$).

---

### 2. Architecture & Implementation Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Load Testing Engine (Node.js)                         │
│  ┌───────────────────────┐   ┌────────────────────┐   ┌──────────────────┐  │
│  │   Warm-Up Generator   │──▶│ Concurrency Pool   │──▶│ Percentile Math  │  │
│  │ (50 unmeasured reqs)  │   │ (10/50/100/200 c.) │   │(p50, p95, p99)   │  │
│  └───────────────────────┘   └──────────┬─────────┘   └──────────────────┘  │
└─────────────────────────────────────────┼───────────────────────────────────┘
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 ▼                                                 ▼
┌───────────────────────────────────┐     ┌───────────────────────────────────┐
│     Local Loopback (Port 3000)     │     │      Cloud Run Production URL     │
│   • Raw Engine Execution Time     │     │   • End-to-End Real World WAN     │
│   • Zero Network Overhead         │     │   • Ingress & TLS Termination     │
│   • CPU/Event-Loop Saturation     │     │   • Geographic Latency Profiling  │
└───────────────────────────────────┘     └───────────────────────────────────┘
```

#### Implementation Files
1. **`scripts/benchmark-load.js`**:
   - Zero-external-dependency Node.js load runner using native `http` and `https` modules with `keep-alive` agent pooling.
   - Concurrency manager controlling asynchronous worker slots.
   - Precise high-resolution timing via `process.hrtime.bigint()` for microsecond accuracy.
   - Percentile calculation using sorted timing arrays.
   - Formatted ASCII table generator displaying comprehensive metrics for each concurrency tier.
   - CLI flags: `--target=local|cloud|both`, `--concurrency=10,50,100,200`, `--requests=500`.
2. **`package.json`**:
   - Add `"benchmark:load": "node scripts/benchmark-load.js"` script.

---

### 3. Verification & Execution Plan

1. **Local Benchmark Execution**: Run `node scripts/benchmark-load.js --target=local` across 10, 50, 100, and 200 concurrent connections to evaluate backend processing limits.
2. **Cloud Run Benchmark Execution**: Run `node scripts/benchmark-load.js --target=cloud` to record live production response times with TLS and WAN latency.
3. **Metric Validation**: Confirm that:
   - Failed request simulations (401, 404) are correctly categorized as intentional expected responses vs actual connection dropped failures.
   - p50, p95, and p99 accurately represent tail degradation as concurrency scales from 10 to 200.
   - Throughput (req/s) saturates at expected peak capacity.
4. **Summary & Documentation**: Output clear tabular results comparing local vs cloud metrics with latency decomposition breakdown.
