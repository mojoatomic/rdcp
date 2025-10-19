const request = require('supertest')
const jwt = require('jsonwebtoken')
const { app } = require('../packages/rdcp-demo-app/src/app.js')
const { withTags } = require('./conformance/tags.ts')

function headers(method, clientId, extra = {}) {
  return {
    'X-RDCP-Auth-Method': method,
    'X-RDCP-Client-ID': clientId,
    ...extra,
  }
}

withTags(['basic', 'standard', 'control', 'put'], () => {
  describe('RDCP Demo App - PUT control (modern format)', () => {
    test('PUT /rdcp/v1/control with {key,value} works with api-key', async () => {
      const clientId = `put-modern-${Date.now()}`
      const apiKey = 'dev-key-change-in-production-min-32-chars'
      const res = await request(app)
        .put('/rdcp/v1/control')
        .set(headers('api-key', clientId, { 'X-API-Key': apiKey }))
        .send({ key: 'DATABASE', value: true })
      expect(res.status).toBe(200)
      expect(res.body).toBeTruthy()
      expect(res.body.protocol).toBe('rdcp/1.0')
    })

    test('PUT /rdcp/v1/control requires bearer control scope', async () => {
      process.env.JWT_ISSUER = ''
      process.env.JWT_AUDIENCE = ''
      const secret = process.env.JWT_SECRET || 'change-in-production'
      const tokenNoScope = jwt.sign(
        { sub: 'user@example.com', scopes: ['discovery', 'status'] },
        secret,
        { algorithm: 'HS256', expiresIn: '5m' }
      )
      const resForbidden = await request(app)
        .put('/rdcp/v1/control')
        .set(
          headers('bearer', `put-bearer-${Date.now()}`, {
            Authorization: `Bearer ${tokenNoScope}`,
          })
        )
        .send({ key: 'API_ROUTES', value: true })
      expect(resForbidden.status).toBe(403)

      const tokenOk = jwt.sign(
        { sub: 'user@example.com', scopes: ['discovery', 'status', 'control'] },
        secret,
        { algorithm: 'HS256', expiresIn: '5m' }
      )
      const resOk = await request(app)
        .put('/rdcp/v1/control')
        .set(
          headers('bearer', `put-bearer-ok-${Date.now()}`, {
            Authorization: `Bearer ${tokenOk}`,
          })
        )
        .send({ key: 'API_ROUTES', value: true })
      expect(resOk.status).toBe(200)
    })
  })
})
