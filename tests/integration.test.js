const request = require('supertest')
const express = require('express')
const { createRDCPMiddleware } = require('../src/rdcp-middleware')
const { withTags } = require('./conformance/tags.ts')

withTags(['integration', 'basic'], () => {
  describe('RDCP Integration Tests', () => {
    let app

    beforeEach(() => {
      app = express()
      app.use(createRDCPMiddleware({ requireAuth: false }))
    })

    test('GET /.well-known/rdcp returns protocol info', async () => {
      const response = await request(app).get('/.well-known/rdcp').expect(200)

      expect(response.body.protocol).toBe('rdcp/1.0')
      expect(response.body.endpoints).toBeDefined()
      expect(response.body.endpoints.discovery).toBe('/rdcp/v1/discovery')
      expect(response.body.endpoints.control).toBe('/rdcp/v1/control')
      expect(response.body.endpoints.status).toBe('/rdcp/v1/status')
      expect(response.body.endpoints.health).toBe('/rdcp/v1/health')
      expect(response.body.capabilities).toBeDefined()
      expect(response.body.security).toBeDefined()
      expect(response.body.security.level).toBe('basic')
    })

    test('GET /rdcp/v1/discovery returns categories', async () => {
      const response = await request(app).get('/rdcp/v1/discovery').expect(200)

      expect(response.body.protocol).toBe('rdcp/1.0')
      expect(response.body.categories).toBeDefined()
      expect(Array.isArray(response.body.categories)).toBe(true)
    })

    test('GET /rdcp/v1/health returns health status', async () => {
      const response = await request(app).get('/rdcp/v1/health').expect(200)

      expect(response.body.protocol).toBe('rdcp/1.0')
      expect(response.body.status).toBe('healthy')
    })

    test('POST /rdcp/v1/control returns validation error', async () => {
      const response = await request(app)
        .post('/rdcp/v1/control')
        .send({ action: 'enable', categories: ['DATABASE'] })
        .expect(400)

      expect(response.body.error.code).toBe('RDCP_VALIDATION_ERROR')
      expect(response.body.error.protocol).toBe('rdcp/1.0')
    })

    test('Auth required middleware blocks unauthenticated requests', async () => {
      const authApp = express()
      authApp.use(createRDCPMiddleware({ requireAuth: true }))

      await request(authApp).get('/rdcp/v1/discovery').expect(401)
    })
  })
})
