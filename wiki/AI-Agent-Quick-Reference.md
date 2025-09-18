# AI Agent Quick Reference: RDCP SDK Implementation

Audience: This page is for AI agents automating integration of the RDCP SDK into Node.js services. It is intentionally concrete, prescriptive, and copy-paste ready. No marketing language; only working steps and links to deeper pages.

Repository root: ./ (this repo)

---

Immediate action items

1) Start a clean, in-memory tracing demo (optional but recommended for validation)
- Provides Jaeger UI locally and a known-good reference implementation.

```bash path=null start=null
# One command: launches Jaeger (in-memory), starts services, seeds traces
./packages/rdcp-demo-app/scripts/run-inmemory-demo.sh
# When finished: fully clean up
./packages/rdcp-demo-app/scripts/stop-inmemory-demo.sh
```

Verify services registered in Jaeger:
```bash path=null start=null
curl -s http://localhost:16686/api/services | jq -r '.data[]'
# Expect: rdcp-demo-app, upstream-service
```

2) Minimal working integration (Express)

Install dependencies:
```bash path=null start=null
# If consuming from npm registry
npm install @rdcp/server
# Optional (if you use OpenTelemetry correlation)
npm install @rdcp/otel-plugin @opentelemetry/api
```

Minimal server wiring:
```js path=null start=null
const express = require('express')
const {
  adapters,
  setTraceProvider,
  validateRDCPAuth
} = require('@rdcp/server')

// Optional: enable OpenTelemetry correlation if you have OTel
let hasOTel = false
try {
  const { OpenTelemetryProvider } = require('@rdcp/otel-plugin')
  setTraceProvider(new OpenTelemetryProvider())
  hasOTel = true
} catch (_) {}

const app = express()
const rdcp = adapters.express.createRDCPMiddleware({
  authenticator: (req) => {
    try {
      const r = validateRDCPAuth(req)
      return !!(r && r.valid)
    } catch { return false }
  },
  security: { level: 'basic', methods: ['api-key'], required: true },
  capabilities: { multiTenancy: false, performanceMetrics: true, temporaryControls: false, auditTrail: true }
})

app.use(express.json())
app.use(rdcp)

app.listen(3000, () => {
  console.log('RDCP server listening on :3000', { otel: hasOTel })
})
```

Single-command verification:
```bash path=null start=null
# Open endpoint (no auth)
curl -s http://localhost:3000/.well-known/rdcp | jq

# Auth-required endpoint (basic)
RDCP_API_KEY='dev-key-change-in-production-min-32-chars'
curl -s \
  -H 'X-RDCP-Auth-Method: api-key' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H "Authorization: Bearer $RDCP_API_KEY" \
  http://localhost:3000/rdcp/v1/status | jq
```

---

Implementation decision tree

- If the project already uses OpenTelemetry
  - Install @rdcp/otel-plugin and setTraceProvider(new OpenTelemetryProvider()).
  - Launch your service with NodeSDK bootstrap (example below) or integrate with your existing OTel setup.
  - Validate traces in your backend (Jaeger quick path included above).

- If the project has console.log only
  - Integrate RDCP; replace console.log with RDCP debug categories.
  - No OTel required; you can add OTel later without code churn.

- If the project uses structured logging (Winston/Pino)
  - Keep your logger; add RDCP debug calls alongside.
  - RDCP adds controllable categories and (optionally) trace correlation.

---

OpenTelemetry quick setup (optional but recommended)

1) Add an OTel bootstrap file (example):
```js path=null start=null
// opentelemetry.js
const { NodeSDK } = require('@opentelemetry/sdk-node')
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
const { Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions')
const { setupRDCPWithOpenTelemetry } = require('@rdcp/otel-plugin')

const serviceName = process.env.OTEL_SERVICE_NAME || 'my-rdcp-service'
const otlp = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: `${otlp}/v1/traces` }),
  resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName }),
  instrumentations: [getNodeAutoInstrumentations()]
})

sdk.start().then(() => {
  setupRDCPWithOpenTelemetry({ enableTraceCorrelation: true })
  console.log('OpenTelemetry started', { serviceName, otlp })
}).catch((err) => console.error('OTel start failed', err))
```

2) Start your app with bootstrap:
```bash path=null start=null
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
OTEL_SERVICE_NAME=my-rdcp-service \
node --require ./opentelemetry.js server.js
```

