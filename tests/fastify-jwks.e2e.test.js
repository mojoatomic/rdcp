const fastify = require('fastify')
const request = require('supertest')
const { adapters } = require('..')

const denyAuth = () => false

describe('Fastify adapter - JWKS endpoint', () => {
  it('GET /.well-known/jwks.json returns Cache-Control and ETag; 304 on If-None-Match', async () => {
    const app = fastify()
    const mw = adapters.fastify.createRDCPMiddleware({
      authenticator: denyAuth,
      capabilities: {
        security: {
          tokenLifecycle: {
            enabled: true,
            jwks: { enabled: true, maxAgeSeconds: 60 },
          },
        },
      },
    })

    // Register explicit route and delegate to RDCP middleware
    app.get('/.well-known/jwks.json', async (req, reply) => {
      await mw(req, reply)
    })

    await app.ready()

    const server = app.server

    const res = await request(server).get('/.well-known/jwks.json')
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toContain('max-age=60')
    expect(typeof res.headers['etag']).toBe('string')

    const res2 = await request(server)
      .get('/.well-known/jwks.json')
      .set('If-None-Match', res.headers['etag'])
    expect(res2.status).toBe(304)

    await app.close()
  })
})
