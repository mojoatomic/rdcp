# New Relic Quickstart: RDCP + OpenTelemetry in 10 minutes

Goal: Send OpenTelemetry traces to New Relic and correlate RDCP debug logs with trace/span context in under 10 minutes.

What you’ll set up:
- Direct OTLP HTTP export from your Node.js app to New Relic (recommended)
- RDCP + OpenTelemetry correlation for enriched debug logs
- Optional: OpenTelemetry Collector route

Prerequisites
- New Relic account with a License Key (a.k.a. ingest license key)
  - Example: NEW_RELIC_LICENSE_KEY=NRII-... (keep secret)
- Node.js 16+
- Packages: @opentelemetry/sdk-node, @opentelemetry/exporter-otlp-http, @opentelemetry/instrumentation-http, @opentelemetry/instrumentation-express
- RDCP packages: @rdcp/server and @rdcp.dev/otel-plugin

1) Choose your New Relic region
New Relic OTLP ingest endpoints:
- US: https://otlp.nr-data.net
- EU: https://otlp.eu01.nr-data.net

For traces via OTLP HTTP, use the /v1/traces path.

2) Set environment variables (HTTP/protobuf recommended)
Using zsh/bash:

```bash
# Required New Relic secret (store securely)
export NEW_RELIC_LICENSE_KEY='{{NEW_RELIC_LICENSE_KEY}}'

# Service identity
export SERVICE_NAME='my-service'
export SERVICE_VERSION='1.0.0'
export NODE_ENV='production'

# Prefer OTLP HTTP/protobuf
export OTEL_EXPORTER_OTLP_PROTOCOL='http/protobuf'

# Pick region endpoint (US shown). For EU use: https://otlp.eu01.nr-data.net
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT='https://otlp.nr-data.net:4318/v1/traces'

# Required header for New Relic OTLP ingest
export OTEL_EXPORTER_OTLP_HEADERS="api-key=${NEW_RELIC_LICENSE_KEY}"
```

Notes
- http/protobuf over port 4318 is recommended by New Relic. Port 443 also works.
- Alternative gRPC endpoint: https://otlp.nr-data.net:4317 (use @opentelemetry/exporter-otlp-grpc)

3) Minimal Node.js setup (RDCP + OTel + New Relic)
Create file: newrelic-otel.js

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http')
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http')

// New Relic OTLP HTTP exporter
const traceExporter = new OTLPTraceExporter({
  // Falls back to env OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'https://otlp.nr-data.net:4318/v1/traces',
  headers: { 'api-key': process.env.NEW_RELIC_LICENSE_KEY }
})

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'rdcp-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'production'
  }),
  traceExporter,
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation()
  ]
})

sdk.start()

// RDCP + OpenTelemetry correlation
const { RDCPClient } = require('@rdcp/server')
const { setupRDCPWithOpenTelemetry } = require('@rdcp.dev/otel-plugin')

const rdcp = new RDCPClient({
  apiKey: process.env.RDCP_API_KEY,
  endpoint: process.env.RDCP_ENDPOINT,
  tags: {
    environment: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME,
    version: process.env.SERVICE_VERSION
  }
})

setupRDCPWithOpenTelemetry(rdcp)

console.log('🚀 RDCP + OpenTelemetry initialized for New Relic')
console.log('📡 Exporting via', process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT)
```

Run your app with the initializer:

```bash
node -r ./newrelic-otel.js app.js
```

4) Verify in New Relic
- Open https://one.newrelic.com and navigate to APM & Services
- Find your service by name (SERVICE_NAME)
- Open a trace and check for RDCP debug log correlation in your logs/attributes

5) Optional: Use OpenTelemetry Collector instead of direct export
Minimal collector.yaml:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:
processors:
  batch:
exporters:
  otlphttp:
    endpoint: https://otlp.nr-data.net
    headers:
      api-key: ${NEW_RELIC_LICENSE_KEY}
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Then point your app at the collector:

```bash
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT='http://collector:4318/v1/traces'
export OTEL_EXPORTER_OTLP_HEADERS='' # header handled by collector
```

Troubleshooting
- 401 Unauthorized exporting to /v1/traces: missing api-key header
- 403 Forbidden: invalid API key
- No traces: ensure service.name is set and sampling is not 0
- Region mismatch: use EU endpoint https://otlp.eu01.nr-data.net if your account is EU-based
- Firewall: allow egress to ports 4318 (HTTP) or 443

Security Notes
- Never print your NEW_RELIC_LICENSE_KEY
- Use environment variables or secret managers for keys

What’s next
- See Backend Configurations for an enterprise New Relic setup and Kubernetes manifests
- Check Performance Analysis for production sampling and batching guidance
- Explore Framework Examples for Express, Next.js, Fastify, and Koa