---

Security header checklist (RDCP v1.0)

Always include on authenticated endpoints:
```http path=null start=null
X-RDCP-Auth-Method: api-key | bearer | mtls | hybrid
X-RDCP-Client-ID: <client-id>
Authorization: Bearer <token-or-api-key>
```

Multi-tenancy (when applicable):
```http path=null start=null
X-RDCP-Tenant-ID: <tenant-id>
X-RDCP-Isolation-Level: global|process|namespace|organization
X-RDCP-Tenant-Name: <optional>
```

---

Standard responses (copy/paste)

Success example:
```json path=null start=null
{
  "protocol": "rdcp/1.0",
  "timestamp": "2025-09-18T10:30:00Z",
  "data": { "example": true }
}
```

Error example:
```json path=null start=null
{
  "error": {
    "code": "RDCP_VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {},
    "protocol": "rdcp/1.0"
  }
}
```

---

Common failure modes and exact fixes

- Jaeger Dependencies page is empty
  - Cause: With distributed storage, Jaeger requires dependency jobs; with in-memory it computes on-demand.
  - Fix: Use the in-memory helper for demos:
    ```bash
    ./packages/rdcp-demo-app/scripts/run-inmemory-demo.sh
    ```

- 401 on /rdcp/v1/* during tests
  - Cause: Missing headers or invalid token/key.
  - Fix: Ensure required headers and valid credentials per security level.

- Missing service in Jaeger services list
  - Cause: OTEL_EXPORTER_OTLP_ENDPOINT not set or service not started with bootstrap.
  - Fix: Start service with `node --require ./opentelemetry.js` and a valid OTLP endpoint.

---

Version compatibility matrix (current repo)

- Node.js: 18+ (tested on v24)
- @opentelemetry/api: ^1.9.0
- @opentelemetry/auto-instrumentations-node: ^0.53.0
- @opentelemetry/sdk-node: ^0.52.1
- Jaeger all-in-one (demo): 1.57

---

Performance expectations (demo reference)

- RDCP /rdcp/v1/status benchmark (demo): < 2ms average on loopback (machine dependent)
- Run benchmark:
```bash path=null start=null
npm --prefix packages/rdcp-demo-app run benchmark
```

---

Reference implementations (copy/paste ready)

- Quick local in-memory demo:
  - Start: ./packages/rdcp-demo-app/scripts/run-inmemory-demo.sh
  - Stop:  ./packages/rdcp-demo-app/scripts/stop-inmemory-demo.sh
  - Jaeger UI: http://localhost:16686

- Trace propagation demo endpoints (upstream-service → rdcp-demo-app): see
  - wiki/examples/Trace-Propagation-Demo.md

- RDCP Demo App overview and usage: see
  - wiki/examples/RDCP-Demo-App.md

- OpenTelemetry overview for RDCP: see
  - wiki/examples/opentelemetry/Overview.md

---

Validation patterns (server side)

```js path=null start=null
const { createRDCPError } = require('@rdcp/server')

function handleControl(req, res) {
  const ok = /* validate request body against schema */ true
  if (!ok) {
    return res.status(400).json(createRDCPError('RDCP_VALIDATION_ERROR', 'Invalid control payload'))
  }
res.json({ protocol: 'rdcp/1.0', success: true, timestamp: new Date().toISOString() })
}
```

### Error handling with RDCPClient

```javascript
try {
  await client.getStatus()
} catch (err) {
  if (err && err.name === 'RDCPClientError') {
    console.error('RDCP error:', { code: err.code, status: err.statusCode, message: err.message })
  } else {
    console.error('Unexpected error:', err)
  }
}
```

---

CI hints (optional)

- Smoke test with in-memory demo on CI runners that allow Docker-in-Docker or Docker Desktop.
- Otherwise: run unit tests and skip trace seeding.

---

Done. This page contains everything an AI agent needs to bootstrap RDCP in a project, verify success locally, and drill into deeper examples via pinned wiki links.

---

## Next steps
- Validate with the in-memory demo: [RDCP Demo App](examples/RDCP-Demo-App)
- Add endpoints to your service: [Basic Usage](Basic-Usage)
- Confirm current repo status: [Implementation Status](Implementation-Status)
- Deep-dive: Protocol references in docs/ (advanced)
