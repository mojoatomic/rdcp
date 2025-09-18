# RDCP Demo App

A complete, runnable reference application packaged with the RDCP SDK that validates everything we claim in the docs. It demonstrates RDCP protocol endpoints, runtime debug control, OpenTelemetry trace correlation, and performance characteristics in a real Express server.

Why this exists:
- Immediate validation that the SDK works end‑to‑end
- A living reference implementation matching documentation examples
- A starter template teams can clone and adapt
- A place to continuously add new, verifiable examples (auth modes, multi‑tenancy, metrics, etc.)

---

## What’s included today

Implemented capabilities:
- Express server using RDCP SDK
- All 5 RDCP endpoints exposed
  - GET /.well-known/rdcp
  - GET /rdcp/v1/discovery
  - POST /rdcp/v1/control
  - GET /rdcp/v1/status
  - GET /rdcp/v1/health
- OpenTelemetry integration via @rdcp/otel-plugin
  - OTLP HTTP exporter (configurable)
  - Works with Jaeger all-in-one (via docker-compose)
  - RDCP debug logs enriched with trace correlation when available
- Performance validation
  - Micro-benchmark script validates < 2ms target (observed ~0.27ms avg locally)
- Documentation example validation
  - Script that executes framework examples against the running server

Monorepo integration:
- Local dependency on @rdcp/server and @rdcp/otel-plugin (file: links) so the demo always runs against the actual code

---

## Project layout

packages/rdcp-demo-app/
- package.json – local deps on @rdcp/server, @rdcp/otel-plugin; scripts for dev/otel/benchmark/examples
- src/
  - server.js – Express server wiring RDCP endpoints + business routes
  - opentelemetry.js – NodeSDK setup, OTLP exporter, RDCP plugin integration
  - routes/
    - rdcp/ (reserved for fine-grained endpoints if we split later)
    - api/ (reserved for larger business examples)
- scripts/
  - benchmark.js – latency measurements for /rdcp/v1/status
  - test-examples.js – runs simple doc examples against the live server
- docker-compose.yml – Jaeger all‑in‑one + app service (optional)
- README.md – quick start

---

## How it works

1) RDCP endpoints
- The app mounts RDCP protocol endpoints using the SDK’s exported handlers (protocolDiscovery, debugSystemDiscovery, runtimeControl, statusMonitoring, healthCheck).
- Endpoints return protocol: "rdcp/1.0" and conform to the spec schemas.

2) OpenTelemetry integration
- src/opentelemetry.js configures NodeSDK + OTLP HTTP exporter (default http://localhost:4318).
- @rdcp/otel-plugin is enabled (setupRDCPWithOpenTelemetry) to enrich RDCP debug logs with trace context (traceId/spanId) when available.
- You can verify traces in Jaeger UI when the exporter is pointed at a running Jaeger collector.

3) Business routes
- /api/users and /api/reports demonstrate using the debug logger and simulate small workloads to generate traces and logs.

4) Performance
- scripts/benchmark.js fires N requests to /rdcp/v1/status and reports average and p95 latency.
- Local results: Average ~0.27 ms, p95 ~0.47 ms (on loopback; results vary per machine).

---

## Running the app

Metrics:
- Endpoint: GET /metrics
- Includes:
  - rdcp_demo_requests_total{route,method,status}
  - rdcp_demo_request_duration_seconds{route,method,status}
- Default process metrics via prom-client

Prerequisites:
- Node.js 18+ (tested on Node v24)
- Optional: Docker (for Jaeger)

Install:
- From repo root:
  - npm install --prefix packages/rdcp-demo-app

Run (no tracing):
- npm run dev --prefix packages/rdcp-demo-app
- Visit: http://localhost:3000/.well-known/rdcp

Run with OpenTelemetry (local exporter to localhost:4318):
- OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
  OTEL_SERVICE_NAME=rdcp-demo-app \
  node --require ./src/opentelemetry.js src/server.js  (from packages/rdcp-demo-app)

Jaeger via Docker (optional):
- docker compose -f packages/rdcp-demo-app/docker-compose.yml up -d jaeger
- Jaeger UI: http://localhost:16686
- Point OTLP exporter to http://localhost:4318

Validate:
- curl -s http://localhost:3000/.well-known/rdcp | jq
- curl -s http://localhost:3000/rdcp/v1/discovery | jq
- curl -s http://localhost:3000/api/users | jq

