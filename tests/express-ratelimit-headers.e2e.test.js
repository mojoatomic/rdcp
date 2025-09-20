const express = require('express')
const request = require('supertest')
const { adapters } = require('..')

// Simple authenticator that always passes for this test
const allowAuth = async () => true

function buildApp() {
  const app = express()
  app.use(express.json())

  app.use(
    adapters.express.createRDCPMiddleware({
      authenticator: allowAuth,
      capabilities: {
        rateLimit: {
          enabled: true,
          headers: true,
          headersMode: 'draft-7',
          defaultRule: { windowMs: 1000, maxRequests: 100 },
          perEndpoint: { discovery: { windowMs: 1000, maxRequests: 5 } },
        },
      },
    })
  )

  return app
}

describe('Express adapter - RateLimit draft-7 headers', () => {
  test('GET /.well-known/rdcp returns RateLimit headers when enabled', async () => {
    const app = buildApp()

    const res = await request(app).get('/.well-known/rdcp')

    expect(res.status).toBe(200)
    // draft-7 headers
    expect(res.headers['ratelimit']).toBeDefined()
    expect(res.headers['ratelimit-policy']).toBeDefined()
  })
})
