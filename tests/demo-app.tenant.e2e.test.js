const request = require('supertest')
const jwt = require('jsonwebtoken')

const { app } = require('../packages/rdcp-demo-app/src/app.js')

function bearer(token) {
  return `Bearer ${token}`
}

function clientId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

describe('RDCP Demo App - Tenant-scoped RBAC', () => {
  const secret = process.env.JWT_SECRET || 'change-in-production'

  beforeAll(() => {
    // Relax rate limit for tenant control tests to avoid flakiness
    process.env.RATE_LIMIT_CONTROL_MAX = '10'
    process.env.JWT_ISSUER = ''
    process.env.JWT_AUDIENCE = ''
  })

  describe('GET /rdcp/v1/tenants/:tenantId/settings (read scope)', () => {
    test('succeeds with global read scope', async () => {
      const token = jwt.sign({ sub: 'reader@example.com', scopes: ['read'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
      const res = await request(app)
        .get('/rdcp/v1/tenants/tenant-A/settings')
        .set('X-RDCP-Auth-Method', 'bearer')
        .set('X-RDCP-Client-ID', clientId('tenant-read-G'))
        .set('Authorization', bearer(token))
      expect(res.status).toBe(200)
      expect(res.body).toBeTruthy()
      expect(res.body.protocol).toBe('rdcp/1.0')
      expect(res.body.tenantId).toBe('tenant-A')
      expect(res.body.tenant).toBeTruthy()
      expect(res.body.tenant.id).toBe('tenant-A')
      expect(['global','tenant-isolated']).toContain(res.body.tenant.scope)
    })

    test('succeeds with tenant-specific read:<tenantId> scope', async () => {
      const token = jwt.sign({ sub: 'reader@example.com', scopes: ['read:tenant-A'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
      const res = await request(app)
        .get('/rdcp/v1/tenants/tenant-A/settings')
        .set('X-RDCP-Auth-Method', 'bearer')
        .set('X-RDCP-Client-ID', clientId('tenant-read-A'))
        .set('Authorization', bearer(token))
      expect(res.status).toBe(200)
    })

    test('denies access when token has read:<other-tenant>', async () => {
      const token = jwt.sign({ sub: 'reader@example.com', scopes: ['read:tenant-B'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
      const res = await request(app)
        .get('/rdcp/v1/tenants/tenant-A/settings')
        .set('X-RDCP-Auth-Method', 'bearer')
        .set('X-RDCP-Client-ID', clientId('tenant-read-B'))
        .set('Authorization', bearer(token))
      expect(res.status).toBe(403)
      expect(res.body?.error?.code).toBe('RDCP_FORBIDDEN')
    })

    test('rejects non-bearer auth for tenant route', async () => {
      const res = await request(app)
        .get('/rdcp/v1/tenants/tenant-A/settings')
        .set('X-RDCP-Auth-Method', 'api-key')
        .set('X-RDCP-Client-ID', clientId('tenant-read-NB'))
      expect([401,403]).toContain(res.status)
    })
  })

  describe('POST /rdcp/v1/tenants/:tenantId/control (control scope)', () => {
    test('succeeds with global control scope', async () => {
      const token = jwt.sign({ sub: 'ops@example.com', scopes: ['control'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
      const res = await request(app)
        .post('/rdcp/v1/tenants/tenant-A/control')
        .set('X-RDCP-Auth-Method', 'bearer')
        .set('X-RDCP-Client-ID', clientId('tenant-ctrl-G'))
        .set('Authorization', bearer(token))
        .send({ action: 'enable', categories: ['API_ROUTES'] })
      expect(res.status).toBe(200)
      expect(res.body?.success).toBe(true)
    })

    test('succeeds with tenant-specific control:<tenantId> scope', async () => {
      const token = jwt.sign({ sub: 'ops@example.com', scopes: ['control:tenant-A'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
      const res = await request(app)
        .post('/rdcp/v1/tenants/tenant-A/control')
        .set('X-RDCP-Auth-Method', 'bearer')
        .set('X-RDCP-Client-ID', clientId('tenant-ctrl-A'))
        .set('Authorization', bearer(token))
        .send({ action: 'enable', categories: ['CACHE'] })
      expect(res.status).toBe(200)
    })

    test('denies with control:<other-tenant> scope', async () => {
      const token = jwt.sign({ sub: 'ops@example.com', scopes: ['control:tenant-B'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
      const res = await request(app)
        .post('/rdcp/v1/tenants/tenant-A/control')
        .set('X-RDCP-Auth-Method', 'bearer')
        .set('X-RDCP-Client-ID', clientId('tenant-ctrl-B'))
        .set('Authorization', bearer(token))
        .send({ action: 'enable', categories: ['API_ROUTES'] })
      expect(res.status).toBe(403)
      expect(res.body?.error?.code).toBe('RDCP_FORBIDDEN')
    })

    test('rejects non-bearer auth for tenant control route', async () => {
      const res = await request(app)
        .post('/rdcp/v1/tenants/tenant-A/control')
        .set('X-RDCP-Auth-Method', 'api-key')
        .set('X-RDCP-Client-ID', clientId('tenant-ctrl-NB'))
        .send({ action: 'enable', categories: ['API_ROUTES'] })
      expect([401,403]).toContain(res.status)
    })
  })
})