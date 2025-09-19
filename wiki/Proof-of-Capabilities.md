# Proof of Capabilities: Test Evidence and Demo Commands

This page records proof-based evidence of what the RDCP SDK + Demo App can do today, grounded in passing tests (184 tests across 16 suites), and provides copy/paste cURL commands to reproduce key behaviors live against the demo app.

Last verified: 2025-09-19

## Test Summary (Ground Truth)

- Test Suites: 16 passed, 16 total
- Tests: 184 passed, 184 total
- Snapshots: 0 total
- All adapters + e2e flows passing (Express, Fastify, Koa; Auth Basic/Standard/Enterprise; tenant RBAC; rate-limit + audit; TTL)

Example RDCP_AUDIT logs observed in tests (demo app):

```json
{"event":"RDCP_AUDIT","timestamp":"...","action":"enable","categories":["API_ROUTES"],"tenantId":"default","method":"bearer","clientId":"demo-client","statusCode":403}
{"event":"RDCP_AUDIT","timestamp":"...","action":"enable","categories":["API_ROUTES"],"tenantId":"default","method":"bearer","clientId":"demo-client","statusCode":200}
```

---

## How to use this page

- Each capability below has a “Demo command” section with cURL you can run against the demo app (http://localhost:3000 by default)
- Replace values in braces as needed (e.g., <tenantId>)
- Use environment variables for any secrets to avoid plain-text exposure (see examples)

Prerequisites

```bash
# From repo root, install demo app deps and run it
npm ci --prefix packages/rdcp-demo-app
npm run dev --prefix packages/rdcp-demo-app

# In a separate terminal, run the cURL commands below
```

---

## Authentication & Security

### Required RDCP headers (fast-fail on /rdcp/v1/*)
- Missing or invalid headers return RDCP_AUTH_REQUIRED (401)

Demo commands

```bash
# No headers → 401
curl -i http://localhost:3000/rdcp/v1/status

# Invalid X-RDCP-Auth-Method → 401
curl -i -H 'X-RDCP-Auth-Method: invalid' -H 'X-RDCP-Client-ID: demo-client' http://localhost:3000/rdcp/v1/status

# Missing X-RDCP-Client-ID → 401
curl -i -H 'X-RDCP-Auth-Method: api-key' http://localhost:3000/rdcp/v1/status
```

### Basic security level (API key)

Demo commands

```bash
export RDCP_API_KEY='dev-key-change-in-production-min-32-chars'
# Success (200) with required headers
curl -s \
  -H 'X-RDCP-Auth-Method: api-key' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H "Authorization: Bearer $RDCP_API_KEY" \
  http://localhost:3000/rdcp/v1/status | jq
```

### Standard security level (JWT bearer)

Demo commands

```bash
export JWT_SECRET='change-in-production'
# Valid JWT → 200
TOKEN_VALID=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'user@example.com', scopes: ['discovery','status','control'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
curl -s \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H "Authorization: Bearer $TOKEN_VALID" \
  http://localhost:3000/rdcp/v1/status | jq

# Expired JWT → 401 (issue a token that is already expired)
TOKEN_EXPIRED=$(node -e "const jwt=require('jsonwebtoken');const s=process.env.JWT_SECRET;const now=Math.floor(Date.now()/1000);console.log(jwt.sign({ sub:'user@example.com', scopes:['status'], exp: now-10 }, s, { algorithm:'HS256' }))")
curl -i \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H "Authorization: Bearer $TOKEN_EXPIRED" \
  http://localhost:3000/rdcp/v1/status

# Wrong issuer when JWT_ISSUER is set → 401
export JWT_ISSUER='good-issuer'
TOKEN_WRONG_ISSUER=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'user@example.com', iss:'bad-issuer', scopes:['status'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
curl -i -H 'X-RDCP-Auth-Method: bearer' -H 'X-RDCP-Client-ID: demo-client' -H "Authorization: Bearer $TOKEN_WRONG_ISSUER" http://localhost:3000/rdcp/v1/status

# Wrong audience when JWT_AUDIENCE is set → 401
export JWT_AUDIENCE='aud-expected'
TOKEN_WRONG_AUD=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'user@example.com', aud:'aud-wrong', scopes:['status'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
curl -i -H 'X-RDCP-Auth-Method: bearer' -H 'X-RDCP-Client-ID: demo-client' -H "Authorization: Bearer $TOKEN_WRONG_AUD" http://localhost:3000/rdcp/v1/status
```

### Enterprise security level (mTLS + hybrid)

Demo helpers

```bash
# Mock certificate JSON → base64 (demo-only helper input)
CERT_JSON='{"subject":"CN=client.tenantA.rdcp.internal","validFrom":"2025-01-01T00:00:00.000Z","validTo":"2099-01-01T00:00:00.000Z","fingerprint256":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}'
CERT_B64=$(printf "%s" "$CERT_JSON" | base64)

# Optional hardening (allow-list CN and fingerprints)
export RDCP_ALLOWED_CERT_SUBJECTS='client.tenantA.rdcp.internal'
export RDCP_TRUSTED_CA_FINGERPRINTS='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
```

Demo commands

```bash
# mTLS only → 200
curl -i \
  -H 'X-RDCP-Auth-Method: mtls' \
  -H 'X-RDCP-Client-ID: client-mtls' \
  -H "X-Client-Cert: $CERT_B64" \
  http://localhost:3000/rdcp/v1/status

# Hybrid with invalid JWT falls back to cert-only → 200
TOKEN_BAD=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'client.tenantA.rdcp.internal' }, 'wrong-secret', { algorithm:'HS256', expiresIn:'5m' }))")
curl -i \
  -H 'X-RDCP-Auth-Method: mtls' \
  -H 'X-RDCP-Client-ID: client-hybrid' \
  -H "X-Client-Cert: $CERT_B64" \
  -H "Authorization: Bearer $TOKEN_BAD" \
  http://localhost:3000/rdcp/v1/status

# Hybrid subject mismatch (JWT sub must equal cert CN) → 401
export JWT_SECRET='change-in-production'
TOKEN_SUB_MISMATCH=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'different.cn.example' }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
curl -i \
  -H 'X-RDCP-Auth-Method: mtls' \
  -H 'X-RDCP-Client-ID: client-hybrid' \
  -H "X-Client-Cert: $CERT_B64" \
  -H "Authorization: Bearer $TOKEN_SUB_MISMATCH" \
  http://localhost:3000/rdcp/v1/status
```

---

## Tenant Isolation with RBAC (Bearer-only for tenant routes)

Assumptions:
- Tenant: tenant-A

```bash
export JWT_SECRET='change-in-production'
TOKEN_READ_A=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'reader@example.com', scopes: ['read:tenant-A'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
TOKEN_CONTROL_A=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'ops@example.com', scopes: ['control:tenant-A'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
TOKEN_CONTROL_GLOBAL=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'ops@example.com', scopes: ['control'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
```

Demo commands

```bash
# GET settings for tenant-A with read:tenant-A → 200
curl -s \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H "Authorization: Bearer $TOKEN_READ_A" \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/settings | jq

# GET settings with read of a different tenant → 403
TOKEN_READ_B=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'reader@example.com', scopes: ['read:tenant-B'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
curl -i \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H "Authorization: Bearer $TOKEN_READ_B" \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/settings

# POST control requires control scope (tenant or global)
# Global control → 200
curl -i \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H "Authorization: Bearer $TOKEN_CONTROL_GLOBAL" \
  -H 'Content-Type: application/json' \
  -d '{"action":"enable","categories":["API_ROUTES"]}' \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/control

# Tenant-specific control → 200
curl -i \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H "Authorization: Bearer $TOKEN_CONTROL_A" \
  -H 'Content-Type: application/json' \
  -d '{"action":"enable","categories":["API_ROUTES"]}' \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/control

# Non-bearer auth for tenant route → 401
curl -i \
  -H 'X-RDCP-Auth-Method: api-key' \
  -H 'X-RDCP-Client-ID: demo-client' \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/settings
```

---

## Temporary Controls (TTL)

Enable categories temporarily with automatic expiry. Duration supports `ms`, `s`, `m`.

```bash
export JWT_SECRET='change-in-production'
TOKEN_CTRL_A=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'ops@example.com', scopes: ['control','control:tenant-A','read','read:tenant-A'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")

# Enable CACHE for 150ms → immediate presence, then auto-removal
curl -s \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: ttl1-$(date +%s%3N)' \
  -H "Authorization: Bearer $TOKEN_CTRL_A" \
  -H 'Content-Type: application/json' \
  -d '{"action":"enable","categories":["CACHE"],"options":{"temporary":true,"duration":"150ms"}}' \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/control | jq

# Check present now → contains 'CACHE'
curl -s \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: ttl2-$(date +%s%3N)' \
  -H "Authorization: Bearer $TOKEN_CTRL_A" \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/settings | jq '.settings.categories'

# Wait >150ms and check again → 'CACHE' removed
sleep 0.25
curl -s \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: ttl3-$(date +%s%3N)' \
  -H "Authorization: Bearer $TOKEN_CTRL_A" \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/settings | jq '.settings.categories'

# Disable cancels pending TTL for a category
curl -s \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: ttl4-$(date +%s%3N)' \
  -H "Authorization: Bearer $TOKEN_CTRL_A" \
  -H 'Content-Type: application/json' \
  -d '{"action":"enable","categories":["API_ROUTES"],"options":{"temporary":true,"duration":"500ms"}}' \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/control >/dev/null
curl -s \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: ttl5-$(date +%s%3N)' \
  -H "Authorization: Bearer $TOKEN_CTRL_A" \
  -H 'Content-Type: application/json' \
  -d '{"action":"disable","categories":["API_ROUTES"]}' \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/control | jq
```

---

## Control Endpoint: Rate Limiting and Audit Trail

- Demo app rate-limits POST /rdcp/v1/control (and tenant control) with default window and max
- Exceeding limit returns 429 RDCP_RATE_LIMITED

Tips
- Use unique X-RDCP-Client-ID per request to avoid hitting your own recent window from earlier commands
- Or increase capacity during demos: `export RATE_LIMIT_CONTROL_MAX=10`

Demo commands

```bash
export RDCP_API_KEY='dev-key-change-in-production-min-32-chars'

# Send 4 control requests quickly (default max=3) → last one returns 429
for i in 1 2 3 4; do \
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H 'X-RDCP-Auth-Method: api-key' \
    -H "X-RDCP-Client-ID: rate-test-$(date +%s%3N)-$i" \
    -H "Authorization: Bearer $RDCP_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"action":"enable","categories":["API_ROUTES"]}' \
    http://localhost:3000/rdcp/v1/control; \
  done
```

Expected: the last printed status code is 429, and server logs include RDCP_AUDIT entries.

---

## Protocol Endpoints & Metrics

```bash
# Protocol discovery
curl -s http://localhost:3000/.well-known/rdcp | jq
curl -s http://localhost:3000/rdcp/v1/discovery | jq

# Health
curl -s http://localhost:3000/rdcp/v1/health | jq

# Metrics (Prometheus exposition)
curl -s http://localhost:3000/metrics | head -n 30
```

---

## Capabilities (from passing tests)

Authentication & Security
- Multi-tier: API keys, JWT with scopes, mTLS with certificate validation
- Hybrid authentication with proper fallback handling (debug logs by default; warnings opt-in)
- Certificate subject and CA fingerprint validation
- Constant-time comparisons for API key security

Enterprise Features
- Tenant isolation with RBAC (bearer-only for tenant routes)
- Audit trail with structured RDCP_AUDIT entries
- Rate limiting (demo middleware) with proper 429 responses
- Temporary controls (TTL) with automatic cleanup

Framework Integration
- Express, Fastify, Koa adapters (all tests passing)
- TypeScript support with strict typing (no any types)
- OpenTelemetry integration for trace correlation

Operational Capabilities
- Runtime debug category control without redeploys
- Performance/metrics exposure (Prometheus)
- Protocol-compliant discovery/status/health endpoints
- Standardized error handling format

---

## Notes
- All commands above are demo-focused and mirror the e2e tests; tailor headers/tokens for your environment
- Use environment variables for secrets in demos; do not paste credentials inline