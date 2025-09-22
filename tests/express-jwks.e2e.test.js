const express = require('express')
const request = require('supertest')
const { adapters } = require('..')

// minimal authenticator that always fails; JWKS should not hit auth
const denyAuth = () => false

describe('Express adapter - JWKS endpoint (scaffold)', () => {
  it('GET /.well-known/jwks.json returns empty keys and Cache-Control when enabled', async () => {
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
    expect(res.body).toBeDefined()
    expect(Array.isArray(res.body.keys)).toBe(true)
    expect(res.body.keys.length).toBe(0)
  })
})
