# Observation Phase Guide

## Purpose

Enable 7-day minimum measurement period before Phase 2 optimization decisions. This phase establishes empirical baseline behavior for the Alpha Vantage HTTP driver.

**Strategic Principle**: *"You do not speculate. You measure first."*

## Commit

- Hash: `045a868`
- Date: 2025
- Summary: Observation phase telemetry (MetricsCollector)

## Components

### MetricsCollector

Concrete implementation of `HttpObservability` interface with in-memory aggregation.

**Location**: `packages/core/src/providers/MetricsCollector.ts`

**Characteristics**:
- Memory-bounded (circular buffer, max 10,000 latency samples)
- Zero performance impact (<1ms overhead per event)
- Thread-safe accumulation (architecturally correct for single-threaded JS)
- Structured reporting via `MetricsReport` interface (23 fields)

### MetricsReport Interface

Structured data capture with four categories:

1. **Request Metrics**
   - `totalRequests`: Total HTTP requests dispatched
   - `peakConcurrency`: Maximum simultaneous in-flight requests
   - `peakRequestsPerMinute`: Highest requests/minute observed
   - `uniqueSymbols`: Distinct symbols requested
   - `topSymbols`: Top 10 most-requested symbols [(symbol, count)]

2. **Latency Distribution**
   - `latencySamples`: Total latency samples recorded
   - `latencyP50`: 50th percentile (median) latency in ms
   - `latencyP95`: 95th percentile latency in ms
   - `latencyP99`: 99th percentile latency in ms
   - `latencyMax`: Maximum observed latency in ms

3. **Failure Classification**
   - `totalFailures`: Sum of all failure types
   - `networkFailures`: ECONNREFUSED, ENOTFOUND, unknown errors
   - `timeouts`: ETIMEDOUT, timeout messages
   - `http4xx`: 400-499 status codes
   - `http5xx`: 500-599 status codes
   - `rateLimitHits`: 429 status, rate limit messages

4. **Quota Burn Velocity**
   - `quotaUsed`: Cumulative quota consumed
   - `quotaLimit`: Daily quota limit (500 for Alpha Vantage)
   - `quotaRemaining`: quotaLimit - quotaUsed
   - `quotaUtilization`: Percentage of quota used (0-100)
   - `quotaHits`: Number of times quota exhaustion occurred
   - `quotaBurnRatePerDay`: quotaUsed / uptimeDays
   - `projectedDaysToExhaustion`: remainingQuota / burnRate

## Usage

### 1. Instantiate AlphaVantageDriver with MetricsCollector

```typescript
import { 
  AlphaVantageDriver, 
  MetricsCollector, 
  HttpProviderAdapter, 
  ProviderRegistry,
  WindowThrottle,
  QuotaManager
} from '@cyber-sheet/core';

// Create dependencies
const httpAdapter = new HttpProviderAdapter(5000); // 5s timeout
const registry = new ProviderRegistry();
const throttle = new WindowThrottle(5, 60_000); // 5 req/min
const quota = new QuotaManager(500); // 500/day limit
const metrics = new MetricsCollector(); // Telemetry layer

// Instantiate driver with observability
const driver = new AlphaVantageDriver(
  'YOUR_API_KEY',
  httpAdapter,
  registry,
  throttle,
  quota,
  metrics // <-- Observation enabled
);

// Register driver
registry.registerProvider('stock', driver);
```

### 2. Collect Metrics During Normal Operation

The driver automatically calls telemetry hooks:
- `requestStarted()`: Before HTTP dispatch
- `requestFinished()`: After response/cache hit
- `quotaHit()`: When quota exhaustion occurs
- `recordFailure()`: On error (via `cacheError()`)

**No manual instrumentation required** - metrics accumulate passively.

### 3. Retrieve Daily Snapshots

```typescript
// Get structured report
const report = driver.getMetricsReport();

if (report) {
  // Human-readable console output
  console.log(formatMetricsReport(report));
  
  // Or access structured data
  console.log(`Quota burn rate: ${report.quotaBurnRatePerDay}/day`);
  console.log(`P95 latency: ${report.latencyP95}ms`);
  console.log(`Failure rate: ${(report.totalFailures / report.totalRequests * 100).toFixed(2)}%`);
}
```

### 4. Format Human-Readable Output

```typescript
import { formatMetricsReport } from '@cyber-sheet/core';

const report = driver.getMetricsReport();
const formatted = formatMetricsReport(report);

// Example output:
// ===================================================
// METRICS REPORT - 2025-01-15 14:32:00
// Uptime: 7.2 days (177 hours)
// ===================================================
//
// REQUEST METRICS:
//   Total Requests: 1,247
//   Peak Concurrency: 5
//   Peak Requests/Minute: 8
//   Unique Symbols: 83
//   Top Symbols:
//     AAPL: 142
//     GOOGL: 89
//     MSFT: 76
//     ...
//
// LATENCY DISTRIBUTION:
//   Samples: 1,247
//   P50: 287ms
//   P95: 1,432ms
//   P99: 2,104ms
//   Max: 4,872ms
//
// FAILURE CLASSIFICATION:
//   Total Failures: 3 (0.24%)
//   Network: 2
//   Timeouts: 1
//   HTTP 4xx: 0
//   HTTP 5xx: 0
//   Rate Limits: 0
//
// QUOTA BURN VELOCITY:
//   Used: 1,247 / 500 (249.4%)
//   Burn Rate: 173.2/day
//   Time to Exhaustion: N/A (over quota)
//   Quota Hits: 12
```

