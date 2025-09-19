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
