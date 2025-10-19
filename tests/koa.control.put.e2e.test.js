const Koa = require('koa')
const request = require('supertest')
const { adapters } = require('..')

const { withTags } = require('./conformance/tags.ts')
const bodyParser = require('koa-bodyparser')

withTags(['standard', 'control', 'put', 'api-key'], () => {
  describe('Koa adapter - PUT /rdcp/v1/control (modern format)', () => {
    function headers(clientId) {
      return {
        'X-RDCP-Auth-Method': 'api-key',
        'X-RDCP-Client-ID': clientId,
        'X-API-Key': 'dev-key-change-in-production-min-32-chars',
      }
    }

    test('accepts PUT {key,value} and returns rdcp/1.0 response', async () => {
      const app = new Koa()
      const mw = adapters.koa.createRDCPMiddleware({
        authenticator: () => true,
      })

      app.use(bodyParser())
      app.use(async (ctx, next) => {
        if (ctx.path === '/rdcp/v1/control' && ctx.method === 'PUT') {
          await mw(ctx, next)
        } else {
          await next()
        }
      })

      const server = app.callback()

      const res = await request(server)
        .put('/rdcp/v1/control')
        .set(headers(`koa-put-${Date.now()}`))
        .send({ key: 'DATABASE', value: true })

      expect(res.status).toBe(200)
      expect(res.body?.protocol).toBe('rdcp/1.0')
    })
  })
})
