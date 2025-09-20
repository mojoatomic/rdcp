const express = require('express')
const Fastify = require('fastify')
let Koa
try {
  // Optional: some environments may not have Koa installed
  Koa = require('koa')
} catch {}
const request = require('supertest')
const { adapters } = require('..')

const validUUID = '123e4567-e89b-12d3-a456-426614174000'
const invalidUUID = 'not-a-uuid'

const allowAuth = async () => true

function buildExpress() {
  const app = express()
  app.use(express.json())
  app.use(adapters.express.createRDCPMiddleware({ authenticator: allowAuth }))
  return app
}

async function buildFastify() {
  const fastify = Fastify()
  const plugin = adapters.fastify.createRDCPPlugin({ authenticator: allowAuth })
  await fastify.register(plugin)
  return fastify
}

function buildKoa() {
  if (!Koa) return null
  const app = new Koa()
  const koaMw = adapters.koa.createRDCPMiddleware({ authenticator: allowAuth })
  app.use(koaMw)
  return app
}

describe('Cross-adapter: RateLimit headers and Request-Id echo/validation', () => {
  test('Express: echoes supplied UUID as X-Request-Id and generates one when absent', async () => {
    const app = buildExpress()
    const res1 = await request(app).get('/.well-known/rdcp').set('X-RDCP-Request-ID', validUUID)
    expect(res1.status).toBe(200)
    expect(res1.headers['x-request-id']).toBe(validUUID)

    const res2 = await request(app).get('/.well-known/rdcp')
    expect(res2.status).toBe(200)
    expect(res2.headers['x-request-id']).toBeDefined()
  })

  test('Fastify: echoes supplied UUID as X-Request-Id and generates one when absent', async () => {
    const app = await buildFastify()
    const res1 = await app.inject({ method: 'GET', url: '/.well-known/rdcp', headers: { 'X-RDCP-Request-ID': validUUID } })
    expect(res1.statusCode).toBe(200)
    expect(res1.headers['x-request-id']).toBe(validUUID)

    const res2 = await app.inject({ method: 'GET', url: '/.well-known/rdcp' })
    expect(res2.statusCode).toBe(200)
    expect(res2.headers['x-request-id']).toBeDefined()
  })

  test('Koa: echoes supplied UUID as X-Request-Id and generates one when absent', async () => {
    if (!Koa) return
    const app = buildKoa()
    const server = app.callback()
    const res1 = await request(server).get('/.well-known/rdcp').set('X-RDCP-Request-ID', validUUID)
    expect(res1.status).toBe(200)
    expect(res1.headers['x-request-id']).toBe(validUUID)

    const res2 = await request(server).get('/.well-known/rdcp')
    expect(res2.status).toBe(200)
    expect(res2.headers['x-request-id']).toBeDefined()
  })

  test('Invalid UUID returns RDCP_REQUEST_ID_INVALID across adapters', async () => {
    const appExp = buildExpress()
    const exp = await request(appExp).get('/.well-known/rdcp').set('X-RDCP-Request-ID', invalidUUID)
    expect(exp.status).toBe(400)
    expect(exp.body?.error?.code).toBe('RDCP_REQUEST_ID_INVALID')

    const appF = await buildFastify()
    const fas = await appF.inject({ method: 'GET', url: '/.well-known/rdcp', headers: { 'X-RDCP-Request-ID': invalidUUID } })
    expect(fas.statusCode).toBe(400)
    expect(JSON.parse(fas.body)?.error?.code).toBe('RDCP_REQUEST_ID_INVALID')

    if (Koa) {
      const appK = buildKoa()
      const srv = appK.callback()
      const koa = await request(srv).get('/.well-known/rdcp').set('X-RDCP-Request-ID', invalidUUID)
      expect(koa.status).toBe(400)
      expect(koa.body?.error?.code).toBe('RDCP_REQUEST_ID_INVALID')
    }
  })

  test('RateLimit draft-7 headers present on discovery across adapters when enabled', async () => {
    // Express with headers enabled
    const appE = express()
    appE.use(express.json())
    appE.use(
      adapters.express.createRDCPMiddleware({
        authenticator: allowAuth,
        capabilities: { rateLimit: { enabled: true, headers: true, headersMode: 'draft-7', defaultRule: { windowMs: 1000, maxRequests: 100 } } },
      })
    )
    const rE = await request(appE).get('/.well-known/rdcp')
    expect(rE.status).toBe(200)
    expect(rE.headers['ratelimit']).toBeDefined()
    expect(rE.headers['ratelimit-policy']).toBeDefined()

    // Fastify
    const f = Fastify()
    await f.register(
      adapters.fastify.createRDCPPlugin({
        authenticator: allowAuth,
        capabilities: { rateLimit: { enabled: true, headers: true, headersMode: 'draft-7', defaultRule: { windowMs: 1000, maxRequests: 100 } } },
      })
    )
    const rF = await f.inject({ method: 'GET', url: '/.well-known/rdcp' })
    expect(rF.statusCode).toBe(200)
    expect(rF.headers['ratelimit']).toBeDefined()
    expect(rF.headers['ratelimit-policy']).toBeDefined()

    // Koa
    if (Koa) {
      const k = new Koa()
      k.use(
        adapters.koa.createRDCPMiddleware({
          authenticator: allowAuth,
          capabilities: { rateLimit: { enabled: true, headers: true, headersMode: 'draft-7', defaultRule: { windowMs: 1000, maxRequests: 100 } } },
        })
      )
      const rK = await request(k.callback()).get('/.well-known/rdcp')
      expect(rK.status).toBe(200)
      expect(rK.headers['ratelimit']).toBeDefined()
      expect(rK.headers['ratelimit-policy']).toBeDefined()
    }
  })
})