Examples & Benchmarks:
- npm run examples --prefix packages/rdcp-demo-app
- npm run benchmark --prefix packages/rdcp-demo-app

---

## Authentication

### Basic (API Key) - Enforced in Demo

### Standard (JWT Bearer) - Demo

- Helper script to mint JWTs for testing: `npm run gen:jwt --prefix packages/rdcp-demo-app -- user@example.com discovery,status,control 1h`
- Required headers per RDCP spec for Standard:
  - `X-RDCP-Auth-Method: bearer`
  - `X-RDCP-Client-ID: <client-id>`
  - `Authorization: Bearer <token>`
- Supertest e2e coverage (passing):
  - Rejects missing/invalid tokens
  - Accepts valid token
  - POST control works with valid token

Sample commands:
- export JWT_SECRET='change-in-production'
- TOKEN=$(npm run -s gen:jwt --prefix packages/rdcp-demo-app -- user@example.com discovery,status,control 1h)
- curl -H 'X-RDCP-Auth-Method: bearer' \
       -H 'X-RDCP-Client-ID: demo-client' \
       -H "Authorization: Bearer $TOKEN" \
       http://localhost:3000/rdcp/v1/status | jq

- The demo mounts the RDCP middleware with an authenticator that wraps `validateRDCPAuth`.
- All RDCP endpoints except `/.well-known/rdcp` require authentication.
- Required headers per RDCP spec:
  - `X-RDCP-Auth-Method: api-key`
  - `X-RDCP-Client-ID: <client-id>`
  - `Authorization: Bearer <32+ char API key>`

Supertest e2e coverage (passing):
- Allows `/.well-known/rdcp` without auth
- Rejects `/rdcp/v1/discovery` without headers
- Rejects invalid/short API key
- Accepts valid API key with required headers
- `POST /rdcp/v1/control`: 405 on GET, 401 without headers, 200 with valid headers

Sample commands (basic mode):
- export RDCP_API_KEY='dev-key-change-in-production-min-32-chars'
- curl -H 'X-RDCP-Auth-Method: api-key' \
       -H 'X-RDCP-Client-ID: demo-client' \
       -H "Authorization: Bearer $RDCP_API_KEY" \
       http://localhost:3000/rdcp/v1/status | jq

Current state:
- The app wires up RDCP authentication utilities and middleware scaffolding; full strict enforcement (headers & modes) will be enabled as we add the complete demo flows below.

Environment variables (for future/full flows):
- RDCP_API_KEY – 32+ chars, used for API key auth
- JWT_SECRET – used for standard JWT bearer auth
- RDCP_AUTH_LEVEL – basic | standard | enterprise (determines default mode)
- RDCP_TRUSTED_CA_FINGERPRINTS – comma-separated issuer fingerprints (enterprise)
- RDCP_ALLOWED_CERT_SUBJECTS – comma-separated allowed CN subjects (enterprise)

Required RDCP headers per spec:
- X-RDCP-Auth-Method: api-key | bearer | mtls | hybrid
- X-RDCP-Client-ID: <client-id>
- X-RDCP-Request-ID: <uuid> (recommended)

Sample commands (basic mode):
- export RDCP_API_KEY='dev-key-change-in-production-min-32-chars'
- curl -H 'X-RDCP-Auth-Method: api-key' \
       -H 'X-RDCP-Client-ID: demo-client' \
       -H "Authorization: Bearer $RDCP_API_KEY" \
       http://localhost:3000/rdcp/v1/discovery | jq

Sample commands (standard JWT mode):
- export JWT_SECRET='change-in-production'
- TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'user@example.com', scopes:['discovery','status','control'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'1h' }))")
- curl -H 'X-RDCP-Auth-Method: bearer' \
       -H 'X-RDCP-Client-ID: demo-client' \
       -H "Authorization: Bearer $TOKEN" \
       http://localhost:3000/rdcp/v1/status | jq

Enterprise (mTLS + token) – demo strategy:
- SDK supports a base64-encoded JSON test certificate via `X-Client-Cert` for local/demo scenarios (in addition to real X.509 parsing).
- A helper script is provided to generate a valid mock certificate and print base64 to stdout.
- Optional Bearer token can be provided; validator verifies `sub` matches the certificate CN when present.

Helper script (generate base64 cert):
- npm run gen:mtls-cert --prefix packages/rdcp-demo-app -- client.tenant123.rdcp.internal

