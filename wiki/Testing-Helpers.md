# RDCP Testing Helpers and Patterns

This guide provides practical patterns to write tests against RDCP endpoints for all security levels, including tenant-aware RBAC and enterprise mTLS behaviors.

JWT helpers (standard security level)
- Build tokens with global and tenant-scoped permissions
```js
const jwt = require('jsonwebtoken')
const secret = process.env.JWT_SECRET || 'change-in-production'

// Global read/control
const tokenRead = jwt.sign({ sub: 'reader@example.com', scopes: ['read'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
const tokenControl = jwt.sign({ sub: 'ops@example.com', scopes: ['control'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })

// Tenant-scoped read/control
const tokenReadA = jwt.sign({ sub: 'reader@example.com', scopes: ['read:tenant-A'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
const tokenControlA = jwt.sign({ sub: 'ops@example.com', scopes: ['control:tenant-A'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
```

Tenant-aware request patterns
- Header-scoped global control route
```js
await request(app)
  .post('/rdcp/v1/control')
  .set('X-RDCP-Auth-Method', 'bearer')
  .set('X-RDCP-Client-ID', 'client-1')
  .set('X-RDCP-Tenant-ID', 'tenant-A') // tenant context for global route
  .set('Authorization', `Bearer ${tokenControlA}`)
  .send({ action: 'enable', categories: ['API_ROUTES'] })
```

- Path-scoped tenant routes (bearer-only)
```js
// GET settings (requires read or read:<tenantId>)
await request(app)
  .get('/rdcp/v1/tenants/tenant-A/settings')
  .set('X-RDCP-Auth-Method', 'bearer')
  .set('X-RDCP-Client-ID', 'client-2')
  .set('Authorization', `Bearer ${tokenReadA}`)

// POST control (requires control or control:<tenantId>)
await request(app)
  .post('/rdcp/v1/tenants/tenant-A/control')
  .set('X-RDCP-Auth-Method', 'bearer')
  .set('X-RDCP-Client-ID', 'client-3')
  .set('Authorization', `Bearer ${tokenControlA}`)
  .send({ action: 'enable', categories: ['CACHE'] })
```

Enterprise mTLS testing
- Simulate client cert via base64 header
```js
function mockCert(subjectCN, opts = {}) {
  return {
    subject: `CN=${subjectCN},O=Test,L=Test,C=US`,
    validFrom: new Date(Date.now() - 60 * 1000).toISOString(),
    validTo: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    keyUsage: ['digitalSignature'],
    fingerprint256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ...opts,
  }
}

const cert = mockCert('client.tenant123.rdcp.internal')
const base64 = Buffer.from(JSON.stringify(cert)).toString('base64')

await request(app)
  .get('/rdcp/v1/status')
  .set('X-RDCP-Auth-Method', 'mtls')
  .set('X-RDCP-Client-ID', 'client-mtls')
  .set('X-Client-Cert', base64)
```

- Hardening via environment variables
```bash
# Restrict allowed subjects
export RDCP_ALLOWED_CERT_SUBJECTS='client.tenant123.rdcp.internal,client.partner.rdcp.internal'

# Restrict trusted CA/leaf fingerprints (demo uses leaf)
export RDCP_TRUSTED_CA_FINGERPRINTS='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
```

Hybrid mode assertions (mTLS + JWT)
- Subject (JWT sub) must match certificate CN
```js
const cn = 'client.tenant123.rdcp.internal'
const token = jwt.sign({ sub: cn, scopes: ['discovery','status'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })

await request(app)
  .get('/rdcp/v1/status')
  .set('X-RDCP-Auth-Method', 'mtls')
  .set('X-RDCP-Client-ID', 'client-hybrid')
  .set('X-Client-Cert', base64)
  .set('Authorization', `Bearer ${token}`)
  .expect(200)
```

- Invalid JWT falls back to cert-only (intentional)
```js
const badToken = jwt.sign({ sub: cn }, 'wrong-secret', { algorithm: 'HS256', expiresIn: '5m' })
const res = await request(app)
  .get('/rdcp/v1/status')
  .set('X-RDCP-Auth-Method', 'mtls')
  .set('X-RDCP-Client-ID', 'client-hybrid2')
  .set('X-Client-Cert', base64)
  .set('Authorization', `Bearer ${badToken}`)
expect(res.status).toBe(200)
```

Tenant response object (multi-tenancy)
- When multi-tenant headers are present or when using tenant routes, responses include a tenant object.
```json
{
  "protocol": "rdcp/1.0",
  "tenant": {
    "id": "tenant-A",
    "isolationLevel": "organization",
    "scope": "tenant-isolated"
  }
}
```

Curl examples
```bash
# Global endpoint with tenant headers
curl -s \
  -H 'X-RDCP-Auth-Method: api-key' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H 'X-RDCP-Tenant-ID: tenant-A' \
  -H 'X-RDCP-Isolation-Level: organization' \
  -H 'Authorization: Bearer dev-key-change-in-production-min-32-chars' \
  http://localhost:3000/rdcp/v1/status | jq '.tenant'

# Tenant-scoped settings
TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({ sub: 'reader@example.com', scopes:['read:tenant-A'] }, 'change-in-production', { algorithm:'HS256', expiresIn:'5m' }))")
curl -s \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/settings | jq '.tenant'
```

