# DataDog 10‑Minute Quickstart (RDCP + OpenTelemetry)

This guide shows two validated ways to send OpenTelemetry traces to Datadog and correlate RDCP debug logs:
- A) Direct OTLP HTTP ingestion (fastest path, no Agent required)
- B) Datadog Agent with OTLP receiver (production-friendly)

Both paths use:
- service.name/env/version mapping via OpenTelemetry Resource attributes
- RDCP trace correlation: `setupRDCPWithOpenTelemetry(rdcp)`

Important
- Do not hardcode API keys. Use environment variables (e.g., DATADOG_API_KEY) and never print them.
- Choose the correct site: datadoghq.com (US), datadoghq.eu (EU), etc.

---

A) Direct ingestion (no Agent)

1) Install dependencies
```bash
npm install @opentelemetry/sdk-node @opentelemetry/api \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/instrumentation-http @opentelemetry/instrumentation-express \
  @opentelemetry/resources @opentelemetry/semantic-conventions \
  express @rdcp/server @rdcp/otel-plugin
```

2) Create otel-init.js (initialize OTel + Datadog OTLP HTTP)
```javascript
// otel-init.js
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')

const DATADOG_SITE = process.env.DD_SITE || 'datadoghq.com' // e.g. datadoghq.eu
const exporter = new OTLPTraceExporter({
  url: `https://otlp.${DATADOG_SITE}/v1/traces`,
  headers: { 'DD-API-KEY': process.env.DATADOG_API_KEY }
})

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'rdcp-demo-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.OTEL_ENV || process.env.NODE_ENV || 'development'
  }),
  traceExporter: exporter,
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()]
})

sdk.start().then(() => {
  console.log('OpenTelemetry SDK initialized (Datadog direct OTLP)')
}).catch(err => {
  console.error('Failed to initialize OpenTelemetry SDK', err)
})
```

3) Create server.js (RDCP + trace correlation)
```javascript
// server.js
require('./otel-init') // initialize OTel before app code
const express = require('express')
const { RDCPClient } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

const app = express()
app.use(express.json())

const rdcp = new RDCPClient({ apiKey: process.env.RDCP_API_KEY || 'dev-key-32-characters-minimum-length' })
setupRDCPWithOpenTelemetry(rdcp)

app.get('/users', (req, res) => {
  rdcp.debug.api('Users list requested', { userAgent: req.headers['user-agent'] })
  res.json({ users: [{ id: 1, name: 'Alice' }], total: 1 })
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`App listening on :${port}`))
```

4) Run
```bash
# REQUIRED secrets; do not echo values
export DATADOG_API_KEY={{DATADOG_API_KEY}}
export DD_SITE=datadoghq.com # or datadoghq.eu, etc.
export OTEL_SERVICE_NAME=rdcp-demo-app
export OTEL_SERVICE_VERSION=1.0.0
export OTEL_ENV=staging

node server.js
```

5) Verify in Datadog
- APM → Traces: find service = `rdcp-demo-app`, env = `staging`
- Click a trace → correlated RDCP debug logs include trace IDs automatically

---

B) Datadog Agent with OTLP receiver (Docker)

1) docker-compose.datadog.yml (Agent + app)
```yaml
version: '3.8'
services:
  datadog-agent:
    image: gcr.io/datadoghq/agent:latest
    environment:
      - DD_API_KEY=${DATADOG_API_KEY}
      - DD_SITE=${DD_SITE:-datadoghq.com}
      - DD_APM_ENABLED=true
      - DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT=0.0.0.0:4318
      - DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_GRPC_ENDPOINT=0.0.0.0:4317
      - DD_LOGS_ENABLED=false
    ports:
      - '4317:4317' # OTLP gRPC
      - '4318:4318' # OTLP HTTP
    restart: unless-stopped

  app:
    build: .
    environment:
      - RDCP_API_KEY=${RDCP_API_KEY}
      - OTEL_SERVICE_NAME=rdcp-demo-app
      - OTEL_SERVICE_VERSION=1.0.0
      - OTEL_ENV=staging
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://datadog-agent:4318
    command: node server.js
    depends_on:
      - datadog-agent
    ports:
      - '3000:3000'
```

2) Update otel-init.js to use Agent endpoint when provided
```javascript
// inside otel-init.js, prefer Agent if OTEL_EXPORTER_OTLP_ENDPOINT set
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$, '')}/v1/traces`
  : `https://otlp.${DATADOG_SITE}/v1/traces`

const headers = endpoint.startsWith('http://datadog-agent')
  ? undefined // Agent does not require DD-API-KEY header from the app
  : { 'DD-API-KEY': process.env.DATADOG_API_KEY }

const exporter = new OTLPTraceExporter({ url: endpoint, headers })
```

3) Run with Agent
```bash
export DATADOG_API_KEY={{DATADOG_API_KEY}}
export RDCP_API_KEY={{RDCP_API_KEY}}
docker compose -f docker-compose.datadog.yml up --build
```

Validation checklist (Datadog‑specific)
- service mapping: OpenTelemetry `service.name` → Datadog `service`
- environment: OpenTelemetry `deployment.environment` → Datadog `env` (you can also set DD_ENV)
- version: OpenTelemetry `service.version` → Datadog `version` (you can also set DD_VERSION)
- headers: Direct OTLP requires `DD-API-KEY`; Agent path does not

Notes (from Datadog + OpenTelemetry docs)
- OTLP endpoints: use `https://otlp.<DD_SITE>/v1/traces` for direct ingestion
- Agent OTLP receivers: enable with `DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT` and/or `...GRPC_ENDPOINT`
- You can also route via OpenTelemetry Collector + Datadog exporter if you prefer centralized pipelines

---

Log correlation (Logs + Traces)
Option A — inject correlation IDs in app logs
- Add `dd.trace_id` and `dd.span_id` to your JSON logs, derived from the active OpenTelemetry span.
- For Node/Winston: convert OpenTelemetry hex IDs to Datadog decimal format for span_id and (lower 64 bits) for trace_id.
- Keep service/env/version in logs: `dd.service`, `dd.env`, `dd.version`.

Option B — Log pipeline remappers (Datadog)
- Create Trace ID Remapper and Span ID Remapper processors to use your log attributes as canonical IDs.
- Remappers do not convert hex → decimal; ensure your app emits decimal IDs.

Dashboard integration (Traces + Logs side‑by‑side)
- Create a new Dashboard with two widgets:
  1) “Trace Search & Analytics” filtered by `service:rdcp-demo-app env:staging`.
  2) “Log Stream” filtered by `service:rdcp-demo-app env:staging has:dd.trace_id`.
- Add template variables: `service`, `env`.
- From a trace view, use “View Related Logs” to validate correlation.

Performance context
- See Performance Analysis for measured overheads (RDCP/OTel and Datadog Agent notes).
- For production, prefer the Agent path and batch exports.

That’s it. You now have Datadog APM traces with RDCP debug log correlation in under 10 minutes.