Example curl (mTLS-only):
- CERT=$(npm run -s gen:mtls-cert --prefix packages/rdcp-demo-app -- client.tenant123.rdcp.internal)
- curl -H 'X-RDCP-Auth-Method: mtls' \
       -H 'X-RDCP-Client-ID: demo-client' \
       -H "X-Client-Cert: $CERT" \
       http://localhost:3000/rdcp/v1/status | jq

Example curl (mTLS + JWT hybrid):
- export JWT_SECRET='change-in-production'
- TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'client.tenant123.rdcp.internal', scopes:['discovery','status','control'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'1h' }))")
- CERT=$(npm run -s gen:mtls-cert --prefix packages/rdcp-demo-app -- client.tenant123.rdcp.internal)
- curl -H 'X-RDCP-Auth-Method: mtls' \
       -H 'X-RDCP-Client-ID: demo-client' \
       -H "X-Client-Cert: $CERT" \
       -H "Authorization: Bearer $TOKEN" \
       http://localhost:3000/rdcp/v1/status | jq

---

## Validation checklist

- Protocol compliance
  - /.well-known/rdcp returns rdcp/1.0 and endpoints
  - /rdcp/v1/* endpoints return spec schemas
- Trace correlation
  - With OpenTelemetry enabled and Jaeger running, traces include business endpoints
  - RDCP debug logs include traceId/spanId when present
- Performance
  - /rdcp/v1/status < 2ms avg on loopback
- Examples
  - npm run examples succeeds

---

## Recent Progress

- Basic (API key) enforcement added with e2e tests
- Standard (JWT Bearer) demo added with mint helper and e2e tests
- Enterprise (mTLS + optional JWT) demo added with base64 JSON cert helper and e2e tests
- Multi-tenancy isolation e2e added: per-tenant category enable/disable and verification
- Rate limiting for POST /rdcp/v1/control (configurable) with audit trail logging and e2e tests
- Prometheus /metrics endpoint with request counters and histograms (e2e)

## Roadmap – What to add next (app improvements)

Authentication & security:
- Enforce RDCP required headers and authenticator in middleware for all RDCP endpoints
- Implement fully testable flows for all 3 security levels:
  1) basic – API key validation with constant-time compare
  2) standard – JWT bearer with scopes, expiry, issuer/audience checks
  3) enterprise – mTLS + optional token (hybrid), with cert subject validation and trusted CA fingerprints
- Add e2e tests that cover success/failure cases per mode (missing header, invalid key, expired token, invalid cert, etc.)
- Add rate limiting for POST /rdcp/v1/control (demo-only, configurable)
- Add audit trail output for control operations (structured logs)

Multi-tenancy:
- Add explicit tenant header handling and views (X-RDCP-Tenant-ID, X-RDCP-Isolation-Level)
- Add routes/scripts to enable/disable categories per-tenant and verify isolation
- Demonstrate tenant context in responses and debug logs

Runtime controls & categories:
- CLI/script to toggle categories with TTL (temporary controls)
- Include all standard categories and add simple examples for each
- Add /api routes that exercise QUERIES, REPORTS, CACHE, AUTH, INTEGRATIONS paths

Traces and propagation:
- Add internal service call (second mini-service) to demonstrate context propagation across services
- Document both W3C traceparent and B3 propagation (if configured)
- Add baggage example for tenant/user correlation

Observability & metrics:
- Add application-level metrics (request counts, latencies) and expose /metrics (Prometheus optional)
- Add logs-to-traces correlations in examples

Testing & CI:
- Supertest-based e2e tests for all endpoints under each auth mode
- Scripted test harness to run benchmarks as part of CI (informational)
- Add GitHub Actions example to run the demo app tests

Developer experience:
- Add Postman collection / HTTPie scripts
- Add example front-end (optional) that calls the API and shows trace ids
- Add Dockerfile for the app container (docker-compose already references one)

---

## Contributing

- Extend business examples in src/routes/api/
- Add auth mode scenarios and tests in a new tests/ directory
- Keep examples minimal and focused on validating SDK behavior
- When adding new features in the SDK, add a small demonstration here

---

## Notes

- This demo is intentionally simple; production deployments should use proper TLS termination and secure secret management.
- OpenTelemetry is optional at runtime; when disabled, RDCP debug logging still works without trace context.
