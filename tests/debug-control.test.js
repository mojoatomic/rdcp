/**
 * @fileoverview Debug category control tests
 * Tests ONLY the implemented debug control functionality
 * Following WARP rule: TEST WHAT EXISTS, DON'T ADD FEATURES
 */

const express = require('express')
const request = require('supertest')
const { createRDCPMiddleware } = require('../src/server/adapters/express.js')
const { getTenantDebugConfig, setTenantDebugConfig } = require('../src/utils/tenant.js')

describe('Debug Category Control', () => {
  let app
  let mockAuthenticator

  beforeEach(() => {
    app = express()
    app.use(express.json())
    mockAuthenticator = jest.fn().mockResolvedValue(true)
    
    const rdcpMiddleware = createRDCPMiddleware({
      authenticator: mockAuthenticator,
      debugConfig: {
        categories: ['DATABASE', 'API_ROUTES', 'QUERIES', 'REPORTS', 'CACHE']
      }
    })
    app.use(rdcpMiddleware)
  })

  describe('Control Endpoint - Enable Categories', () => {
    test('enables single debug category', async () => {
      const response = await request(app)
        .post('/rdcp/v1/control')
        .send({
          action: 'enable',
          categories: ['DATABASE']
        })
        .expect(200)

      expect(response.body).toMatchObject({
        protocol: 'rdcp/1.0',
        status: 'success',
        changes: [{
          category: 'DATABASE',
          action: 'enabled',
          tenantScope: 'default',
          isolationLevel: 'global'
        }]
      })
      expect(response.body.timestamp).toBeDefined()
    })

    test('enables multiple debug categories', async () => {
      const response = await request(app)
        .post('/rdcp/v1/control')
        .send({
          action: 'enable',
          categories: ['DATABASE', 'API_ROUTES', 'CACHE']
        })
        .expect(200)

      expect(response.body.changes).toHaveLength(3)
      expect(response.body.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ category: 'DATABASE', action: 'enabled' }),
          expect.objectContaining({ category: 'API_ROUTES', action: 'enabled' }),
          expect.objectContaining({ category: 'CACHE', action: 'enabled' })
        ])
      )
    })

  })

  describe('Control Endpoint - Disable Categories', () => {
    test('disables single debug category', async () => {
      // First enable a category
      await request(app)
        .post('/rdcp/v1/control')
        .send({
          action: 'enable',
          categories: ['DATABASE']
        })

      // Then disable it
      const response = await request(app)
        .post('/rdcp/v1/control')
        .send({
          action: 'disable',
          categories: ['DATABASE']
        })
        .expect(200)

      expect(response.body.changes).toEqual([{
        category: 'DATABASE',
        action: 'disabled',
        tenantScope: 'default',
        isolationLevel: 'global'
      }])
    })

  })

  describe('Control Endpoint - Validation', () => {
    test('requires action parameter', async () => {
      const response = await request(app)
        .post('/rdcp/v1/control')
        .send({
          categories: ['DATABASE']
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: {
          code: 'RDCP_VALIDATION_ERROR',
          message: 'Missing action parameter',
          protocol: 'rdcp/1.0'
        }
      })
    })

    test('rejects unknown actions', async () => {
      const response = await request(app)
        .post('/rdcp/v1/control')
        .send({
          action: 'unknown_action',
          categories: ['DATABASE']
        })
        .expect(400)

      expect(response.body).toMatchObject({
        error: {
          code: 'RDCP_VALIDATION_ERROR',
          message: 'Unknown action: unknown_action',
          protocol: 'rdcp/1.0'
        }
      })
    })

    test('handles empty categories array', async () => {
      const response = await request(app)
        .post('/rdcp/v1/control')
        .send({
          action: 'enable',
          categories: []
        })
        .expect(200)

      expect(response.body.changes).toEqual([])
    })

    test('requires POST method for control endpoint', async () => {
      const response = await request(app)
        .get('/rdcp/v1/control')
        .expect(405)

      expect(response.body).toMatchObject({
        error: {
          code: 'RDCP_METHOD_NOT_ALLOWED',
          message: 'POST method required',
          protocol: 'rdcp/1.0'
        }
      })
    })
  })

  describe('Status Endpoint', () => {
    test('returns current debug status', async () => {
      const response = await request(app)
        .get('/rdcp/v1/status')
        .expect(200)

      expect(response.body).toMatchObject({
        protocol: 'rdcp/1.0',
        categories: {
          DATABASE: { enabled: false, tenantScope: 'default' },
          API_ROUTES: { enabled: false, tenantScope: 'default' },
          QUERIES: { enabled: false, tenantScope: 'default' },
          REPORTS: { enabled: false, tenantScope: 'default' },
          CACHE: { enabled: false, tenantScope: 'default' },
          AUTH: { enabled: false, tenantScope: 'default' },
          INTEGRATIONS: { enabled: false, tenantScope: 'default' }
        },
        performance: {
          impact: {
            cpu: '0.1%',
            memory: '1MB'
          },
          activeCategories: 0
        }
      })
      expect(response.body.timestamp).toBeDefined()
    })

    test('reflects enabled categories in status', async () => {
      // Enable some categories
      await request(app)
        .post('/rdcp/v1/control')
        .send({
          action: 'enable',
          categories: ['DATABASE', 'API_ROUTES']
        })

      // Check status
      const response = await request(app)
        .get('/rdcp/v1/status')
        .expect(200)

      expect(response.body.categories.DATABASE.enabled).toBe(true)
      expect(response.body.categories.API_ROUTES.enabled).toBe(true)
      expect(response.body.categories.QUERIES.enabled).toBe(false)
      expect(response.body.performance.activeCategories).toBe(2)
    })
  })

  describe('Tenant Isolation', () => {
    test('isolates debug categories per tenant', async () => {
      // Enable category for tenant A
      await request(app)
        .post('/rdcp/v1/control')
        .set('X-RDCP-Tenant-ID', 'tenant-a')
        .set('X-RDCP-Isolation-Level', 'organization')
        .send({
          action: 'enable',
          categories: ['DATABASE']
        })
        .expect(200)

      // Check status for tenant A
      const statusA = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Tenant-ID', 'tenant-a')
        .set('X-RDCP-Isolation-Level', 'organization')
        .expect(200)

      // Check status for tenant B (should be different)
      const statusB = await request(app)
        .get('/rdcp/v1/status')
        .set('X-RDCP-Tenant-ID', 'tenant-b')
        .set('X-RDCP-Isolation-Level', 'organization')
        .expect(200)

      expect(statusA.body.categories.DATABASE.enabled).toBe(true)
      expect(statusB.body.categories.DATABASE.enabled).toBe(false)
      expect(statusA.body.tenant.id).toBe('tenant-a')
      expect(statusB.body.tenant.id).toBe('tenant-b')
    })

    test('includes tenant context in control responses', async () => {
      const response = await request(app)
        .post('/rdcp/v1/control')
        .set('X-RDCP-Tenant-ID', 'test-org')
        .set('X-RDCP-Isolation-Level', 'organization')
        .set('X-RDCP-Tenant-Name', 'Test Organization')
        .send({
          action: 'enable',
          categories: ['DATABASE']
        })
        .expect(200)

      expect(response.body.tenant).toMatchObject({
        id: 'test-org',
        isolationLevel: 'organization',
        scope: 'tenant-isolated',
        name: 'Test Organization'
      })

      expect(response.body.changes[0]).toMatchObject({
        tenantScope: 'test-org',
        isolationLevel: 'organization'
      })
    })
  })

})
