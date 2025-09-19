const request = require('supertest')
const jwt = require('jsonwebtoken')

// Import the demo app without starting a network listener
const { app } = require('../packages/rdcp-demo-app/src/app.js')

describe('RDCP Demo App - Authentication & security (roadmap)', () => {
  describe('Required headers enforcement', () => {
    test('GET /rdcp/v1/status without RDCP headers returns 401', async () => {
      const res = await request(app).get('/rdcp/v1/status')
      expect(res.status).toBe(401)
      expect(res.body).toBeTruthy()
      expect(res.body.error).toBeTruthy()
      expect(typeof res.body.error.code).toBe('string')
    })
  })

  describe('Basic security level (api-key)', () => {
    test('GET /rdcp/v1/status succeeds with required headers and API key', async () => {
      const apiKey = 'dev-key-change-in-production-min-32-chars'
      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'api-key')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('Authorization', `Bearer ${apiKey}`)

      expect(res.status).toBe(200)
      expect(res.body.protocol).toBe('rdcp/1.0')
    })
  })

  describe('Standard security level (bearer JWT)', () => {
    test('GET /rdcp/v1/status succeeds with valid JWT', async () => {
      const secret = process.env.JWT_SECRET || 'change-in-production'
      const token = jwt.sign(
        { sub: 'user@example.com', scopes: ['discovery', 'status', 'control'] },
        secret,
        { algorithm: 'HS256', expiresIn: '5m' }
      )

      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'bearer')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body.protocol).toBe('rdcp/1.0')
    })
  })

  describe('Enterprise security level (mTLS + optional token)', () => {
    test('GET /rdcp/v1/status succeeds with mock mTLS cert header', async () => {
      const mockCert = {
        subject: 'CN=client.tenant123.rdcp.internal,O=Test,L=Test,C=US',
        validFrom: new Date(Date.now() - 60 * 1000).toISOString(),
        validTo: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        keyUsage: ['digitalSignature'],
        fingerprint256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
      }
      const base64 = Buffer.from(JSON.stringify(mockCert)).toString('base64')

      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'mtls')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('X-Client-Cert', base64)

      expect(res.status).toBe(200)
      expect(res.body.protocol).toBe('rdcp/1.0')
    })
  })
})
