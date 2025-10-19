const fastify = require('fastify')
const request = require('supertest')
const { adapters } = require('..')

const { withTags } = require('./conformance/tags.ts')

withTags(['standard', 'control', 'put', 'api-key'], () => {
  describe('Fastify adapter - PUT /rdcp/v1/control (modern format)', () => {
    function headers(clientId) {
      return {
        'X-RDCP-Auth-Method': 'api-key',
        'X-RDCP-Client-ID': clientId,
        'X-API-Key': 'dev-key-change-in-production-min-32-chars',
      }
    }

    test('accepts PUT {key,value} and returns rdcp/1.0 response', async () => {
      const app = fastify()
      const mw = adapters.fastify.createRDCPMiddleware({
        authenticator: () => true,
      })

      // Delegate to RDCP middleware for the control route
      app.put('/rdcp/v1/control', async (req, reply) => {
        await mw(req, reply)
      })

      await app.ready()
      const server = app.server

      const res = await request(server)
        .put('/rdcp/v1/control')
        .set(headers(`fastify-put-${Date.now()}`))
        .send({ key: 'DATABASE', value: true })

      expect(res.status).toBe(200)
      expect(res.body?.protocol).toBe('rdcp/1.0')
      await app.close()
    })
  })
})
