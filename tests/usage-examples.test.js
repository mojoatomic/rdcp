/**
 * @fileoverview Basic usage examples tests
 * Tests that prove the SDK works as documented in examples
 * Following WARP rule: TEST WHAT EXISTS, DON'T ADD FEATURES
 */

const express = require('express')
const request = require('supertest')
const { basicApiKeyAuth } = require('../src/auth/basic.js')
const { createRDCPMiddleware } = require('../src/server/adapters/express.js')
const { extractTenantContext } = require('../src/utils/tenant.js')

describe('Basic Usage Examples', () => {
  describe('Simple Express Integration Example', () => {
    test('works exactly as documented in README', async () => {
      const app = express()
      app.use(express.json())

      // Create authenticator as shown in documentation
      const authenticator = basicApiKeyAuth({
        apiKey: process.env.RDCP_API_KEY || 'your-32-character-api-key-here12'
      })

      // Create RDCP middleware as shown in documentation
      const rdcpMiddleware = createRDCPMiddleware({
        authenticator,
        debugConfig: {
          categories: ['DATABASE', 'API_ROUTES', 'QUERIES'],
          enabled: true
        },
        performance: {
          enabled: true,
          thresholds: { slow: 100, critical: 500 }
        }
      })

      // Apply RDCP middleware as shown in documentation
      app.use(rdcpMiddleware)

      // Add application route
      app.get('/', (req, res) => {
        res.json({ message: 'Express app with RDCP support' })
      })

      // Test that discovery endpoint works
      const discovery = await request(app)
        .get('/.well-known/rdcp')
        .expect(200)

      expect(discovery.body.protocol).toBe('rdcp/1.0')
      expect(discovery.body.endpoints).toBeDefined()

      // Test that control works with authentication
      const control = await request(app)
        .post('/rdcp/v1/control')
        .set('X-API-Key', 'your-32-character-api-key-here12')
        .send({
          action: 'enable',
          categories: ['DATABASE']
        })
        .expect(200)

      expect(control.body.status).toBe('success')
      expect(control.body.changes[0].category).toBe('DATABASE')

      // Test that status reflects the change
      const status = await request(app)
        .get('/rdcp/v1/status')
        .set('X-API-Key', 'your-32-character-api-key-here12')
        .expect(200)

      expect(status.body.categories.DATABASE.enabled).toBe(true)
    })
  })


  describe('Tenant Context Extraction Example', () => {
    test('extracts tenant context as documented', () => {
      // Example from documentation
      const mockRequest = {
        headers: {
          'x-rdcp-tenant-id': 'org_123',
          'x-rdcp-isolation-level': 'organization',
          'x-rdcp-tenant-name': 'Acme Corp'
        }
      }

      const tenantContext = extractTenantContext(mockRequest)
      
      // Should match documented example exactly
      expect(tenantContext).toEqual({
        tenantId: 'org_123',
        isolationLevel: 'organization',
        tenantName: 'Acme Corp'
      })
    })

    test('handles missing headers with defaults as documented', () => {
      const mockRequest = { headers: {} }
      const tenantContext = extractTenantContext(mockRequest)
      
      // Should use documented defaults
      expect(tenantContext).toEqual({
        tenantId: 'default',
        isolationLevel: 'global',
        tenantName: undefined
      })
    })
  })



  describe('Essential SDK Workflow', () => {
    test('proves SDK works end-to-end as documented', async () => {
      const app = express()
      app.use(express.json())

      const authenticator = basicApiKeyAuth({
        apiKey: 'workflow-test-32-char-api-key123'
      })

      const rdcpMiddleware = createRDCPMiddleware({
        authenticator,
        debugConfig: {
          categories: ['DATABASE', 'API_ROUTES'],
          enabled: true
        }
      })

      app.use(rdcpMiddleware)

      const apiKey = 'workflow-test-32-char-api-key123'

      // Essential workflow: discovery, control, status
      const discovery = await request(app)
        .get('/.well-known/rdcp')
        .expect(200)

      expect(discovery.body.protocol).toBe('rdcp/1.0')

      const control = await request(app)
        .post('/rdcp/v1/control')
        .set('X-API-Key', apiKey)
        .send({ action: 'enable', categories: ['DATABASE'] })
        .expect(200)

      expect(control.body.status).toBe('success')

      const status = await request(app)
        .get('/rdcp/v1/status')
        .set('X-API-Key', apiKey)
        .expect(200)

      expect(status.body.categories.DATABASE.enabled).toBe(true)
    })
  })
})