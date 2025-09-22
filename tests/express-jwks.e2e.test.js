const express = require('express')
const request = require('supertest')
const { adapters } = require('..')

// minimal authenticator that always fails; JWKS should not hit auth
const denyAuth = () => false

describe('Express adapter - JWKS endpoint (scaffold)', () => {
  it('GET /.well-known/jwks.json returns empty keys with Cache-Control and ETag when enabled', async () => {
    const app = express()
    const mw = adapters.express.createRDCPMiddleware({
      authenticator: denyAuth,
      capabilities: {
        security: {
          tokenLifecycle: {
            enabled: true,
            jwks: { enabled: true, maxAgeSeconds: 123 },
          },
        },
      },
    })
    app.use(mw)

    const res = await request(app).get('/.well-known/jwks.json')
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toContain('max-age=123')
    expect(typeof res.headers['etag']).toBe('string')
    expect(res.body).toBeDefined()
    expect(Array.isArray(res.body.keys)).toBe(true)
    expect(res.body.keys.length).toBe(0)

    // Conditional GET should return 304 when If-None-Match matches
    const res2 = await request(app)
      .get('/.well-known/jwks.json')
      .set('If-None-Match', res.headers['etag'])
    expect(res2.status).toBe(304)
  })
})
