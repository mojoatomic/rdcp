const Koa = require('koa')
const request = require('supertest')
const { adapters } = require('..')

const denyAuth = () => false

describe('Koa adapter - JWKS endpoint', () => {
  it('GET /.well-known/jwks.json returns Cache-Control and ETag; 304 on If-None-Match', async () => {
    const app = new Koa()
    const mw = adapters.koa.createRDCPMiddleware({
      authenticator: denyAuth,
      capabilities: {
        security: {
          tokenLifecycle: {
            enabled: true,
            jwks: { enabled: true, maxAgeSeconds: 90 },
          },
        },
      },
    })
    app.use(mw)

    const server = app.callback()

    const res = await request(server).get('/.well-known/jwks.json')
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toContain('max-age=90')
    expect(typeof res.headers['etag']).toBe('string')

    const res2 = await request(server)
      .get('/.well-known/jwks.json')
      .set('If-None-Match', res.headers['etag'])
    expect(res2.status).toBe(304)
  })

  it('includes Last-Modified and Vary when enabled', async () => {
    const app = new Koa()
    const mw = adapters.koa.createRDCPMiddleware({
      authenticator: denyAuth,
      capabilities: {
        security: {
          tokenLifecycle: {
            enabled: true,
            jwks: { enabled: true, maxAgeSeconds: 90, emitLastModified: true, varyHeader: 'Accept' },
          },
        },
      },
    })
    app.use(mw)

    const res = await request(app.callback()).get('/.well-known/jwks.json')
    expect(res.status).toBe(200)
    expect(typeof res.headers['last-modified']).toBe('string')
    expect(res.headers['vary']).toBe('Accept')
  })
})
