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

    test('GET /rdcp/v1/status with invalid X-RDCP-Auth-Method returns 401', async () => {
      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'invalid')
        .set('X-RDCP-Client-ID', 'demo-client')
      expect(res.status).toBe(401)
    })

    test('GET /rdcp/v1/status missing X-RDCP-Client-ID returns 401', async () => {
      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'api-key')
      expect(res.status).toBe(401)
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

    test('GET /rdcp/v1/status with short API key returns 401', async () => {
      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'api-key')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('Authorization', 'Bearer short-key')
      expect(res.status).toBe(401)
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

    test('GET /rdcp/v1/status with expired JWT returns 401', async () => {
      const secret = process.env.JWT_SECRET || 'change-in-production'
      const token = jwt.sign(
        { sub: 'user@example.com', scopes: ['discovery', 'status'], exp: Math.floor(Date.now() / 1000) - 10 },
        secret,
        { algorithm: 'HS256' }
      )
      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'bearer')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(401)
    })

    test('GET /rdcp/v1/status with invalid signature returns 401', async () => {
      const token = jwt.sign(
        { sub: 'user@example.com', scopes: ['discovery', 'status'] },
        'wrong-secret',
        { algorithm: 'HS256', expiresIn: '5m' }
      )
      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'bearer')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(401)
    })

    test('GET /rdcp/v1/status validates issuer when JWT_ISSUER is set', async () => {
      const prev = process.env.JWT_ISSUER
      process.env.JWT_ISSUER = 'urn:issuer'
      try {
        const secret = process.env.JWT_SECRET || 'change-in-production'
        const token = jwt.sign(
          { sub: 'user@example.com', scopes: ['discovery', 'status'], iss: 'urn:issuer' },
          secret,
          { algorithm: 'HS256', expiresIn: '5m' }
        )
        const res = await request(app)
          .get('/rdcp/v1/status')
          .set('X-RDCP-Auth-Method', 'bearer')
          .set('X-RDCP-Client-ID', 'demo-client')
          .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
      } finally {
        process.env.JWT_ISSUER = prev
      }
    })

    test('GET /rdcp/v1/status with wrong issuer returns 401 when JWT_ISSUER is set', async () => {
      const prev = process.env.JWT_ISSUER
      process.env.JWT_ISSUER = 'urn:issuer'
      try {
        const secret = process.env.JWT_SECRET || 'change-in-production'
        const token = jwt.sign(
          { sub: 'user@example.com', scopes: ['discovery', 'status'], iss: 'wrong-issuer' },
          secret,
          { algorithm: 'HS256', expiresIn: '5m' }
        )
        const res = await request(app)
          .get('/rdcp/v1/status')
          .set('X-RDCP-Auth-Method', 'bearer')
          .set('X-RDCP-Client-ID', 'demo-client')
          .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(401)
      } finally {
        process.env.JWT_ISSUER = prev
      }
    })

    test('GET /rdcp/v1/status validates audience when JWT_AUDIENCE is set', async () => {
      const prevAud = process.env.JWT_AUDIENCE
      const prevIss = process.env.JWT_ISSUER
      process.env.JWT_AUDIENCE = 'urn:foo'
      process.env.JWT_ISSUER = ''
      try {
        const secret = process.env.JWT_SECRET || 'change-in-production'
        const token = jwt.sign(
          { sub: 'user@example.com', scopes: ['discovery', 'status'], aud: 'urn:foo' },
          secret,
          { algorithm: 'HS256', expiresIn: '5m' }
        )
        const res = await request(app)
          .get('/rdcp/v1/status')
          .set('X-RDCP-Auth-Method', 'bearer')
          .set('X-RDCP-Client-ID', 'demo-client')
          .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
      } finally {
        process.env.JWT_AUDIENCE = prevAud
        process.env.JWT_ISSUER = prevIss
      }
    })

    test('GET /rdcp/v1/status with wrong audience returns 401 when JWT_AUDIENCE is set', async () => {
      const prev = process.env.JWT_AUDIENCE
      process.env.JWT_AUDIENCE = 'urn:foo'
      try {
        const secret = process.env.JWT_SECRET || 'change-in-production'
        const token = jwt.sign(
          { sub: 'user@example.com', scopes: ['discovery', 'status'], aud: 'urn:bar' },
          secret,
          { algorithm: 'HS256', expiresIn: '5m' }
        )
        const res = await request(app)
          .get('/rdcp/v1/status')
          .set('X-RDCP-Auth-Method', 'bearer')
          .set('X-RDCP-Client-ID', 'demo-client')
          .set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(401)
      } finally {
        process.env.JWT_AUDIENCE = prev
      }
    })
  })

  describe('Enterprise security level (mTLS + optional token)', () => {
    const goodFingerprint = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

    function makeCert(subjectCN, opts = {}) {
      return {
        subject: `CN=${subjectCN},O=Test,L=Test,C=US`,
        validFrom: new Date(Date.now() - 60 * 1000).toISOString(),
        validTo: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        keyUsage: ['digitalSignature'],
        fingerprint256: goodFingerprint,
        ...opts,
      }
    }

    test('GET /rdcp/v1/status succeeds with mock mTLS cert header', async () => {
      const mockCert = makeCert('client.tenant123.rdcp.internal')
      const base64 = Buffer.from(JSON.stringify(mockCert)).toString('base64')

      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'mtls')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('X-Client-Cert', base64)

      expect(res.status).toBe(200)
      expect(res.body.protocol).toBe('rdcp/1.0')
    })

    test('enforces RDCP_ALLOWED_CERT_SUBJECTS allow-list', async () => {
      const prev = process.env.RDCP_ALLOWED_CERT_SUBJECTS
      process.env.RDCP_ALLOWED_CERT_SUBJECTS = 'client.tenant123.rdcp.internal'
      try {
        const okCert = makeCert('client.tenant123.rdcp.internal')
        const okBase64 = Buffer.from(JSON.stringify(okCert)).toString('base64')
        const okRes = await request(app)
          .get('/rdcp/v1/status')
          .set('X-RDCP-Auth-Method', 'mtls')
          .set('X-RDCP-Client-ID', 'demo-client')
          .set('X-Client-Cert', okBase64)
        expect(okRes.status).toBe(200)

        const badCert = makeCert('client.tenant999.rdcp.internal')
        const badBase64 = Buffer.from(JSON.stringify(badCert)).toString('base64')
        const badRes = await request(app)
          .get('/rdcp/v1/status')
          .set('X-RDCP-Auth-Method', 'mtls')
          .set('X-RDCP-Client-ID', 'demo-client')
          .set('X-Client-Cert', badBase64)
        expect(badRes.status).toBe(401)
      } finally {
        process.env.RDCP_ALLOWED_CERT_SUBJECTS = prev
      }
    })

    test('enforces RDCP_TRUSTED_CA_FINGERPRINTS (demo uses leaf fingerprint)', async () => {
      const prev = process.env.RDCP_TRUSTED_CA_FINGERPRINTS
      try {
        const okCert = makeCert('client.tenant123.rdcp.internal')
        const okBase64 = Buffer.from(JSON.stringify(okCert)).toString('base64')

        // Set a non-matching fingerprint -> should reject
        process.env.RDCP_TRUSTED_CA_FINGERPRINTS = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
        const badRes = await request(app)
          .get('/rdcp/v1/status')
          .set('X-RDCP-Auth-Method', 'mtls')
          .set('X-RDCP-Client-ID', 'demo-client')
          .set('X-Client-Cert', okBase64)
        expect(badRes.status).toBe(401)
      } finally {
        process.env.RDCP_TRUSTED_CA_FINGERPRINTS = prev
      }
    })

    test('GET /rdcp/v1/status with invalid CN pattern returns 401', async () => {
      const badCert = makeCert('client.bad.rdcp.internal')
      const base64 = Buffer.from(JSON.stringify(badCert)).toString('base64')
      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'mtls')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('X-Client-Cert', base64)
      expect(res.status).toBe(401)
    })

    test('GET /rdcp/v1/status with expired certificate returns 401', async () => {
      const expiredCert = makeCert('client.tenant123.rdcp.internal', {
        validFrom: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        validTo: new Date(Date.now() - 60 * 1000).toISOString(),
      })
      const base64 = Buffer.from(JSON.stringify(expiredCert)).toString('base64')
      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'mtls')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('X-Client-Cert', base64)
      expect(res.status).toBe(401)
    })

    test('Hybrid (mTLS + JWT) subject must match CN; mismatches are rejected', async () => {
      // Ensure no extra enforcement interferes
      process.env.RDCP_TRUSTED_CA_FINGERPRINTS = ''
      process.env.RDCP_ALLOWED_CERT_SUBJECTS = ''

      const secret = process.env.JWT_SECRET || 'change-in-production'
      const cn = 'client.tenant123.rdcp.internal'
      const cert = makeCert(cn)
      const base64 = Buffer.from(JSON.stringify(cert)).toString('base64')

      // Matching subject
      const tokenOk = jwt.sign({ sub: cn, scopes: ['discovery','status','control'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
      const resOk = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'mtls')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('X-Client-Cert', base64)
        .set('Authorization', `Bearer ${tokenOk}`)
      expect(resOk.status).toBe(200)

      // Mismatched subject -> reject
      const tokenBad = jwt.sign({ sub: 'other.subject', scopes: ['discovery','status'] }, secret, { algorithm: 'HS256', expiresIn: '5m' })
      const resBad = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'mtls')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('X-Client-Cert', base64)
        .set('Authorization', `Bearer ${tokenBad}`)
      expect(resBad.status).toBe(401)
    })

    test('Hybrid (mTLS + JWT) with invalid JWT falls back to cert-only and still succeeds', async () => {
      // Ensure no extra enforcement interferes
      process.env.RDCP_TRUSTED_CA_FINGERPRINTS = ''
      process.env.RDCP_ALLOWED_CERT_SUBJECTS = ''

      const cn = 'client.tenant123.rdcp.internal'
      const cert = makeCert(cn)
      const base64 = Buffer.from(JSON.stringify(cert)).toString('base64')

      const invalidToken = jwt.sign({ sub: cn, scopes: ['discovery','status'] }, 'wrong-secret', { algorithm: 'HS256', expiresIn: '5m' })
      const res = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Auth-Method', 'mtls')
        .set('X-RDCP-Client-ID', 'demo-client')
        .set('X-Client-Cert', base64)
        .set('Authorization', `Bearer ${invalidToken}`)
      expect(res.status).toBe(200)
    })
  })
})
