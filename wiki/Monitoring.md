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

## Prometheus Scrape Configuration (example)

```yaml path=null start=null
scrape_configs:
  - job_name: 'rdcp'
    scrape_interval: 15s
    metrics_path: /metrics   # or your configured endpointPath
    scheme: http            # https if terminated at app; otherwise via ingress
    static_configs:
      - targets: ['rdcp-service:3000']
```

Notes:
- The metrics endpoint does not require authentication. Restrict access via network policy, mTLS at the proxy, or IP allow-lists.
- If you configure a custom endpointPath (e.g., '/internal/metrics'), set metrics_path accordingly.

## Alerting Rules (examples)

```yaml path=null start=null
groups:
  - name: rdcp-runtime
    rules:
      - alert: RDCPHighRSSMemory
        expr: avg_over_time(rdcp_memory_rss_bytes[5m]) > 1.5e9  # ~1.5 GB
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'RDCP high RSS memory (avg over 5m > 1.5GB)'
          description: 'Process RSS averaged over 5m is {{ $value | humanize1024 }}. Investigate memory usage or leaks.'

      - alert: RDCPHighEventLoopDelayP99
        expr: rdcp_event_loop_delay_p99_milliseconds > 100
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'RDCP high event loop delay (P99 > 100ms)'
          description: 'Node.js event loop P99 delay sustained above 100ms. Indicates CPU saturation, sync work on the event loop, or GC pressure.'
```

Tuning guidance:
- Adjust thresholds per service SLOs and pod/container limits.
- Consider a second, lower-severity alert when CPU% is elevated and P99 ELD is rising concurrently.

## Per-adapter paths and basePath

- RDCP endpoints are served under basePath (default '/rdcp/v1'):
  - `${basePath}/discovery`, `${basePath}/control`, `${basePath}/status`, `${basePath}/health`.
- The metrics endpoint path is independent of basePath. It is matched exactly as configured via `capabilities.metrics.endpointPath` and defaults to `/metrics`.

Examples:

```js path=null start=null
// Express
app.use(
  adapters.express.createRDCPMiddleware({
    authenticator: auth.validateRDCPAuth,
    basePath: '/api/rdcp',
    capabilities: { metrics: { enabled: true, endpointPath: '/internal/metrics' } }
  })
)
// -> RDCP status at /api/rdcp/status
// -> Prometheus metrics at /internal/metrics (no auth)
```

```js path=null start=null
// Fastify
fastify.addHook('preHandler', adapters.fastify.createRDCPMiddleware({
  authenticator: auth.validateRDCPAuth,
  basePath: '/rdcp/v1',
  capabilities: { metrics: { enabled: true } } // defaults to '/metrics'
}))
```

```js path=null start=null
// Koa
app.use(
  adapters.koa.createRDCPMiddleware({
    authenticator: auth.validateRDCPAuth,
    capabilities: { metrics: { enabled: true, endpointPath: '/metrics' } }
  })
)
```

Security reminder: even though the metrics endpoint is unauthenticated, it should not be publicly reachable. Use an internal-only path, IP allow-lists, service mesh policies, or a dedicated metrics sidecar.

## Grafana: minimal dashboard example

A minimal dashboard with two panels (RSS and Event Loop Delay P99):

```json path=null start=null
{
  "annotations": { "list": [] },
  "editable": true,
  "panels": [
    {
      "type": "timeseries",
      "title": "RSS Memory (bytes)",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [ { "expr": "rdcp_memory_rss_bytes" } ],
      "fieldConfig": { "defaults": { "unit": "bytes" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 24, "x": 0, "y": 0 }
    },
    {
      "type": "timeseries",
      "title": "Event Loop Delay P99 (ms)",
      "datasource": { "type": "prometheus", "uid": "PROM_DS" },
      "targets": [ { "expr": "rdcp_event_loop_delay_p99_milliseconds" } ],
      "fieldConfig": { "defaults": { "unit": "ms" }, "overrides": [] },
      "gridPos": { "h": 8, "w": 24, "x": 0, "y": 8 }
    }
  ],
  "schemaVersion": 38,
  "style": "dark",
  "time": { "from": "now-6h", "to": "now" },
  "timezone": "browser",
  "title": "RDCP Runtime Metrics",
  "version": 1
}
```

Import into Grafana and set the Prometheus data source (replace PROM_DS with your UID).
