# Monitoring & Metrics

This guide explains the runtime metrics available via /status and the optional Prometheus /metrics endpoint.

## /status (JSON)

- Backward-compatible fields:
  - performance.impact.cpu: string (e.g., "3.4%")
  - performance.impact.memory: string (e.g., "123.4MB")
- Measured metrics (additive):
  - performance.metrics.cpu
    - { value: <number>, unit: 'percent', measured: true }
  - performance.metrics.memory
    - { value: <rssBytes>, unit: 'bytes', measured: true }
  - performance.metrics.eventLoopDelayP99 (when supported)
    - { value: <ms>, unit: 'milliseconds', measured: true }

Example snippet:
```json path=null start=null
{
  "protocol": "rdcp/1.0",
  "timestamp": "2025-09-20T03:02:55.130Z",
  "performance": {
    "impact": { "cpu": "2.7%", "memory": "112.3MB" },
    "metrics": {
      "cpu": { "value": 2.65, "unit": "percent", "measured": true },
      "memory": { "value": 117620736, "unit": "bytes", "measured": true },
      "eventLoopDelayP99": { "value": 4.12, "unit": "milliseconds", "measured": true }
    }
  }
}
```

## /metrics (Prometheus exposition)

- Disabled by default; enable via adapter capabilities:
```js path=null start=null
adapters.express.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth,
  capabilities: {
    metrics: { enabled: true, endpointPath: '/metrics' } // endpointPath optional
  }
})
```

- No authentication required (intended for local scrape). Protect at the ingress or via network segmentation in production.
- Content-Type: text/plain; version=0.0.4; charset=utf-8

Exposed metrics:
```text path=null start=null
# HELP rdcp_cpu_percent CPU percent per-core normalized.
# TYPE rdcp_cpu_percent gauge
rdcp_cpu_percent 2.65
# HELP rdcp_memory_rss_bytes Resident set size in bytes.
# TYPE rdcp_memory_rss_bytes gauge
rdcp_memory_rss_bytes 117620736
# HELP rdcp_event_loop_delay_p99_milliseconds Event loop delay P99 in milliseconds.
# TYPE rdcp_event_loop_delay_p99_milliseconds gauge
rdcp_event_loop_delay_p99_milliseconds 4.12
```

Notes:
- CPU% is computed from process.cpuUsage() deltas normalized by CPU cores.
- Memory is process.memoryUsage().rss (resident set bytes).
- Event loop delay uses perf_hooks.monitorEventLoopDelay when available; omitted if unavailable.

## Best Practices
- Prefer scraping /metrics from a sidecar/agent or via service discovery in production.
- Protect /metrics via network policy or gateway; avoid exposing publicly.
- Use the JSON /status measured metrics for programmatic checks or dashboards when Prometheus is not used.