### 5. Reset for Daily Rollover

```typescript
// Optional: Reset metrics for daily boundaries
metrics.reset();
```

## Observation Phase Protocol

### Minimum Duration

**7 days** (168 hours) of continuous measurement to capture:
- Weekday vs. weekend patterns
- Peak load periods
- Quota exhaustion events
- Latency variance over time

### Daily Checklist

1. **Capture Snapshot** (daily, same time)
   ```typescript
   const report = driver.getMetricsReport();
   fs.writeFileSync(`metrics-${Date.now()}.json`, JSON.stringify(report, null, 2));
   ```

2. **Review Formatted Report**
   ```typescript
   console.log(formatMetricsReport(report));
   ```

3. **Monitor for Anomalies**
   - Quota exhaustion spikes
   - P99 latency > 5s (HTTP timeout threshold)
   - Failure rate > 5%

### No Changes During Observation

**Do not modify**:
- Throttle window (5 req/min)
- Quota limit (500/day)
- HTTP timeout (5s)
- Retry behavior (retries: 0)
- Batching (Phase 2 feature)

**Rationale**: Baseline must be pure. Any change invalidates comparison.

## Five Questions to Answer

After 7-day observation, the data must answer these empirically:

### 1. Is Retry Necessary?

**Hypothesis**: Retry improves reliability but burns quota.

**Data Required**:
- `totalFailures / totalRequests` = failure rate percentage
- Breakdown by failure type (transient vs. permanent)