Temporary controls (TTL)
- Enable categories temporarily by setting options.temporary=true and options.duration to a duration string or milliseconds.
- Duration supports suffixes: ms, s, m (e.g., '150ms', '2s', '1m').
- The demo will automatically disable the category after the TTL expires.

Supertest examples
```js
// Enable a category with TTL (expires)
await request(app)
  .post('/rdcp/v1/tenants/tenant-A/control')
  .set({ 'X-RDCP-Auth-Method':'bearer','X-RDCP-Client-ID':'ttl-1','Authorization':`Bearer ${token}` })
  .send({ action:'enable', categories:['CACHE'], options:{ temporary:true, duration:'150ms' } })
  .expect(200)

// Immediately present
let res = await request(app)
  .get('/rdcp/v1/tenants/tenant-A/settings')
  .set({ 'X-RDCP-Auth-Method':'bearer','X-RDCP-Client-ID':'ttl-2','Authorization':`Bearer ${token}` })
expect(res.body?.settings?.categories || []).toContain('CACHE')

// After TTL, removed
await new Promise(r => setTimeout(r, 220))
res = await request(app)
  .get('/rdcp/v1/tenants/tenant-A/settings')
  .set({ 'X-RDCP-Auth-Method':'bearer','X-RDCP-Client-ID':'ttl-3','Authorization':`Bearer ${token}` })
expect(res.body?.settings?.categories || []).not.toContain('CACHE')

// Disabling cancels pending TTL
await request(app)
  .post('/rdcp/v1/tenants/tenant-A/control')
  .set({ 'X-RDCP-Auth-Method':'bearer','X-RDCP-Client-ID':'ttl-4','Authorization':`Bearer ${token}` })
  .send({ action:'enable', categories:['API_ROUTES'], options:{ temporary:true, duration:'500ms' } })
  .expect(200)
await request(app)
  .post('/rdcp/v1/tenants/tenant-A/control')
  .set({ 'X-RDCP-Auth-Method':'bearer','X-RDCP-Client-ID':'ttl-5','Authorization':`Bearer ${token}` })
  .send({ action:'disable', categories:['API_ROUTES'] })
  .expect(200)
```

Curl example
```bash
export JWT_SECRET='change-in-production'
TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({ sub:'ops@example.com', scopes:['control','control:tenant-A'] }, process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'5m' }))")
curl -s \
  -H 'X-RDCP-Auth-Method: bearer' \
  -H 'X-RDCP-Client-ID: demo-client' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"action":"enable","categories":["CACHE"],"options":{"temporary":true,"duration":"2s"}}' \
  http://localhost:3000/rdcp/v1/tenants/tenant-A/control | jq
```

Rate-limit flake avoidance (demo app)
- The demo control endpoint has a simple in-memory rate limit.
  - Increase capacity in tests: RATE_LIMIT_CONTROL_MAX=10
  - Use unique X-RDCP-Client-ID per request

Logging behavior for hybrid fallback
- By default, the fallback logs at debug level only (no warning)
- To warn in development or explicitly:
```bash
export RDCP_WARN_ON_HYBRID_FALLBACK='true'
```

## Cross-adapter consistency (headers)

Verify identical behavior across Express, Fastify, and Koa for X-Request-Id echo and RateLimit draft-7 headers.

```js
const request = require('supertest')
const { createExpressApp, createFastifyApp, createKoaApp } = require('./test-helpers') // pseudo-helpers

describe('Cross-adapter: headers', () => {
  const uuid = '00000000-0000-4000-8000-000000000000'

  test.each([
    ['express', createExpressApp()],
    ['fastify', createFastifyApp()],
    ['koa', createKoaApp()],
  ])('%s echoes X-Request-Id and sets RateLimit headers when enabled', async (_name, app) => {
    // echo supplied request id
    let res = await request(app)
      .get('/rdcp/v1/status')
      .set('X-RDCP-Auth-Method', 'api-key')
      .set('X-RDCP-Client-ID', 'x-adapter')
      .set('X-API-Key', 'dev-key-change-in-production-min-32-chars')
      .set('X-RDCP-Request-ID', uuid)
    expect(res.headers['x-request-id']).toBe(uuid)

    // generated when absent
    res = await request(app)
      .get('/rdcp/v1/status')
      .set('X-RDCP-Auth-Method', 'api-key')
      .set('X-RDCP-Client-ID', 'x-adapter')
      .set('X-API-Key', 'dev-key-change-in-production-min-32-chars')
    expect(res.headers['x-request-id']).toBeTruthy()

    // RateLimit headers on discovery when enabled
    res = await request(app).get('/.well-known/rdcp')
    // Note: enable rateLimit.headers: true in your server config
    expect(res.headers['ratelimit-policy'] || res.headers['x-ratelimit-limit']).toBeTruthy()
  })
})
```