**Decision Criteria**:
- If failure rate < 0.5%: **No retry** (not worth quota burn)
- If failure rate > 5%: **Quota-aware retry** (needs investigation)
- If 0.5% - 5%: Analyze failure types:
  - `networkFailures` + `timeouts` = transient (retry candidate)
  - `http4xx` = permanent (don't retry)
  - `http5xx` = transient (retry with backoff)
  - `rateLimitHits` = transient but quota-related (don't retry)

### 2. Is Batching Beneficial?

**Hypothesis**: If quota pressure high, batch requests to reduce overhead.

**Data Required**:
- `quotaBurnRatePerDay` vs. quota limit (500)
- `topSymbols` distribution (concentrated vs. distributed)
- `uniqueSymbols` vs. `totalRequests` ratio

**Decision Criteria**:
- If `quotaBurnRatePerDay < 200/day`: **No batching** (quota headroom exists)
- If `quotaUtilization > 90%`: **Batching critical** (quota exhaustion imminent)
- If `topSymbols` show high re-request rate: **Batching beneficial** (grouped prefetch)
- If Alpha Vantage supports batch endpoints: **Evaluate cost/benefit**

### 3. Is 5 req/min Throttle Sufficient?

**Hypothesis**: 5 req/min is conservative; may allow higher throughput.

**Data Required**:
- `rateLimitHits` count
- `peakRequestsPerMinute` vs. throttle limit (5)

**Decision Criteria**:
- If `rateLimitHits = 0`: **Could relax throttle** (not hitting limit)
- If `rateLimitHits > 0`: **Throttle is tight** (keep or tighten)
- If `peakRequestsPerMinute < 3`: **Under-utilized** (workload too light)

### 4. Is 500/day Quota Reachable?

**Hypothesis**: Current workload may exceed daily quota under load.

**Data Required**:
- `quotaBurnRatePerDay` extrapolation
- `projectedDaysToExhaustion`
- `quotaHits` frequency

**Decision Criteria**:
- If `quotaBurnRatePerDay < 500`: **Safe** (within limit)
- If `quotaBurnRatePerDay > 500`: **Over quota** (need caching or batching)
- If `quotaHits > 0`: **Exhaustion occurred** (analyze timing)

### 5. What is Worst-Case Evaluation Footprint?

**Hypothesis**: P95/P99 latencies reveal tail behavior for timeout tuning.

**Data Required**:
- `latencyP95` and `latencyP99` values
- `latencyMax` to see extremes

**Decision Criteria**:
- If `latencyP95 < 1000ms`: **Excellent** (most requests fast)
- If `latencyP99 < 5000ms`: **Good** (under timeout threshold)
- If `latencyMax > 5000ms`: **Timeout triggered** (investigate causes)
- Use P99 to set adaptive timeout in Phase 2

## Phase 2 Design Process

### After 7 Days

1. **Generate Final Report**
   ```typescript
   const finalReport = driver.getMetricsReport();
   console.log(formatMetricsReport(finalReport));
   ```

2. **Answer 5 Questions**
   - Document findings for each question
   - Include raw data (failure rates, percentiles, burn rates)

3. **Design Phase 2 Features** (data-driven, not assumption-driven)

   **If retry is necessary**:
   ```typescript
   // Quota-aware retry policy
   const retryBudget = Math.floor(quotaRemaining * 0.1); // Reserve 10% for retries
   const maxRetriesPerSymbol = Math.min(2, retryBudget / totalPending);
   ```

   **If batching is beneficial**:
   ```typescript
   // Grouped prefetch for high-frequency symbols
   const batchSize = Math.floor(5 / symbolsPerRequest); // Respect throttle
   ```

   **If adaptive throttle needed**:
   ```typescript
   // Tighten on rate limit, relax if headroom
   if (rateLimitHits > 0) {
     throttle.setRate(4, 60_000); // Reduce to 4/min
   } else if (peakRequestsPerMinute < 3) {
     throttle.setRate(6, 60_000); // Increase to 6/min (test cautiously)
   }
   ```

4. **Implement Phase 2 PR #5**
   - Title: `feat(providers): Phase 2 HTTP driver enhancements`
   - Content: Retry policy, batching, adaptive throttle (only if data justifies)
   - Tests: Validate new behaviors with integration tests
   - Observation: Deploy with metrics enabled, validate improvements

## Troubleshooting

### getMetricsReport() Returns Null

**Cause**: Driver not instantiated with MetricsCollector.

**Solution**:
```typescript
const metrics = new MetricsCollector();
const driver = new AlphaVantageDriver(apiKey, http, registry, throttle, quota, metrics);
```

### Latency Metrics All Zero

**Cause**: No requests dispatched yet.

**Solution**: Wait for normal operation to trigger HTTP requests via `prefetch()`.

### Quota Hits During Observation

**Behavior**: Expected if burn rate > 500/day.

**Action**:
1. Note timing of quota exhaustion in logs
2. Analyze `peakRequestsPerMinute` and `topSymbols` for concentration
3. Consider caching improvements before Phase 2

### Circular Buffer Overflow Warning

**Cause**: More than 10,000 requests dispatched.

**Behavior**: Oldest latency samples overwritten (expected).

**Impact**: Percentiles still accurate (based on last 10k samples).

## Example: 7-Day Report Analysis

### Day 1 Snapshot

```
METRICS REPORT - 2025-01-15 09:00:00
Uptime: 1.0 days (24 hours)

REQUEST METRICS:
  Total Requests: 487
  Peak Concurrency: 4
  Peak Requests/Minute: 5
  Unique Symbols: 62

LATENCY DISTRIBUTION:
  P50: 312ms
  P95: 1,287ms
  P99: 2,004ms

FAILURE CLASSIFICATION:
  Total Failures: 2 (0.41%)
  Network: 1
  Timeouts: 1

QUOTA BURN VELOCITY:
  Used: 487 / 500 (97.4%)
  Burn Rate: 487.0/day
  Projected Days to Exhaustion: 0.03 days (quota exhaustion imminent)
```

**Findings**:
- ✅ Throttle working (peak = 5/min)
- ⚠️ Quota burn rate at 97.4% (near exhaustion)
- ✅ Failure rate low (0.41%)
- ✅ Latencies under timeout threshold

**Actions**:
- Monitor quota hits on Day 2
- Analyze if workload is sustainable
- Consider caching or batching if exhaustion occurs

### Day 7 Summary

After 7 days, aggregate findings to answer 5 questions:

1. **Retry Necessary?** No - failure rate 0.38% (2.4% transient, but not worth quota)
2. **Batching Beneficial?** Yes - quota burn rate 523/day, exceeds limit
3. **Throttle Sufficient?** Yes - zero rate limit hits, peak 5/min
4. **Quota Reachable?** No - exceeding 500/day by 4.6%, need optimization
5. **Worst-Case Footprint?** P99 = 2.1s, well under 5s timeout

**Phase 2 Recommendations**:
- Implement grouped prefetch (batching) to reduce request count
- No retry needed (failure rate too low)
- Keep 5/min throttle (working well)
- Target: Reduce burn rate to <450/day via batching

## References

- [PR #3: BatchResolver](../ARCHITECTURE.md#batchresolver)
- [PR #4: HTTP Driver](../ARCHITECTURE.md#alphaventagedriver)
- [ASYNC_EXECUTION_MODEL.md](./ASYNC_EXECUTION_MODEL.md)
- [HttpObservability Interface](../packages/core/src/providers/HttpObservability.ts)
- [MetricsCollector Implementation](../packages/core/src/providers/MetricsCollector.ts)
- [AlphaVantageDriver Integration](../packages/core/src/providers/AlphaVantageDriver.ts)

## Next Steps

1. **Deploy with telemetry enabled** (this guide)
2. **Collect metrics for 7 days** (no modifications)
3. **Generate final report** (formatMetricsReport)
4. **Answer 5 questions** (data-driven decisions)
5. **Design Phase 2** (retry, batching, adaptive throttle - only if justified)
6. **Implement PR #5** (enhancements based on empirical evidence)

---

**Status**: Observation phase tooling deployed (commit `045a868`)  
**Next Action**: Deploy with MetricsCollector instantiated, begin 7-day measurement period  
**Principle**: *"Production without metrics is blind. You do not run blind systems."*
